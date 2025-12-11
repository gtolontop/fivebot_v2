import { BaseInteraction, ChatInputCommandInteraction, ButtonInteraction, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

// Redis client for job queue
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
});

// Helper function to add a job to the queue
async function addJobToQueue(jobType: string, data: { botId: string }): Promise<string> {
  const jobId = `${jobType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const job = {
    id: jobId,
    type: jobType,
    data,
    priority: getJobPriority(jobType),
    createdAt: new Date().toISOString(),
    status: 'waiting',
  };

  await redis.rpush('fivebot:jobs', JSON.stringify(job));
  await redis.publish('fivebot:jobs:notify', jobId);

  return jobId;
}

// Get job priority based on type
function getJobPriority(jobType: string): number {
  const priorities: Record<string, number> = {
    'start-bot': 8,
    'stop-bot': 9,
    'restart-bot': 9,
  };
  return priorities[jobType] || 5;
}

export async function interactionCreate(interaction: BaseInteraction, prisma: PrismaClient) {
  if (interaction.isChatInputCommand()) {
    await handleSlashCommand(interaction, prisma);
  } else if (interaction.isButton()) {
    await handleButtonInteraction(interaction, prisma);
  }
}

async function handleSlashCommand(interaction: ChatInputCommandInteraction, prisma: PrismaClient) {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.warn(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction, prisma);
    
    // Log command usage
    const user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (user) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: `COMMAND_${interaction.commandName.toUpperCase()}`,
          resource: 'command',
          metadata: JSON.stringify({
            commandName: interaction.commandName,
            options: interaction.options.data.map(opt => ({
              name: opt.name,
              type: opt.type,
              value: opt.value
            })),
            guildId: interaction.guildId,
            channelId: interaction.channelId,
          }),
        },
      });
    }
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ Erreur de commande')
      .setDescription('Une erreur interne s\'est produite lors de l\'exécution de cette commande.')
      .setFooter({
        text: 'Si le problème persiste, contactez un administrateur',
        iconURL: interaction.client.user?.displayAvatarURL()
      })
      .setTimestamp();

    const replyMethod = interaction.replied || interaction.deferred ? 'editReply' : 'reply';
    await interaction[replyMethod]({ 
      embeds: [errorEmbed],
      ephemeral: true 
    });
  }
}

async function handleButtonInteraction(interaction: ButtonInteraction, prisma: PrismaClient) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const [action, subaction, botId] = interaction.customId.split('_');

    if (action !== 'bot') {
      await interaction.editReply({ content: '❌ Action non reconnue.' });
      return;
    }

    // Verify user owns the bot
    const user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (!user) {
      await interaction.editReply({ content: '❌ Utilisateur non trouvé.' });
      return;
    }

    const bot = await prisma.bot.findFirst({
      where: {
        id: botId,
        ownerId: user.id,
        isActive: true,
      },
    });

    if (!bot) {
      await interaction.editReply({ content: '❌ Bot non trouvé ou vous n\'êtes pas le propriétaire.' });
      return;
    }

    switch (subaction) {
      case 'start':
        if (bot.status === 'ONLINE') {
          await interaction.editReply({ content: '⚠️ Ce bot est déjà en ligne.' });
          return;
        }

        await prisma.bot.update({
          where: { id: botId },
          data: { status: 'STARTING' },
        });

        // Add job to queue for worker to process
        const startJobId = await addJobToQueue('start-bot', { botId });
        console.log(`[Bot Manager] Queued start-bot job ${startJobId} for bot ${bot.name}`);

        await interaction.editReply({
          content: `🟡 Démarrage du bot **${bot.name}** en cours...`
        });
        break;

      case 'stop':
        if (bot.status === 'OFFLINE') {
          await interaction.editReply({ content: '⚠️ Ce bot est déjà arrêté.' });
          return;
        }

        await prisma.bot.update({
          where: { id: botId },
          data: { status: 'STOPPING' },
        });

        // Add job to queue for worker to process
        const stopJobId = await addJobToQueue('stop-bot', { botId });
        console.log(`[Bot Manager] Queued stop-bot job ${stopJobId} for bot ${bot.name}`);

        await interaction.editReply({
          content: `🟡 Arrêt du bot **${bot.name}** en cours...`
        });
        break;

      case 'restart':
        await prisma.bot.update({
          where: { id: botId },
          data: { status: 'STOPPING' },
        });

        // Add job to queue for worker to process
        const restartJobId = await addJobToQueue('restart-bot', { botId });
        console.log(`[Bot Manager] Queued restart-bot job ${restartJobId} for bot ${bot.name}`);

        await interaction.editReply({
          content: `🔄 Redémarrage du bot **${bot.name}** en cours...`
        });
        break;

      default:
        await interaction.editReply({ content: '❌ Action non reconnue.' });
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        botId: bot.id,
        action: `BOT_${subaction.toUpperCase()}_BUTTON`,
        resource: 'bot',
        metadata: JSON.stringify({
          interactionId: interaction.id,
          guildId: interaction.guildId,
          channelId: interaction.channelId,
        }),
      },
    });

  } catch (error) {
    console.error('Error handling button interaction:', error);
    
    const replyMethod = interaction.replied || interaction.deferred ? 'editReply' : 'reply';
    await interaction[replyMethod]({ 
      content: '❌ Une erreur s\'est produite lors du traitement de cette action.',
      ephemeral: true 
    });
  }
}