import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType
} from 'discord.js';
import { TicketValidationService } from '../services/ticketValidation.service';
import { getErrorMessage, formatError, formatWarning } from '../utils/ticketErrorMessages';

export const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Manage the ticket system')
  .addSubcommand(subcommand =>
    subcommand
      .setName('setup')
      .setDescription('Set up the ticket system')
      .addRoleOption(option =>
        option
          .setName('staff-role')
          .setDescription('Staff role that can manage tickets')
          .setRequired(true)
      )
      .addChannelOption(option =>
        option
          .setName('category')
          .setDescription('Category for ticket channels')
          .setRequired(false)
          .addChannelTypes(ChannelType.GuildCategory)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('validate')
      .setDescription('Validate the ticket system configuration')
      .addStringOption(option =>
        option
          .setName('locale')
          .setDescription('Language for validation messages')
          .addChoices(
            { name: 'English', value: 'en' },
            { name: 'Français', value: 'fr' }
          )
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('panel')
      .setDescription('Create a ticket panel')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Channel to send the panel to (defaults to current channel)')
          .setRequired(false)
          .addChannelTypes(ChannelType.GuildText)
      )
      .addStringOption(option =>
        option
          .setName('type')
          .setDescription('Panel type')
          .setRequired(false)
          .addChoices(
            { name: 'Buttons', value: 'BUTTON' },
            { name: 'Dropdown', value: 'DROPDOWN' },
            { name: 'Hybrid', value: 'HYBRID' }
          )
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('close')
      .setDescription('Close the current ticket')
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason for closing')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('add')
      .setDescription('Add a user to the current ticket')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User to add')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('Remove a user from the current ticket')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User to remove')
          .setRequired(true)
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  // Get ticket handler from client (we'll need to store it there)
  const ticketHandler = (interaction.client as any).ticketHandler;
  if (!ticketHandler) {
    await interaction.reply({
      content: '❌ Ticket system is not initialized.',
      ephemeral: true
    });
    return;
  }

  const services = ticketHandler.getServices();
  const { ticketService, panelService, containerService } = services;

  switch (subcommand) {
    case 'setup':
      await handleSetup(interaction, ticketService);
      break;
    
    case 'validate':
      await handleValidate(interaction, ticketService);
      break;
    
    case 'panel':
      await handlePanel(interaction, ticketService, panelService);
      break;
    
    case 'close':
      await handleClose(interaction, ticketService);
      break;
    
    case 'add':
      await handleAdd(interaction, ticketService, containerService);
      break;
    
    case 'remove':
      await handleRemove(interaction, ticketService, containerService);
      break;
  }
}

async function handleSetup(
  interaction: ChatInputCommandInteraction,
  ticketService: any
) {
  await interaction.deferReply({ ephemeral: true });

  const category = interaction.options.getChannel('category');
  const staffRole = interaction.options.getRole('staff-role');

  if (!interaction.guildId) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.'
    });
    return;
  }

  try {
    // Check if config already exists
    let config = await ticketService.getConfig(interaction.guildId);
    
    if (!config) {
      // Create new config
      config = await ticketService.createConfig(interaction.guildId, {
        staffRoles: [staffRole!.id],
        supportCategoryId: category?.id
      });
    } else {
      // Update existing config
      config = await ticketService.updateConfig(interaction.guildId, {
        staffRoles: [staffRole!.id],
        supportCategoryId: category?.id
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Ticket System Setup')
      .setDescription('The ticket system has been configured successfully.')
      .addFields(
        {
          name: 'Staff Role',
          value: `<@&${staffRole!.id}>`,
          inline: true
        },
        {
          name: 'Support Category',
          value: category ? `<#${category.id}>` : 'Using threads',
          inline: true
        }
      )
      .setFooter({
        text: 'Use /ticket panel to create a ticket panel'
      });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('[Ticket Setup] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to set up ticket system. Please try again.'
    });
  }
}

async function handleValidate(
  interaction: ChatInputCommandInteraction,
  ticketService: any
) {
  await interaction.deferReply({ ephemeral: true });

  const validationService = new TicketValidationService(interaction.client, ticketService);
  const locale = interaction.options.getString('locale') as 'en' | 'fr' || 'en';

  try {
    const config = await ticketService.getConfig(interaction.guildId!);
    const validation = await validationService.validateConfiguration(config, interaction.guildId!);

    const message = validationService.formatValidationMessage(validation, locale);
    
    const embed = new EmbedBuilder()
      .setColor(validation.isValid ? (validation.warnings.length > 0 ? 0xFFFF00 : 0x00FF00) : 0xFF0000)
      .setTitle(
        validation.isValid 
          ? (validation.warnings.length > 0 
            ? (locale === 'en' ? '⚠️ Configuration Valid with Warnings' : '⚠️ Configuration Valide avec Avertissements')
            : (locale === 'en' ? '✅ Configuration Valid' : '✅ Configuration Valide'))
          : (locale === 'en' ? '❌ Configuration Invalid' : '❌ Configuration Invalide')
      )
      .setDescription(message)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Ticket Validate] Error:', error);
    await interaction.editReply({
      content: formatError(getErrorMessage('UNKNOWN_ERROR', locale))
    });
  }
}

