import {
  Interaction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  Client
} from 'discord.js';
import { TicketService } from '../services/ticket.service';
import { TicketStateManager } from '../services/ticketStateManager.service';
import { TicketPanelService } from '../services/ticketPanel.service';
import { TicketContainerService } from '../services/ticketContainer.service';
import { TicketAssignmentService } from '../services/ticketAssignment.service';
import { TicketCreationHandler } from './ticketCreation.handler';
import { TicketControlsHandler } from './ticketControls.handler';

export class TicketInteractionHandler {
  private ticketService: TicketService;
  private stateManager: TicketStateManager;
  private panelService: TicketPanelService;
  private containerService: TicketContainerService;
  private assignmentService: TicketAssignmentService;
  private creationHandler: TicketCreationHandler;
  private controlsHandler: TicketControlsHandler;

  constructor(client: Client) {
    // Initialize services
    this.ticketService = new TicketService(client);
    this.stateManager = new TicketStateManager(client, this.ticketService);
    this.panelService = new TicketPanelService(this.ticketService);
    this.containerService = new TicketContainerService(this.ticketService);
    this.assignmentService = new TicketAssignmentService(this.ticketService);
    
    // Initialize handlers
    this.creationHandler = new TicketCreationHandler(this.ticketService, this.stateManager);
    this.controlsHandler = new TicketControlsHandler(
      this.ticketService,
      this.containerService,
      this.stateManager
    );

    // Start global timer for state management
    this.stateManager.startGlobalTimer();
  }

