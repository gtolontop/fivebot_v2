import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  EmbedBuilder,
  ThreadAutoArchiveDuration,
  ChannelType,
  PermissionsBitField
} from 'discord.js';
import { TicketService, TicketConfigWithArrays } from '../services/ticket.service';
import { TicketStateManager } from '../services/ticketStateManager.service';
import { ContainerType, TicketPriority } from '@prisma/client';

export class TicketCreationHandler {
  private ticketService: TicketService;
  private stateManager: TicketStateManager;

  constructor(ticketService: TicketService, stateManager: TicketStateManager) {
    this.ticketService = ticketService;
    this.stateManager = stateManager;
  }

  // Handle button interaction for ticket creation
  async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.customId.startsWith('ticket:create:')) return;

    const categoryId = interaction.customId.split(':')[2];
    await this.showTicketModal(interaction, categoryId);
  }

  // Handle dropdown selection for ticket creation
  async handleSelectMenuInteraction(interaction: StringSelectMenuInteraction): Promise<void> {
    if (interaction.customId !== 'ticket:category:select') return;

    const value = interaction.values[0];
    if (!value.startsWith('ticket:create:')) return;

    const categoryId = value.split(':')[2];
    await this.showTicketModal(interaction, categoryId);
  }

  // Show ticket creation modal
  private async showTicketModal(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
    categoryId: string
  ): Promise<void> {
    // Check if user can create ticket
    const canCreate = await this.stateManager.canCreateTicket(
      interaction.guildId!,
      interaction.user.id
    );

    if (!canCreate.allowed) {
      await interaction.reply({
        content: `❌ ${canCreate.reason}`,
        ephemeral: true
      });
      return;
    }

    // Get category info if provided
    let categoryName = 'General Support';
    let category: any = null;
    
    if (categoryId !== 'general') {
      const config = await this.ticketService.getConfig(interaction.guildId!);
      category = config?.categories?.find(c => c.id === categoryId) as any;
      if (category) {
        categoryName = category.name;
      }
    }

    // Check if category has custom modal
    if (category?.useCustomModal && category.modalFields && category.modalFields.length > 0) {
      // Create custom modal
      const modal = new ModalBuilder()
        .setCustomId(`ticket:modal:${categoryId}`)
        .setTitle(category.modalTitle || `Create ${categoryName} Ticket`);

      const rows: ActionRowBuilder<TextInputBuilder>[] = [];
      
      // Add custom fields (max 5 fields per modal)
      for (let i = 0; i < Math.min(category.modalFields.length, 5); i++) {
        const field = category.modalFields[i];
        const textInput = new TextInputBuilder()
          .setCustomId(`field_${field.id}`)
          .setLabel(field.label)
          .setPlaceholder(field.placeholder || '')
          .setStyle(field.type === 'TEXTAREA' ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setRequired(field.required || false);

        if (field.minLength) textInput.setMinLength(field.minLength);
        if (field.maxLength) textInput.setMaxLength(field.maxLength);

        rows.push(new ActionRowBuilder<TextInputBuilder>().addComponents(textInput));
      }

      modal.addComponents(...rows);
      await interaction.showModal(modal);
    } else {
      // Use default modal
      const modal = new ModalBuilder()
        .setCustomId(`ticket:modal:${categoryId}`)
        .setTitle(`Create ${categoryName} Ticket`);

      // Subject input
      const subjectInput = new TextInputBuilder()
        .setCustomId('ticket_subject')
        .setLabel('Subject')
        .setPlaceholder('Brief description of your issue')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

      // Description input
      const descriptionInput = new TextInputBuilder()
        .setCustomId('ticket_description')
        .setLabel('Description')
        .setPlaceholder('Please describe your issue in detail...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(20)
        .setMaxLength(1000);

      // Priority input (optional)
      const priorityInput = new TextInputBuilder()
        .setCustomId('ticket_priority')
        .setLabel('Priority (Low/Normal/High/Urgent)')
        .setPlaceholder('Normal')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setValue('Normal');

      // Add inputs to modal
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(subjectInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(priorityInput)
      );

      await interaction.showModal(modal);
    }
  }

  // Handle modal submission
  async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    if (!interaction.customId.startsWith('ticket:modal:')) return;

    await interaction.deferReply({ ephemeral: true });

    const categoryId = interaction.customId.split(':')[2];
    
    // Get configuration and category
    const config = await this.ticketService.getConfig(interaction.guildId!);
    const category = config?.categories?.find(c => c.id === categoryId) as any;
    
    let subject: string;
    let description: string;
    let priorityText = 'Normal';
    let customFieldsData: Record<string, string> = {};
    
    // Check if using custom modal
    if (category?.useCustomModal && category.modalFields && category.modalFields.length > 0) {
      // Get data from custom fields
      const fields = category.modalFields;
      const fieldValues: string[] = [];
      
      for (const field of fields) {
        try {
          const value = interaction.fields.getTextInputValue(`field_${field.id}`);
          customFieldsData[field.label] = value;
          fieldValues.push(`**${field.label}:** ${value}`);
        } catch (e) {
          // Field not present in modal
        }
      }
      
      // Use first field as subject, rest as description
      subject = fieldValues[0] ? fieldValues[0].replace(/\*\*/g, '') : 'New Ticket';
      description = fieldValues.join('\n') || 'No description provided';
    } else {
      // Get data from default modal
      subject = interaction.fields.getTextInputValue('ticket_subject');
      description = interaction.fields.getTextInputValue('ticket_description');
      priorityText = interaction.fields.getTextInputValue('ticket_priority') || 'Normal';
    }

    // Parse priority
    const priority = this.parsePriority(priorityText);

    try {
      if (!config) {
        throw new Error('Ticket system not configured');
      }

      // Create ticket container (thread or channel)
      const container = await this.createTicketContainer(
        interaction,
        config,
        subject,
        categoryId
      );

      if (!container) {
        throw new Error('Failed to create ticket container');
      }

      // Create ticket in database
      const ticket = await this.ticketService.createTicket({
        guildId: interaction.guildId!,
        creatorId: interaction.user.id,
        type: categoryId === 'general' ? 'support' : 'categorized',
        category: categoryId !== 'general' ? categoryId : undefined,
        priority,
        containerType: config.containerType,
        channelId: container.parentId || container.id,
        threadId: container.isThread() ? container.id : undefined
      });

      // Send initial message in ticket
      const initialEmbed = new EmbedBuilder()
        .setColor(this.stateManager.getActivityColor('GRAY' as any))
        .setTitle(`Ticket #${ticket.ticketNumber} - ${subject}`)
        .setDescription(description)
        .setFields([
          {
            name: 'Created By',
            value: `<@${interaction.user.id}>`,
            inline: true
          },
          {
            name: 'Priority',
            value: priority,
            inline: true
          },
          {
            name: 'Status',
            value: `${this.stateManager.getStateEmoji('GRAY' as any)} New Ticket`,
            inline: true
          }
        ])
        .setTimestamp();

      await container.send({
        content: `<@${interaction.user.id}> ${config.staffRoles.map(r => `<@&${r}>`).join(' ')}`,
        embeds: [initialEmbed]
      });

      // Send ticket information
      await container.send({
        embeds: [{
          color: 0x2F3136,
          description: 'Thank you for creating a ticket! A staff member will assist you shortly.\n\n**Please describe your issue in as much detail as possible.**',
          footer: {
            text: 'This ticket will be automatically closed after 48 hours of inactivity.'
          }
        }]
      });

      // Log ticket creation
      await this.ticketService.logAction(
        ticket.id,
        'TICKET_CREATED',
        interaction.user.id,
        { subject, priority }
      );

      // Send confirmation
      await interaction.editReply({
        content: `✅ Your ticket has been created: <#${container.id}>`,
        embeds: [{
          color: 0x00FF00,
          title: 'Ticket Created Successfully',
          fields: [
            {
              name: 'Ticket Number',
              value: `#${ticket.ticketNumber}`,
              inline: true
            },
            {
              name: 'Channel',
              value: `<#${container.id}>`,
              inline: true
            }
          ]
        }]
      });

      // Send DM notification
      try {
        await interaction.user.send({
          embeds: [{
            color: 0x00FF00,
            title: 'Ticket Created',
            description: `Your ticket #${ticket.ticketNumber} has been created in ${interaction.guild?.name}.`,
            fields: [
              {
                name: 'Subject',
                value: subject
              },
              {
                name: 'Access Your Ticket',
                value: `[Click here](https://discord.com/channels/${interaction.guildId}/${container.id})`
              }
            ],
            footer: {
              text: 'You will receive notifications about your ticket here.'
            }
          }]
        });
      } catch {
        // User has DMs disabled
      }

    } catch (error) {
      console.error('[TicketCreationHandler] Error creating ticket:', error);
      await interaction.editReply({
        content: '❌ An error occurred while creating your ticket. Please try again later.'
      });
    }
  }

  // Create ticket container (thread or channel)
  private async createTicketContainer(
    interaction: ModalSubmitInteraction,
    config: any,
    subject: string,
    categoryId: string
  ): Promise<any> {
    const ticketNumber = await this.getNextTicketNumber(interaction.guildId!);
    const nameVariables = {
      counter: ticketNumber.toString().padStart(4, '0'),
      uuid: this.ticketService.generateShortUUID(),
      username: interaction.user.username,
      userid: interaction.user.id,
      category: categoryId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].replace(/:/g, '-')
    };

    const channelName = this.ticketService.generateChannelName(
      config.namingPattern,
      nameVariables
    );

    if (config.containerType === ContainerType.THREAD) {
      // Create thread
      const parentChannel = interaction.channel;
      if (!parentChannel || !parentChannel.isTextBased() || parentChannel.isThread()) {
        throw new Error('Invalid parent channel for thread creation');
      }

      if ('threads' in parentChannel) {
        return await parentChannel.threads.create({
          name: channelName,
          autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
          reason: `Ticket created by ${interaction.user.tag}`
        });
      } else {
        throw new Error('Channel does not support threads');
      }
    } else {
      // Create channel
      const category = config.supportCategoryId
        ? await interaction.guild!.channels.fetch(config.supportCategoryId)
        : null;

      const channel = await interaction.guild!.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category?.id,
        permissionOverwrites: [
          {
            id: interaction.guild!.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          },
          ...config.staffRoles.map((roleId: string) => ({
            id: roleId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageMessages
            ]
          }))
        ],
        reason: `Ticket created by ${interaction.user.tag}`
      });

      return channel;
    }
  }

  // Get next ticket number
  private async getNextTicketNumber(guildId: string): Promise<number> {
    const lastTicket = await this.ticketService.getConfig(guildId)
      .then(async (config) => {
        if (!config) return null;
        
        const last = await this.ticketService.getUserActiveTickets(guildId, '')
          .then(tickets => tickets.sort((a, b) => b.ticketNumber - a.ticketNumber)[0]);
        
        return last?.ticketNumber || config.startingNumber - 1;
      });

    return (lastTicket || 0) + 1;
  }

  // Parse priority from text
  private parsePriority(text: string): TicketPriority {
    const normalized = text.toLowerCase().trim();
    switch (normalized) {
      case 'low':
        return TicketPriority.LOW;
      case 'high':
        return TicketPriority.HIGH;
      case 'urgent':
        return TicketPriority.URGENT;
      default:
        return TicketPriority.NORMAL;
    }
  }
}