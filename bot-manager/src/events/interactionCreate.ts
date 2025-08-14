import { BaseInteraction, ChatInputCommandInteraction, ButtonInteraction, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';

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
          metadata: {
            commandName: interaction.commandName,
            options: interaction.options.data,
            guildId: interaction.guildId,
            channelId: interaction.channelId,
          },
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

        // TODO: Add to queue
        
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

        // TODO: Add to queue
        
        await interaction.editReply({ 
          content: `🟡 Arrêt du bot **${bot.name}** en cours...` 
        });
        break;

      case 'restart':
        await prisma.bot.update({
          where: { id: botId },
          data: { status: 'STOPPING' },
        });

        // TODO: Add to queue
        
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
        metadata: {
          interactionId: interaction.id,
          guildId: interaction.guildId,
          channelId: interaction.channelId,
        },
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