import {
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType
} from 'discord.js';
import { TicketService, TicketConfigWithArrays } from '../services/ticket.service';
import { TicketContainerService } from '../services/ticketContainer.service';
import { TicketStateManager } from '../services/ticketStateManager.service';
import { AssignmentModel, TicketState } from '@prisma/client';

export class TicketControlsHandler {
  private ticketService: TicketService;
  private containerService: TicketContainerService;
  private stateManager: TicketStateManager;

  constructor(
    ticketService: TicketService,
    containerService: TicketContainerService,
    stateManager: TicketStateManager
  ) {
    this.ticketService = ticketService;
    this.containerService = containerService;
    this.stateManager = stateManager;
  }

  // Create control buttons for ticket
  async createControlButtons(
    ticket: any,
    config: any
  ): Promise<ActionRowBuilder<ButtonBuilder>[]> {
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const buttons: ButtonBuilder[] = [];
    const buttonConfig = config.ticketButtons || {};

    // Close button (check config)
    if (buttonConfig.close !== false && ticket.state !== TicketState.CLOSED) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('ticket:close')
          .setLabel('Close')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );
    }

    // Claim/Unclaim button (based on config and assignment model)
    if (buttonConfig.claim && [AssignmentModel.SOFT_CLAIM, AssignmentModel.STRICT_CLAIM].includes(config.assignmentModel)) {
      if (!ticket.assignedStaffId) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId('ticket:claim')
            .setLabel('Claim')
            .setEmoji('✋')
            .setStyle(ButtonStyle.Primary)
        );
      } else if (buttonConfig.unclaim) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId('ticket:release')
            .setLabel('Release')
            .setEmoji('🔓')
            .setStyle(ButtonStyle.Secondary)
        );
      }
    }

    // Transfer button (if claimed and configured)
    if (buttonConfig.transfer && ticket.assignedStaffId) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('ticket:transfer')
          .setLabel('Transfer')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    // Add member button
    if (buttonConfig.addMember) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('ticket:add_member')
          .setLabel('Add Member')
          .setEmoji('➕')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    // Remove member button  
    if (buttonConfig.removeMember) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('ticket:remove_member')
          .setLabel('Remove Member')
          .setEmoji('➖')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    // Transcript button
    if (buttonConfig.transcript) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('ticket:transcript')
          .setLabel('Transcript')
          .setEmoji('📄')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    // Lock/Unlock button
    if (buttonConfig.lock) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(ticket.locked ? 'ticket:unlock' : 'ticket:lock')
          .setLabel(ticket.locked ? 'Unlock' : 'Lock')
          .setEmoji(ticket.locked ? '🔓' : '🔐')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    // For closed tickets
    if (ticket.state === TicketState.CLOSED) {
      // Reopen button
      if (config.closeOptions?.showReopen) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId('ticket:reopen')
            .setLabel('Reopen')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Success)
        );
      }

      // Delete button
      if (config.closeOptions?.showDelete) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId('ticket:delete')
            .setLabel('Delete')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger)
        );
      }
    }

    // Organize buttons into rows (max 5 per row)
    const chunks = [];
    for (let i = 0; i < buttons.length; i += 5) {
      chunks.push(buttons.slice(i, i + 5));
    }

    for (const chunk of chunks) {
      if (chunk.length > 0) {
        rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...chunk));
      }
    }

    return rows;
  }

  // Handle control button interactions
  async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    const action = interaction.customId.split(':')[1];
    
    // Get ticket from channel
    const ticket = await this.ticketService.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      await interaction.reply({
        content: '❌ This channel is not associated with a ticket.',
        ephemeral: true
      });
      return;
    }

    const config = await this.ticketService.getConfig(ticket.guildId);
    if (!config) {
      await interaction.reply({
        content: '❌ Ticket system not configured.',
        ephemeral: true
      });
      return;
    }

    switch (action) {
      case 'close':
        await this.handleClose(interaction, ticket, config);
        break;
      case 'claim':
        await this.handleClaim(interaction, ticket, config);
        break;
      case 'release':
        await this.handleRelease(interaction, ticket, config);
        break;
      case 'transfer':
        await this.handleTransfer(interaction, ticket, config);
        break;
      case 'add_member':
        await this.handleAddMember(interaction, ticket);
        break;
      case 'remove_member':
        await this.handleRemoveMember(interaction, ticket);
        break;
      case 'transcript':
        await this.handleTranscript(interaction, ticket);
        break;
      case 'lock':
      case 'unlock':
        await this.handleLockToggle(interaction, ticket, action === 'lock');
        break;
      case 'reopen':
        await this.handleReopen(interaction, ticket, config);
        break;
      case 'delete':
        await this.handleDelete(interaction, ticket);
        break;
    }
  }

  // Handle close action
  private async handleClose(
    interaction: ButtonInteraction,
    ticket: any,
    config: any
  ): Promise<void> {
    // Check permissions
    const isStaff = await this.ticketService.isStaff(ticket.guildId, interaction.user.id);
    const isCreator = ticket.creatorId === interaction.user.id;

    if (!isStaff && !isCreator) {
      await interaction.reply({
        content: '❌ You do not have permission to close this ticket.',
        ephemeral: true
      });
      return;
    }

    // Store ticket ID for later use in modal submission
    await this.stateManager.setUserState(interaction.user.id, 'closing_ticket', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber
    });

    // Show close reason modal
    const modal = new ModalBuilder()
      .setCustomId('ticket:close:modal')
      .setTitle('Close Ticket');

    const reasonInput = new TextInputBuilder()
      .setCustomId('close_reason')
      .setLabel(config.ticketRequireReason ? 'Reason for closing' : 'Reason for closing (optional)')
      .setPlaceholder('Resolved, No response, Duplicate...')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(config.ticketRequireReason || false)
      .setMaxLength(500);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
    );

    await interaction.showModal(modal);
  }

  // Handle claim action
  private async handleClaim(
    interaction: ButtonInteraction,
    ticket: any,
    config: any
  ): Promise<void> {
    // Check if user is staff
    const isStaff = await this.ticketService.isStaff(ticket.guildId, interaction.user.id);
    if (!isStaff) {
      await interaction.reply({
        content: '❌ Only staff members can claim tickets.',
        ephemeral: true
      });
      return;
    }

    if (ticket.assignedStaffId) {
      await interaction.reply({
        content: '❌ This ticket is already claimed.',
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply();

    try {
      // Assign ticket
      await this.ticketService.assignTicket(ticket.id, interaction.user.id, interaction.user.id);

      // Update channel permissions if strict claim
      if (config.assignmentModel === AssignmentModel.STRICT_CLAIM) {
        const container = await this.containerService.getContainer(interaction.guild!, ticket);
        if (container) {
          // Remove other staff permissions in strict mode
          for (const roleId of config.staffRoles) {
            if (container.isThread()) continue; // Can't modify thread permissions like this
            
            if ('permissionOverwrites' in container) {
              await container.permissionOverwrites.edit(roleId, {
                SendMessages: false
              });
            }
          }

          // Grant permission to claimer
          if ('permissionOverwrites' in container) {
            await container.permissionOverwrites.edit(interaction.user.id, {
              SendMessages: true,
              ManageMessages: true
            });
          }
        }
      }

      await interaction.editReply({
        embeds: [{
          color: 0x00FF00,
          description: `✅ Ticket claimed by ${interaction.user}`,
          timestamp: new Date().toISOString()
        }]
      });

      // Update control buttons
      const newButtons = await this.createControlButtons(
        { ...ticket, assignedStaffId: interaction.user.id },
        config
      );
      
      await interaction.message.edit({ components: newButtons });

    } catch (error) {
      console.error('[TicketControls] Error claiming ticket:', error);
      await interaction.editReply({
        content: '❌ Failed to claim ticket. Please try again.'
      });
    }
  }

  // Handle release action
  private async handleRelease(
    interaction: ButtonInteraction,
    ticket: any,
    config: any
  ): Promise<void> {
    if (ticket.assignedStaffId !== interaction.user.id) {
      const isAdmin = interaction.memberPermissions?.has('Administrator');
      if (!isAdmin) {
        await interaction.reply({
          content: '❌ Only the assigned staff member can release this ticket.',
          ephemeral: true
        });
        return;
      }
    }

    await interaction.deferReply();

    try {
      await this.ticketService.unassignTicket(ticket.id, interaction.user.id);

      // Restore permissions
      if (config.assignmentModel === AssignmentModel.STRICT_CLAIM) {
        const container = await this.containerService.getContainer(interaction.guild!, ticket);
        if (container && !container.isThread() && 'permissionOverwrites' in container) {
          // Restore staff role permissions
          for (const roleId of config.staffRoles) {
            await container.permissionOverwrites.edit(roleId, {
              SendMessages: true
            });
          }
        }
      }

      await interaction.editReply({
        embeds: [{
          color: 0xFFA500,
          description: '🔓 Ticket has been released and is now available for other staff.',
          timestamp: new Date().toISOString()
        }]
      });

      // Update control buttons
      const newButtons = await this.createControlButtons(
        { ...ticket, assignedStaffId: null },
        config
      );
      
      await interaction.message.edit({ components: newButtons });

    } catch (error) {
      console.error('[TicketControls] Error releasing ticket:', error);
      await interaction.editReply({
        content: '❌ Failed to release ticket. Please try again.'
      });
    }
  }

  // Handle transfer action
  private async handleTransfer(
    interaction: ButtonInteraction,
    ticket: any,
    config: any
  ): Promise<void> {
    if (ticket.assignedStaffId !== interaction.user.id) {
      const isAdmin = interaction.memberPermissions?.has('Administrator');
      if (!isAdmin) {
        await interaction.reply({
          content: '❌ Only the assigned staff member can transfer this ticket.',
          ephemeral: true
        });
        return;
      }
    }

    // Create staff member select menu
    const staffMembers: any[] = [];
    for (const roleId of config.staffRoles) {
      const role = interaction.guild!.roles.cache.get(roleId);
      if (role) {
        role.members.forEach(member => {
          if (member.id !== ticket.assignedStaffId && !member.user.bot) {
            staffMembers.push({
              label: member.displayName,
              value: member.id,
              description: member.user.tag
            });
          }
        });
      }
    }

    if (staffMembers.length === 0) {
      await interaction.reply({
        content: '❌ No other staff members available for transfer.',
        ephemeral: true
      });
      return;
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket:transfer:select')
      .setPlaceholder('Select a staff member...')
      .addOptions(staffMembers.slice(0, 25)); // Discord limit

    await interaction.reply({
      content: 'Select a staff member to transfer this ticket to:',
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
      ephemeral: true
    });
  }

  // Handle add member action
  private async handleAddMember(
    interaction: ButtonInteraction,
    ticket: any
  ): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId('ticket:add_member:modal')
      .setTitle('Add Member to Ticket');

    const userInput = new TextInputBuilder()
      .setCustomId('user_id')
      .setLabel('User ID or @mention')
      .setPlaceholder('123456789012345678 or @username')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(userInput)
    );

    await interaction.showModal(modal);
  }

  // Handle transcript action
  private async handleTranscript(
    interaction: ButtonInteraction,
    ticket: any
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    try {
      const fullTicket = await this.ticketService.getTicket(ticket.id);
      const messages = fullTicket?.messages || [];

      if (messages.length === 0) {
        await interaction.editReply({
          content: '❌ No messages found in this ticket.'
        });
        return;
      }

      // Create transcript
      let transcript = `Ticket #${ticket.ticketNumber} Transcript\n`;
      transcript += `Created: ${ticket.createdAt}\n`;
      transcript += `Creator: ${ticket.creatorId}\n\n`;
      transcript += '='.repeat(50) + '\n\n';

      for (const msg of messages.reverse()) {
        transcript += `[${msg.createdAt.toLocaleString()}] ${msg.authorId}: ${msg.content}\n`;
        if (msg.attachments) {
          const attachments = msg.attachments as any;
          if (attachments.count > 0) {
            transcript += `  Attachments: ${attachments.count} file(s)\n`;
          }
        }
        transcript += '\n';
      }

      // Create buffer and attachment
      const buffer = Buffer.from(transcript, 'utf-8');
      
      await interaction.editReply({
        content: '📄 Ticket transcript generated:',
        files: [{
          attachment: buffer,
          name: `ticket-${ticket.ticketNumber}-transcript.txt`
        }]
      });

    } catch (error) {
      console.error('[TicketControls] Error generating transcript:', error);
      await interaction.editReply({
        content: '❌ Failed to generate transcript. Please try again.'
      });
    }
  }

  // Handle reopen action
  private async handleReopen(
    interaction: ButtonInteraction,
    ticket: any,
    config: any
  ): Promise<void> {
    const isStaff = await this.ticketService.isStaff(ticket.guildId, interaction.user.id);
    if (!isStaff) {
      await interaction.reply({
        content: '❌ Only staff members can reopen tickets.',
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply();

    try {
      // Update ticket state
      await this.ticketService.updateTicket(ticket.id, {
        state: TicketState.OPEN,
        closedAt: null
      });

      // Unlock container
      const container = await this.containerService.getContainer(interaction.guild!, ticket);
      if (container) {
        if (container.isThread()) {
          await container.setLocked(false);
          await container.setArchived(false);
        } else if ('permissionOverwrites' in container) {
          await container.permissionOverwrites.edit(ticket.creatorId, {
            SendMessages: true,
            AddReactions: true
          });
        }
      }

      await this.ticketService.logAction(ticket.id, 'TICKET_REOPENED', interaction.user.id);

      await interaction.editReply({
        embeds: [{
          color: 0x00FF00,
          description: '🔓 Ticket has been reopened.',
          timestamp: new Date().toISOString()
        }]
      });

      // Update control buttons
      const newButtons = await this.createControlButtons(
        { ...ticket, state: TicketState.OPEN },
        config
      );
      
      await interaction.message.edit({ components: newButtons });

    } catch (error) {
      console.error('[TicketControls] Error reopening ticket:', error);
      await interaction.editReply({
        content: '❌ Failed to reopen ticket. Please try again.'
      });
    }
  }

  // Handle delete action
  private async handleDelete(
    interaction: ButtonInteraction,
    ticket: any
  ): Promise<void> {
    const hasPermission = interaction.memberPermissions?.has('Administrator') ||
                         await this.ticketService.isStaff(ticket.guildId, interaction.user.id);

    if (!hasPermission) {
      await interaction.reply({
        content: '❌ You do not have permission to delete tickets.',
        ephemeral: true
      });
      return;
    }

    // Show confirmation
    const confirmRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ticket:delete:confirm')
          .setLabel('Confirm Delete')
          .setEmoji('⚠️')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('ticket:delete:cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.reply({
      embeds: [{
        color: 0xFF0000,
        title: '⚠️ Delete Ticket',
        description: 'Are you sure you want to delete this ticket?\n\n**This action cannot be undone!**',
        footer: {
          text: 'The ticket will be soft-deleted and can be recovered within 7 days.'
        }
      }],
      components: [confirmRow],
      ephemeral: true
    });
  }
}