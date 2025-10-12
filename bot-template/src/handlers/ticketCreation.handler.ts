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
  PermissionsBitField,
  TextChannel,
  CategoryChannel
} from 'discord.js';
import { TicketService, TicketConfigWithArrays } from '../services/ticket.service';
import { TicketStateManager } from '../services/ticketStateManager.service';
import { TicketPanelService } from '../services/ticketPanel.service';
import { TicketValidationService } from '../services/ticketValidation.service';
import { ContainerType, TicketPriority } from '@prisma/client';
import { getErrorMessage, formatError } from '../utils/ticketErrorMessages';

export class TicketCreationHandler {
  private ticketService: TicketService;
  private stateManager: TicketStateManager;
  private ticketPanelService: TicketPanelService | null = null;
  private validationService: TicketValidationService;

  constructor(ticketService: TicketService, stateManager: TicketStateManager) {
    this.ticketService = ticketService;
    this.stateManager = stateManager;
    this.validationService = new TicketValidationService(ticketService['client'], ticketService);
  }
  
  setTicketPanelService(panelService: TicketPanelService) {
    this.ticketPanelService = panelService;
  }

  // Handle button interaction for ticket creation
  async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.customId.startsWith('ticket:create:')) return;

    try {
      const categoryId = interaction.customId.split(':')[2];
      await this.showTicketModal(interaction, categoryId);
    } catch (error) {
      console.error('[TicketCreationHandler] Error handling button interaction:', error);

      // Try to respond to the interaction
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ An error occurred while creating the ticket. Please try again or contact an administrator.',
            flags: 64 // EPHEMERAL flag
          });
        }
      } catch (replyError) {
        console.error('[TicketCreationHandler] Failed to send error message:', replyError);
      }
    }
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
    // Get configuration first
    const config = await this.ticketService.getConfig(interaction.guildId!);
    
    // Validate configuration before proceeding
    const validation = await this.validationService.validateTicketCreation(
      config!,
      interaction.guildId!,
      interaction.user.id,
      categoryId
    );

    if (!validation.isValid) {
      const message = this.validationService.formatValidationMessage(validation);
      await interaction.reply({
        content: message,
        ephemeral: true
      });
      return;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      console.log(`[TicketCreationHandler] Configuration warnings:`, validation.warnings);
    }

    // Check if user can create ticket (legacy check)
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
      // First try to get categories from stored panel data
      if (this.ticketPanelService) {
        const storedCategories = (this.ticketPanelService as any).getStoredCategories?.(interaction.guildId!);
        if (storedCategories) {
          category = storedCategories.find((c: any) => c.id === categoryId);
          console.log(`[TicketCreationHandler] Found category from stored data:`, {
            id: category?.id,
            name: category?.name,
            useCustomModal: category?.useCustomModal,
            useCustomModalType: typeof category?.useCustomModal,
            modalFields: category?.modalFields?.length || 0
          });
        } else {
          console.log(`[TicketCreationHandler] No stored categories found for guild ${interaction.guildId}`);
        }
      }
      
      // Fallback to config categories if not found
      if (!category) {
        console.log(`[TicketCreationHandler] Falling back to config categories`);
        const config = await this.ticketService.getConfig(interaction.guildId!);
        category = config?.categories?.find(c => c.id === categoryId) as any;
        if (category) {
          console.log(`[TicketCreationHandler] Found category from config:`, {
            id: category.id,
            name: category.name,
            useCustomModal: category.useCustomModal,
            useCustomModalType: typeof category.useCustomModal
          });
        }
      }
      
      if (category) {
        categoryName = category.name;
      }
    }

    console.log(`[TicketCreationHandler] Category check:`, {
      categoryId,
      hasCategory: !!category,
      useCustomModal: category?.useCustomModal,
      modalFieldsCount: category?.modalFields?.length || 0,
      modalTitle: category?.modalTitle
    });

    // For non-general categories, check if we should skip modal
    if (categoryId !== 'general' && category) {
      // If useCustomModal is false (not just undefined), create ticket directly
      if (category.useCustomModal === false) {
        console.log(`[TicketCreationHandler] Creating ticket directly for category ${categoryName} (useCustomModal: ${category.useCustomModal})`);
        await this.createTicketDirectly(interaction, categoryId, categoryName);
        return;
      }
    }
    
    // Check if category has custom modal with fields
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

      // Validate configuration again before creating ticket
      const validation = await this.validationService.validateTicketCreation(
        config,
        interaction.guildId!,
        interaction.user.id,
        categoryId
      );

      if (!validation.isValid) {
        const message = this.validationService.formatValidationMessage(validation);
        await interaction.editReply({
          content: message
        });
        return;
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

      // Send DM notification if enabled in config
      if (config.dmNotifications) {
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
      }

    } catch (error) {
      console.error('[TicketCreationHandler] Error creating ticket:', error);
      
      let errorMessage = getErrorMessage('CREATION_FAILED');
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('thread')) {
          errorMessage = getErrorMessage('THREAD_CREATE_FAILED');
        } else if (error.message.includes('channel')) {
          errorMessage = getErrorMessage('CHANNEL_CREATE_FAILED');
        } else if (error.message.includes('permission')) {
          errorMessage = getErrorMessage('NO_PERMISSION');
        }
      }
      
      await interaction.editReply({
        content: formatError(errorMessage)
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
      // Find or create hub channel for threads
      let hubChannel: TextChannel;
      
      if (config.supportCategoryId) {
        const category = await interaction.guild!.channels.fetch(config.supportCategoryId) as CategoryChannel;
        
        // Look for existing hub channel
        hubChannel = category.children.cache.find(
          ch => ch.type === ChannelType.GuildText && ch.name === 'ticket-hub'
        ) as TextChannel;

        if (!hubChannel) {
          // Create hub channel
          hubChannel = await interaction.guild!.channels.create({
            name: 'ticket-hub',
            type: ChannelType.GuildText,
            parent: category,
            permissionOverwrites: [
              {
                id: interaction.guild!.id,
                deny: [PermissionsBitField.Flags.SendMessages],
                allow: [PermissionsBitField.Flags.ViewChannel]
              },
              ...config.staffRoles.map((roleId: string) => ({
                id: roleId,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ManageThreads
                ]
              }))
            ]
          });

          // Send info message
          await hubChannel.send({
            embeds: [{
              color: 0x2F3136,
              title: '🎫 Ticket Hub',
              description: 'All support tickets are created as threads in this channel.',
              fields: [
                {
                  name: 'For Users',
                  value: 'Your ticket thread will appear below when created.'
                },
                {
                  name: 'For Staff',
                  value: 'All active ticket threads are visible here.'
                }
              ]
            }]
          });
        }
      } else {
        // No category specified, use first text channel
        hubChannel = interaction.guild!.channels.cache
          .filter(ch => ch.type === ChannelType.GuildText)
          .first() as TextChannel;
      }

      if (!hubChannel) {
        throw new Error('No suitable hub channel found');
      }

      // Create thread
      const thread = await hubChannel.threads.create({
        name: channelName,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        type: ChannelType.PrivateThread,
        reason: `Ticket created by ${interaction.user.tag}`,
        invitable: false
      });

      // Add creator to thread
      await thread.members.add(interaction.user.id);

      // Add staff roles
      for (const roleId of config.staffRoles) {
        const role = interaction.guild!.roles.cache.get(roleId);
        if (role) {
          const staffMembers = role.members;
          for (const [, staffMember] of staffMembers) {
            await thread.members.add(staffMember.id).catch(() => {});
          }
        }
      }

      return thread;
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

  // Create ticket directly without modal
  private async createTicketDirectly(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
    categoryId: string,
    categoryName: string
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await this.ticketService.getConfig(interaction.guildId!);
      if (!config) {
        throw new Error('Ticket system not configured');
      }

      // Validate configuration before creating ticket
      const validation = await this.validationService.validateTicketCreation(
        config,
        interaction.guildId!,
        interaction.user.id,
        categoryId
      );

      if (!validation.isValid) {
        const message = this.validationService.formatValidationMessage(validation);
        await interaction.editReply({
          content: message
        });
        return;
      }

      // Default values for direct creation
      const subject = `${categoryName} Ticket`;
      const description = `Ticket created by <@${interaction.user.id}>`;
      const priority = TicketPriority.NORMAL;

      // Create ticket container (thread or channel)
      const container = await this.createTicketContainer(
        interaction as any, // Cast to ModalSubmitInteraction-like
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
            name: 'Category',
            value: categoryName,
            inline: true
          },
          {
            name: 'Status',
            value: `${this.stateManager.getStateEmoji('GRAY' as any)} Open`,
            inline: true
          }
        ])
        .setTimestamp();

      await container.send({
        content: `<@${interaction.user.id}> ${config.staffRoles.map((r: string) => `<@&${r}>`).join(' ')}`,
        embeds: [initialEmbed]
      });

      // Send welcome message
      await container.send({
        embeds: [{
          color: 0x2F3136,
          description: `Welcome <@${interaction.user.id}>! A staff member will assist you shortly.\n\n**Please describe your issue while you wait.**`,
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
        { subject, priority, directCreation: true }
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
            },
            {
              name: 'Category',
              value: categoryName,
              inline: true
            }
          ]
        }]
      });

      // Send DM notification if enabled in config
      if (config.dmNotifications) {
        try {
          await interaction.user.send({
            embeds: [{
              color: 0x00FF00,
              title: 'Ticket Created',
              description: `Your ${categoryName} ticket #${ticket.ticketNumber} has been created in ${interaction.guild?.name}.`,
              fields: [
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
      }

    } catch (error) {
      console.error('[TicketCreationHandler] Error creating ticket directly:', error);
      
      let errorMessage = getErrorMessage('CREATION_FAILED');
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('thread')) {
          errorMessage = getErrorMessage('THREAD_CREATE_FAILED');
        } else if (error.message.includes('channel')) {
          errorMessage = getErrorMessage('CHANNEL_CREATE_FAILED');
        } else if (error.message.includes('permission')) {
          errorMessage = getErrorMessage('NO_PERMISSION');
        }
      }
      
      await interaction.editReply({
        content: formatError(errorMessage)
      });
    }
  }
}