  // Main interaction handler
  async handleInteraction(interaction: Interaction): Promise<void> {
    try {
      // Button interactions
      if (interaction.isButton()) {
        await this.handleButtonInteraction(interaction);
      }
      
      // Select menu interactions
      else if (interaction.isStringSelectMenu()) {
        await this.handleSelectMenuInteraction(interaction);
      }
      
      // Modal submissions
      else if (interaction.isModalSubmit()) {
        await this.handleModalSubmit(interaction);
      }
    } catch (error) {
      console.error('[TicketInteractionHandler] Error handling interaction:', error);
      
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while processing your request.',
          ephemeral: true
        });
      }
    }
  }

  // Handle button interactions
  private async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    const [namespace, action] = interaction.customId.split(':');
    
    if (namespace !== 'ticket') return;

    switch (action) {
      case 'create':
        await this.creationHandler.handleButtonInteraction(interaction);
        break;
      
      case 'close':
      case 'claim':
      case 'release':
      case 'transfer':
      case 'add_member':
      case 'transcript':
      case 'reopen':
      case 'delete':
        if (interaction.customId === 'ticket:delete:confirm') {
          await this.handleDeleteConfirm(interaction);
        } else if (interaction.customId === 'ticket:delete:cancel') {
          await this.handleDeleteCancel(interaction);
        } else {
          await this.controlsHandler.handleButtonInteraction(interaction);
        }
        break;
    }
  }

  // Handle select menu interactions
  private async handleSelectMenuInteraction(interaction: StringSelectMenuInteraction): Promise<void> {
    const [namespace, action] = interaction.customId.split(':');
    
    if (namespace !== 'ticket') return;

    switch (action) {
      case 'category':
        await this.creationHandler.handleSelectMenuInteraction(interaction);
        break;
      
      case 'transfer':
        await this.handleTransferSelect(interaction);
        break;
    }
  }

  // Handle modal submissions
  private async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    const [namespace, action] = interaction.customId.split(':');
    
    if (namespace !== 'ticket') return;

    switch (action) {
      case 'modal':
        await this.creationHandler.handleModalSubmit(interaction);
        break;
      
      case 'close':
        await this.handleCloseModal(interaction);
        break;
      
      case 'add_member':
        await this.handleAddMemberModal(interaction);
        break;
    }
  }

  // Handle close modal submission
  private async handleCloseModal(interaction: ModalSubmitInteraction): Promise<void> {
    if (interaction.customId !== 'ticket:close:reason') return;

    await interaction.deferReply();

    const reason = interaction.fields.getTextInputValue('close_reason') || 'No reason provided';
    
    if (!interaction.channelId) {
      await interaction.editReply({
        content: '❌ This command must be used in a ticket channel.'
      });
      return;
    }
    
    const ticket = await this.ticketService.getTicketByChannel(interaction.channelId);
    
    if (!ticket) {
      await interaction.editReply({
        content: '❌ This channel is not associated with a ticket.'
      });
      return;
    }

    try {
      // Close the ticket
      await this.ticketService.closeTicket(ticket.id, interaction.user.id, reason);

      // Archive the container
      const container = await this.containerService.getContainer(interaction.guild!, ticket);
      if (container) {
        await this.containerService.archiveContainer(container, `Closed by ${interaction.user.tag}`);
      }

      // Send close embed
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

      // Update control buttons
      const config = await this.ticketService.getConfig(ticket.guildId);
      if (config) {
        const newButtons = await this.controlsHandler.createControlButtons(
          { ...ticket, state: 'CLOSED' },
          config
        );
        
        if (interaction.message) {
          await interaction.message.edit({ components: newButtons });
        }
      }

      // Send DM notification to creator
      try {
        const creator = await interaction.client.users.fetch(ticket.creatorId);
        await creator.send({
          embeds: [{
            color: 0xE74C3C,
            title: '🔒 Ticket Closed',
            description: `Your ticket #${ticket.ticketNumber} in ${interaction.guild?.name} has been closed.`,
            fields: [
              {
                name: 'Closed By',
                value: interaction.user.tag,
                inline: true
              },
              {
                name: 'Reason',
                value: reason,
                inline: true
              }
            ],
            footer: {
              text: 'If you need further assistance, please create a new ticket.'
            }
          }]
        });
      } catch {
        // User has DMs disabled
      }

    } catch (error) {
      console.error('[TicketInteractionHandler] Error closing ticket:', error);
      await interaction.editReply({
        content: '❌ Failed to close ticket. Please try again.'
      });
    }
  }

  // Handle transfer selection
  private async handleTransferSelect(interaction: StringSelectMenuInteraction): Promise<void> {
    if (interaction.customId !== 'ticket:transfer:select') return;

    await interaction.deferUpdate();

    const newStaffId = interaction.values[0];
    const ticket = await this.ticketService.getTicketByChannel(interaction.channelId);
    
    if (!ticket) {
      await interaction.followUp({
        content: '❌ This channel is not associated with a ticket.',
        ephemeral: true
      });
      return;
    }

    try {
      await this.assignmentService.transferTicket(ticket, newStaffId, interaction.user.id);

      const newStaff = await interaction.guild!.members.fetch(newStaffId);
      
      await interaction.followUp({
        embeds: [{
          color: 0x00FF00,
          description: `✅ Ticket transferred to ${newStaff}`,
          timestamp: new Date().toISOString()
        }]
      });

      // Notify new staff member
      try {
        await newStaff.send({
          embeds: [{
            color: 0xFFA500,
            title: '📥 Ticket Transferred',
            description: `You have been assigned ticket #${ticket.ticketNumber} in ${interaction.guild?.name}.`,
            fields: [
              {
                name: 'Transferred By',
                value: interaction.user.tag
              },
              {
                name: 'Access Ticket',
                value: `<#${ticket.threadId || ticket.channelId}>`
              }
            ]
          }]
        });
      } catch {
        // DMs disabled
      }

    } catch (error) {
      console.error('[TicketInteractionHandler] Error transferring ticket:', error);
      await interaction.followUp({
        content: '❌ Failed to transfer ticket. Please try again.',
        ephemeral: true
      });
    }
  }

  // Handle add member modal
  private async handleAddMemberModal(interaction: ModalSubmitInteraction): Promise<void> {
    if (interaction.customId !== 'ticket:add_member:modal') return;

    await interaction.deferReply({ ephemeral: true });

    const userInput = interaction.fields.getTextInputValue('user_id');
    
    if (!interaction.channelId) {
      await interaction.editReply({
        content: '❌ This command must be used in a ticket channel.'
      });
      return;
    }
    
    const ticket = await this.ticketService.getTicketByChannel(interaction.channelId);
    
    if (!ticket) {
      await interaction.editReply({
        content: '❌ This channel is not associated with a ticket.'
      });
      return;
    }

    try {
      // Parse user ID from input
      const userId = userInput.replace(/[<@!>]/g, '');
      const member = await interaction.guild!.members.fetch(userId);

      if (!member) {
        await interaction.editReply({
          content: '❌ User not found. Please provide a valid user ID or mention.'
        });
        return;
      }

      // Add user to ticket
      await this.ticketService.addParticipant(ticket.id, member.id, 'MEMBER' as any);

      // Update container permissions
      const container = await this.containerService.getContainer(interaction.guild!, ticket);
      if (container) {
        await this.containerService.updateContainerPermissions(container, {
          addUsers: [member.id]
        });
      }

      await interaction.editReply({
        content: `✅ Added ${member} to the ticket.`
      });

      // Log action
      await this.ticketService.logAction(ticket.id, 'MEMBER_ADDED', interaction.user.id, {
        addedUserId: member.id
      });

    } catch (error) {
      console.error('[TicketInteractionHandler] Error adding member:', error);
      await interaction.editReply({
        content: '❌ Failed to add member. Please ensure the user ID is valid.'
      });
    }
  }

  // Handle delete confirmation
  private async handleDeleteConfirm(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();

    const ticket = await this.ticketService.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      await interaction.followUp({
        content: '❌ This channel is not associated with a ticket.',
        ephemeral: true
      });
      return;
    }

    try {
      // Soft delete ticket
      await this.ticketService.deleteTicket(ticket.id, interaction.user.id, 'Manual deletion');

      // Delete container
      const container = await this.containerService.getContainer(interaction.guild!, ticket);
      if (container) {
        await this.containerService.deleteContainer(container, `Deleted by ${interaction.user.tag}`);
      }

      await interaction.followUp({
        content: '✅ Ticket has been deleted and will be permanently removed in 7 days.',
        ephemeral: true
      });

    } catch (error) {
      console.error('[TicketInteractionHandler] Error deleting ticket:', error);
      await interaction.followUp({
        content: '❌ Failed to delete ticket. Please try again.',
        ephemeral: true
      });
    }
  }

  // Handle delete cancellation
  private async handleDeleteCancel(interaction: ButtonInteraction): Promise<void> {
    await interaction.update({
      content: '❌ Ticket deletion cancelled.',
      embeds: [],
      components: []
    });
  }

  // Get services (for external use)
  getServices() {
    return {
      ticketService: this.ticketService,
      stateManager: this.stateManager,
      panelService: this.panelService,
      containerService: this.containerService,
      assignmentService: this.assignmentService
    };
  }

  // Shutdown handler
  shutdown() {
    this.stateManager.stopGlobalTimer();
  }
}