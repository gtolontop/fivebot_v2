import { BaseInteraction, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '../services/config.service';
import { TicketInteractionHandler } from '../handlers/ticketInteraction.handler';

export async function interactionCreate(
  interaction: BaseInteraction,
  prisma: PrismaClient,
  configService: ConfigService,
  ticketHandler?: TicketInteractionHandler
) {
  console.log('[INTERACTION] Received interaction:', interaction.type, 'isCommand:', interaction.isChatInputCommand());
  
  // Handle ticket interactions (buttons, select menus, modals)
  if (!interaction.isChatInputCommand()) {
    if (ticketHandler && (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit())) {
      await ticketHandler.handleInteraction(interaction);
    }
    return;
  }

  // Log command execution
  const user = interaction.user;
  const guild = interaction.guild;
  const command = interaction.commandName;
  
  // Get command options for detailed logging
  const options = interaction.options.data.map(opt => `${opt.name}:${opt.value}`).join(' ');
  const logMessage = options 
    ? `Command /${command} ${options} executed by ${user.username}#${user.discriminator}${guild ? ` in ${guild.name}` : ''}`
    : `Command /${command} executed by ${user.username}#${user.discriminator}${guild ? ` in ${guild.name}` : ''}`;
  
  console.log(logMessage);
  
  // Get V2 config to check all V2 commands
  const config = await configService.getConfig();
  const embedV2Commands = (config as any).embedV2Commands || {};
  
  // Check if it's a V2 command (preset or dynamic)
  const v2PresetCommands = ['rules', 'pricing', 'embed-builder', 'server-info', 'user-profile', 'team', 'announcement'];
  const isV2Command = v2PresetCommands.includes(command) || (embedV2Commands[command] && embedV2Commands[command].useEmbedV2);
  
  if (isV2Command) {
    console.log(`[DEBUG] Detected V2 command: ${command}`);
    console.log(`[DEBUG] V2 Commands config:`, embedV2Commands);
    console.log(`[DEBUG] Is ${command} enabled?`, embedV2Commands[command]?.enabled);
    
    if (embedV2Commands[command]?.enabled) {
      try {
        // For preset commands, load from modules
        if (v2PresetCommands.includes(command)) {
          console.log(`[DEBUG] Loading preset command module: ${command}`);
          const commandModule = await import(`../commands/${command}`);
          if (commandModule.execute) {
            await commandModule.execute(interaction);
            console.log(`[DEBUG] Command /${command} completed successfully`);
            return;
          }
        } else {
          // For dynamic commands, use the embed data
          console.log(`[DEBUG] Executing dynamic embed: ${command}`);
          const embedData = embedV2Commands[command].embedV2Data || [];
          
          if (embedData.length === 0) {
            await interaction.reply({ 
              content: '❌ This embed has no content yet. Please configure it first.', 
              ephemeral: true 
            });
            return;
          }

          // Send the V2 embed
          const COMP_V2_FLAG = 1 << 15;
          await interaction.reply({
            flags: COMP_V2_FLAG,
            components: embedData
          });
          console.log(`[DEBUG] Dynamic embed /${command} sent successfully`);
          return;
        }
      } catch (error) {
        console.error(`[DEBUG] Failed to execute V2 command ${command}:`, error);
        await interaction.reply({ 
          content: '❌ This command encountered an error.', 
          ephemeral: true 
        });
        return;
      }
    } else {
      console.log(`[DEBUG] Command ${command} is not enabled in config`);
      await interaction.reply({ 
        content: '❌ This command is not enabled.', 
        ephemeral: true 
      });
      return;
    }
  }

  // Handle built-in configuration commands
  await handleBuiltInCommands(interaction, configService);
}

async function handleBuiltInCommands(
  interaction: ChatInputCommandInteraction,
  configService: ConfigService
) {
  const { commandName } = interaction;

  // Handle stats command without owner check
  if (commandName === 'stats') {
    await statsCommand.execute(interaction);
    return;
  }
  
  // Handle ticketdebug command without owner check
  if (commandName === 'ticketdebug') {
    const ticketDebugCommand = await import('../commands/ticketDebug');
    await ticketDebugCommand.execute(interaction);
    return;
  }
  
  // V2 commands are now handled in the main interactionCreate function

  // Only allow bot owner to use configuration commands
  const bot = await configService.getBot();
  if (!bot) {
    await interaction.reply({ 
      content: '❌ Configuration du bot non trouvée.',
      ephemeral: true 
    });
    return;
  }

  const owner = await configService.prisma.user.findUnique({
    where: { id: bot.ownerId },
  });

  if (!owner || owner.discordId !== interaction.user.id) {
    await interaction.reply({
      content: '❌ Seul le propriétaire du bot peut utiliser cette commande.',
      ephemeral: true
    });
    return;
  }

  try {
    switch (commandName) {
      case 'help':
        await handleHelp(interaction);
        break;

      case 'ticket':
        // Import dynamically to avoid circular dependency
        const ticketCommand = await import('../commands/ticket');
        await ticketCommand.execute(interaction);
        break;

      case 'ticket-example':
        const ticketExampleCommand = await import('../commands/ticketExample');
        await ticketExampleCommand.execute(interaction);
        break;

      default:
        // Handle custom commands if any
        await handleCustomCommand(interaction, configService);
    }

    // Log successful command completion
    console.log(`Command /${commandName} completed successfully`);
  } catch (error) {
    console.error(`Command /${commandName} failed:`, error instanceof Error ? error.message : error);

    const replyMethod = interaction.replied || interaction.deferred ? 'editReply' : 'reply';
    await interaction[replyMethod]({
      content: '❌ Une erreur s\'est produite lors de l\'exécution de cette commande.',
      ephemeral: true
    });
  }
}


async function handleCustomCommand(
  interaction: ChatInputCommandInteraction,
  configService: ConfigService
) {
  const config = await configService.getConfig();
  const { commandName } = interaction;
  
  // Check V2 Embed commands first
  const embedV2Commands = (config as any).embedV2Commands || {};
  if (embedV2Commands[commandName] && embedV2Commands[commandName].enabled) {
    try {
      // Dynamically import and execute the V2 command
      const commandModule = await import(`../commands/${commandName}`);
      if (commandModule.execute) {
        await commandModule.execute(interaction);
        return;
      }
    } catch (error) {
      console.error(`Failed to execute V2 command ${commandName}:`, error);
      await interaction.reply({ 
        content: '❌ This V2 command is enabled but not properly configured.', 
        ephemeral: true 
      });
      return;
    }
  }
  
  // Check regular custom commands
  if (!config.customCommands) {
    await interaction.reply({
      content: '❌ Command not recognized.',
      ephemeral: true
    });
    return;
  }

  const customCommand = (config.customCommands as any)?.[commandName];
  
  if (!customCommand) {
    await interaction.reply({
      content: '❌ Command not recognized.',
      ephemeral: true
    });
    return;
  }

  try {
    if (customCommand.type === 'simple' && customCommand.response) {
      // Simple text response
      await interaction.reply({
        content: customCommand.response,
        ephemeral: false
      });
    } else if (customCommand.type === 'embed' && customCommand.embed) {
      // Embed response
      const embed = new EmbedBuilder();
      
      if (customCommand.embed.title) {
        embed.setTitle(customCommand.embed.title);
      }
      
      if (customCommand.embed.description) {
        embed.setDescription(customCommand.embed.description);
      }
      
      if (customCommand.embed.color) {
        // Handle both hex string and number formats
        let color = customCommand.embed.color;
        if (typeof color === 'string' && color.startsWith('#')) {
          color = parseInt(color.replace('#', ''), 16);
        }
        embed.setColor(color);
      }
      
      if (customCommand.embed.thumbnail) {
        embed.setThumbnail(customCommand.embed.thumbnail);
      }
      
      if (customCommand.embed.footer && customCommand.embed.footer.text) {
        embed.setFooter({ text: customCommand.embed.footer.text });
      }
      
      await interaction.reply({
        embeds: [embed],
        ephemeral: false
      });
    } else {
      await interaction.reply({
        content: '❌ Invalid command configuration.',
        ephemeral: true
      });
    }
  } catch (error) {
    console.error(`Error executing custom command ${commandName}:`, error);
    await interaction.reply({
      content: '❌ Error executing custom command.',
      ephemeral: true
    });
  }
}

async function handleHelp(interaction: ChatInputCommandInteraction) {
  const panelUrl = process.env.PANEL_URL || 'https://panel.fivebot.com';

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🤖 Aide - FiveBot v2')
    .setDescription('Pour configurer ce bot, veuillez utiliser le panel de gestion.')
    .addFields(
      {
        name: '🌐 Panel de Configuration',
        value: `[Accéder au Panel](${panelUrl})\n\nToutes les configurations doivent être effectuées via le panel web.`,
        inline: false
      },
      {
        name: '📋 Fonctionnalités disponibles',
        value: '• Configuration des messages de bienvenue\n• Gestion des embeds personnalisés\n• Système de tickets\n• Commandes personnalisées\n• Et bien plus...',
        inline: false
      },
      {
        name: '💡 Astuce',
        value: 'Connectez-vous au panel avec votre compte Discord pour gérer vos bots.',
        inline: false
      }
    )
    .setFooter({
      text: 'FiveBot v2 - Bot Discord géré',
      iconURL: interaction.client.user?.displayAvatarURL()
    })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}