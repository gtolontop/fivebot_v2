import { BaseInteraction, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '../services/config.service';
import { TicketInteractionHandler } from '../handlers/ticketInteraction.handler';
import * as statsCommand from '../commands/stats';

export async function interactionCreate(
  interaction: BaseInteraction,
  prisma: PrismaClient,
  configService: ConfigService,
  ticketHandler?: TicketInteractionHandler
) {
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
      case 'set-welcome':
        await handleSetWelcome(interaction, configService);
        break;
      
      case 'bot-status':
        await handleBotStatus(interaction, configService);
        break;
      
      case 'reload-config':
        await handleReloadConfig(interaction, configService);
        break;
      
      case 'help':
        await handleHelp(interaction);
        break;
      
      case 'ticket':
        // Import dynamically to avoid circular dependency
        const ticketCommand = await import('../commands/ticket');
        await ticketCommand.execute(interaction);
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

async function handleSetWelcome(
  interaction: ChatInputCommandInteraction,
  configService: ConfigService
) {
  await interaction.deferReply({ ephemeral: true });

  const enabled = interaction.options.getBoolean('enabled') ?? true;
  const channel = interaction.options.getChannel('channel');
  const title = interaction.options.getString('title');
  const description = interaction.options.getString('description');
  const color = interaction.options.getString('color') || '#5865F2';

  // Build embed JSON
  const embedJson = {
    title: title || 'Bienvenue!',
    description: description || 'Bienvenue sur notre serveur {user}!',
    color: parseInt(color.replace('#', ''), 16),
    thumbnail: {
      url: '{logo}' // Will be replaced with actual logo URL
    },
    footer: {
      text: 'Powered by FiveBot v2'
    },
    timestamp: true
  };

  // Update configuration
  await configService.updateConfig({
    welcomeEnabled: enabled,
    welcomeChannelId: channel?.id,
    welcomeEmbedJson: embedJson,
  });

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Configuration mise à jour')
    .setDescription('Les paramètres de bienvenue ont été mis à jour avec succès.')
    .addFields(
      { name: 'Activé', value: enabled ? '✅ Oui' : '❌ Non', inline: true },
      { name: 'Canal', value: channel ? `<#${channel.id}>` : 'Non défini', inline: true },
      { name: 'Titre', value: title || 'Défaut', inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleBotStatus(
  interaction: ChatInputCommandInteraction,
  configService: ConfigService
) {
  await interaction.deferReply({ ephemeral: true });

  const bot = await configService.getBot();
  const config = await configService.getConfig();

  if (!bot) {
    await interaction.editReply({ content: '❌ Configuration du bot non trouvée.' });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🤖 Statut de ${bot.name}`)
    .setDescription('Informations sur le bot et sa configuration')
    .addFields(
      { name: '📋 Informations générales', value: `**Nom:** ${bot.name}\n**ID:** \`${bot.id}\`\n**Préfixe:** ${bot.prefix}\n**Statut:** ${bot.status}`, inline: false },
      { name: '👋 Bienvenue', value: `**Activé:** ${config.welcomeEnabled ? '✅' : '❌'}\n**Canal:** ${config.welcomeChannelId ? `<#${config.welcomeChannelId}>` : 'Non défini'}`, inline: true },
      { name: '🛡️ Modération', value: `**Activé:** ${config.moderationEnabled ? '✅' : '❌'}`, inline: true },
      { name: '🎭 Auto-rôle', value: `**Activé:** ${config.autoRoleEnabled ? '✅' : '❌'}\n**Rôle:** ${config.autoRoleId ? `<@&${config.autoRoleId}>` : 'Non défini'}`, inline: true }
    )
    .setFooter({
      text: `Dernière mise à jour: ${new Date(bot.updatedAt).toLocaleString()}`,
      iconURL: interaction.client.user?.displayAvatarURL()
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleReloadConfig(
  interaction: ChatInputCommandInteraction,
  configService: ConfigService
) {
  await interaction.deferReply({ ephemeral: true });

  try {
    await configService.reloadConfig();
    
    await interaction.editReply({
      content: '🔄 Configuration rechargée avec succès!'
    });
  } catch (error) {
    await interaction.editReply({
      content: '❌ Erreur lors du rechargement de la configuration.'
    });
  }
}

async function handleCustomCommand(
  interaction: ChatInputCommandInteraction,
  configService: ConfigService
) {
  const config = await configService.getConfig();
  const { commandName } = interaction;
  
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
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🤖 Aide - FiveBot v2')
    .setDescription('Voici la liste des commandes disponibles :')
    .addFields(
      {
        name: '⚙️ Configuration',
        value: '`/set-welcome` - Configure le message de bienvenue\n`/bot-status` - Affiche le statut du bot\n`/reload-config` - Recharge la configuration',
        inline: false
      },
      {
        name: '📊 Statistiques',
        value: '`/stats` - Affiche les statistiques du bot',
        inline: false
      },
      {
        name: '❓ Aide',
        value: '`/help` - Affiche cette aide',
        inline: false
      },
      {
        name: '📋 Informations',
        value: 'Seul le propriétaire du bot peut utiliser les commandes de configuration.',
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