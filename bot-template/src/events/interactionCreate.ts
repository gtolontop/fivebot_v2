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
              flags: 64  // MessageFlags.Ephemeral
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
          flags: 64  // MessageFlags.Ephemeral
        });
        return;
      }
    } else {
      console.log(`[DEBUG] Command ${command} is not enabled in config`);
      await interaction.reply({
        content: '❌ This command is not enabled.',
        flags: 64  // MessageFlags.Ephemeral
      });
      return;
    }
  }

  // Handle ticket moderation commands
  const ticketModerationCommands = ['close', 'add', 'remove', 'claim', 'unclaim', 'lock', 'unlock', 'rename', 'transfer', 'priority'];
  if (ticketModerationCommands.includes(command) && ticketHandler) {
    try {
      const ticketCommandsModule = await import('../commands/ticket-commands');
      const ticketService = ticketHandler.getServices().ticketService;
      const stateManager = ticketHandler.getServices().stateManager;

      const ticketCommands = ticketCommandsModule.ticketCommands as Record<string, any>;
      if (ticketCommands[command]) {
        await ticketCommands[command].execute(interaction, ticketService, stateManager);
        return;
      }
    } catch (error) {
      console.error(`Error executing ticket command ${command}:`, error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ An error occurred executing this command.', flags: 64 });  // MessageFlags.Ephemeral
      }
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

  // Handle help command without owner check
  if (commandName === 'help') {
    await handleHelp(interaction);
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
      flags: 64  // MessageFlags.Ephemeral
    });
    return;
  }

  const owner = await configService.prisma.user.findUnique({
    where: { id: bot.ownerId },
  });

  if (!owner || owner.discordId !== interaction.user.id) {
    await interaction.reply({
      content: '❌ Seul le propriétaire du bot peut utiliser cette commande.',
      flags: 64  // MessageFlags.Ephemeral
    });
    return;
  }

  try {
    switch (commandName) {
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

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({
        content: '❌ Une erreur s\'est produite lors de l\'exécution de cette commande.'
      });
    } else {
      await interaction.reply({
        content: '❌ Une erreur s\'est produite lors de l\'exécution de cette commande.',
        flags: 64  // MessageFlags.Ephemeral
      });
    }
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
        flags: 64  // MessageFlags.Ephemeral
      });
      return;
    }
  }
  
  // Check regular custom commands
  if (!config.customCommands) {
    await interaction.reply({
      content: '❌ Command not recognized.',
      flags: 64  // MessageFlags.Ephemeral
    });
    return;
  }

  const customCommand = (config.customCommands as any)?.[commandName];

  if (!customCommand) {
    await interaction.reply({
      content: '❌ Command not recognized.',
      flags: 64  // MessageFlags.Ephemeral
    });
    return;
  }

  try {
    if (customCommand.type === 'simple' && customCommand.response) {
      // Simple text response
      await interaction.reply({
        content: customCommand.response
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
        embeds: [embed]
      });
    } else {
      await interaction.reply({
        content: '❌ Invalid command configuration.',
        flags: 64  // MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error(`Error executing custom command ${commandName}:`, error);
    await interaction.reply({
      content: '❌ Error executing custom command.',
      flags: 64  // MessageFlags.Ephemeral
    });
  }
}

async function handleHelp(interaction: ChatInputCommandInteraction) {
  try {
    // Fetch commands to ensure we have the latest list
    const commands = await interaction.client.application?.commands.fetch();

    // Build command list
    let commandList = '';
    if (commands && commands.size > 0) {
      commands.forEach(cmd => {
        commandList += `\`/${cmd.name}\` - ${cmd.description || 'No description'}\n`;
      });
    } else {
      commandList = '*No commands available at the moment.*';
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 Bot Commands')
      .setDescription('Here are all the available commands:')
      .addFields(
        {
          name: 'Available Commands',
          value: commandList || '*No commands available*',
          inline: false
        }
      )
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in handleHelp:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while fetching commands.',
        flags: 64  // MessageFlags.Ephemeral
      });
    }
  }
}