async function handlePanel(
  interaction: ChatInputCommandInteraction,
  ticketService: any,
  panelService: any
) {
  await interaction.deferReply({ ephemeral: true });

  const channelOption = interaction.options.getChannel('channel');
  const type = interaction.options.getString('type') || 'BUTTON';

  if (!interaction.guildId || !interaction.guild) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.'
    });
    return;
  }

  // Use the specified channel, or fall back to current channel
  const targetChannel = channelOption || interaction.channel;

  if (!targetChannel || !targetChannel.isTextBased()) {
    await interaction.editReply({
      content: '❌ Invalid channel. Please use a text channel.'
    });
    return;
  }

  try {
    const config = await ticketService.getConfig(interaction.guildId);
    if (!config) {
      await interaction.editReply({
        content: '❌ Please set up the ticket system first using `/ticket setup`.'
      });
      return;
    }

    // Validate configuration before creating panel
    const validationService = new TicketValidationService(interaction.client, ticketService);
    const validation = await validationService.validateConfiguration(config, interaction.guildId);

    if (!validation.isValid) {
      const message = validationService.formatValidationMessage(validation);
      await interaction.editReply({
        content: message
      });
      return;
    }

    // Default embed data
    const embedData = {
      title: '🎫 Support Tickets',
      description: 'Need help? Create a ticket by clicking the button below.\n\nOur support team will assist you as soon as possible.',
      color: 0x5865F2,
      footer: {
        text: 'Ticket System'
      }
    };

    // Create panel
    const message = await panelService.createPanel(
      interaction.guild,
      targetChannel.id,
      type,
      embedData,
      config.categories || []
    );

    if (message) {
      await interaction.editReply({
        content: `✅ Ticket panel created in ${channelOption ? `<#${targetChannel.id}>` : 'this channel'}!`
      });
    } else {
      await interaction.editReply({
        content: '❌ Failed to create ticket panel.'
      });
    }

  } catch (error) {
    console.error('[Ticket Panel] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to create ticket panel. Please try again.'
    });
  }
}

async function handleClose(
  interaction: ChatInputCommandInteraction,
  ticketService: any
) {
  const reason = interaction.options.getString('reason') || 'Closed via command';

  // Get ticket from channel
  const ticket = await ticketService.getTicketByChannel(interaction.channelId);
  if (!ticket) {
    await interaction.reply({
      content: '❌ This command can only be used in a ticket channel.',
      ephemeral: true
    });
    return;
  }

  // Check permissions
  const isStaff = await ticketService.isStaff(ticket.guildId, interaction.user.id);
  const isCreator = ticket.creatorId === interaction.user.id;

  if (!isStaff && !isCreator) {
    await interaction.reply({
      content: '❌ You do not have permission to close this ticket.',
      ephemeral: true
    });
    return;
  }

  await interaction.deferReply();

  try {
    await ticketService.closeTicket(ticket.id, interaction.user.id, reason);

    await interaction.editReply({
      embeds: [{
        color: 0xE74C3C,
        title: '🔒 Ticket Closed',
        description: `This ticket has been closed by ${interaction.user}.`,
        fields: [
          {
            name: 'Reason',
            value: reason
          }
        ],
        timestamp: new Date().toISOString()
      }]
    });

    // Lock the channel after a delay
    setTimeout(async () => {
      try {
        const channel = interaction.channel;
        if (channel && channel.isThread()) {
          await channel.setLocked(true);
          await channel.setArchived(true);
        }
      } catch (error) {
        console.error('[Ticket Close] Error locking channel:', error);
      }
    }, 5000);

  } catch (error) {
    console.error('[Ticket Close] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to close ticket. Please try again.'
    });
  }
}

async function handleAdd(
  interaction: ChatInputCommandInteraction,
  ticketService: any,
  containerService: any
) {
  const user = interaction.options.getUser('user');
  
  if (!user) {
    await interaction.reply({
      content: '❌ Please specify a valid user.',
      ephemeral: true
    });
    return;
  }

  // Get ticket from channel
  const ticket = await ticketService.getTicketByChannel(interaction.channelId);
  if (!ticket) {
    await interaction.reply({
      content: '❌ This command can only be used in a ticket channel.',
      ephemeral: true
    });
    return;
  }

  // Check permissions
  const isStaff = await ticketService.isStaff(ticket.guildId, interaction.user.id);
  if (!isStaff && ticket.creatorId !== interaction.user.id) {
    await interaction.reply({
      content: '❌ You do not have permission to add users to this ticket.',
      ephemeral: true
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // Add user to ticket
    await ticketService.addParticipant(ticket.id, user.id, 'MEMBER');

    // Update container permissions
    const container = await containerService.getContainer(interaction.guild!, ticket);
    if (container) {
      await containerService.updateContainerPermissions(container, {
        addUsers: [user.id]
      });
    }

    await interaction.editReply({
      content: `✅ Added ${user} to the ticket.`
    });

    // Send notification in channel
    await interaction.followUp({
      content: `${user} has been added to this ticket by ${interaction.user}.`,
      ephemeral: false
    });

  } catch (error) {
    console.error('[Ticket Add] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to add user to ticket.'
    });
  }
}

async function handleRemove(
  interaction: ChatInputCommandInteraction,
  ticketService: any,
  containerService: any
) {
  const user = interaction.options.getUser('user');
  
  if (!user) {
    await interaction.reply({
      content: '❌ Please specify a valid user.',
      ephemeral: true
    });
    return;
  }

  // Get ticket from channel
  const ticket = await ticketService.getTicketByChannel(interaction.channelId);
  if (!ticket) {
    await interaction.reply({
      content: '❌ This command can only be used in a ticket channel.',
      ephemeral: true
    });
    return;
  }

  // Check permissions
  const isStaff = await ticketService.isStaff(ticket.guildId, interaction.user.id);
  if (!isStaff) {
    await interaction.reply({
      content: '❌ Only staff members can remove users from tickets.',
      ephemeral: true
    });
    return;
  }

  // Prevent removing the ticket creator
  if (user.id === ticket.creatorId) {
    await interaction.reply({
      content: '❌ Cannot remove the ticket creator.',
      ephemeral: true
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // Remove user from ticket
    await ticketService.removeParticipant(ticket.id, user.id);

    // Update container permissions
    const container = await containerService.getContainer(interaction.guild!, ticket);
    if (container) {
      await containerService.updateContainerPermissions(container, {
        removeUsers: [user.id]
      });
    }

    await interaction.editReply({
      content: `✅ Removed ${user} from the ticket.`
    });

    // Send notification in channel
    await interaction.followUp({
      content: `${user} has been removed from this ticket by ${interaction.user}.`,
      ephemeral: false
    });

  } catch (error) {
    console.error('[Ticket Remove] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to remove user from ticket.'
    });
  }
}