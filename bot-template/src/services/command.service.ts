import { Client } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { TicketPanelService } from './ticketPanel.service';
import { TicketWebhookService } from './ticketWebhook.service';

interface BotCommand {
  id: string;
  action: string;
  data: any;
}

export class CommandService {
  private client: Client;
  private prisma: PrismaClient;
  private botId: string;
  private ticketPanelService: TicketPanelService | null = null;
  private webhookService: TicketWebhookService;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(client: Client, prisma: PrismaClient, botId: string) {
    this.client = client;
    this.prisma = prisma;
    this.botId = botId;
    this.webhookService = new TicketWebhookService(client);
  }

  setTicketPanelService(service: TicketPanelService) {
    this.ticketPanelService = service;
  }

  start() {
    // Poll for commands every 5 seconds
    this.pollInterval = setInterval(() => {
      this.checkForCommands();
    }, 5000);
    
    // Check immediately
    this.checkForCommands();
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async checkForCommands() {
    try {
      // Check if botCommand model exists
      if (!this.prisma.botCommand) {
        console.log('⚠️ BotCommand model not found. Please run "npx prisma generate" to update the Prisma client.');
        return;
      }
      
      // Get pending commands
      const commands = await this.prisma.botCommand.findMany({
        where: {
          botId: this.botId,
          status: 'PENDING'
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      for (const command of commands) {
        await this.executeCommand(command);
      }
    } catch (error) {
      console.error('Error checking for commands:', error);
    }
  }

  private async executeCommand(command: any) {
    console.log(`Executing command: ${command.action}`);
    
    // Check if botCommand model exists
    if (!this.prisma.botCommand) {
      return;
    }
    
    // Mark as processing
    await this.prisma.botCommand.update({
      where: { id: command.id },
      data: {
        status: 'PROCESSING',
        processedAt: new Date()
      }
    });

    try {
      switch (command.action) {
        case 'SEND_TICKET_PANEL':
          await this.handleSendTicketPanel(command.data);
          break;

        case 'SEND_TICKET_MESSAGE':
          await this.handleSendTicketMessage(command.data);
          break;

        case 'RENAME_TICKET':
          await this.handleRenameTicket(command.data);
          break;

        case 'CLAIM_TICKET':
          await this.handleClaimTicket(command.data);
          break;

        case 'UNCLAIM_TICKET':
          await this.handleUnclaimTicket(command.data);
          break;

        case 'LOCK_TICKET':
          await this.handleLockTicket(command.data);
          break;

        case 'UNLOCK_TICKET':
          await this.handleUnlockTicket(command.data);
          break;

        case 'ADD_USER_TO_TICKET':
          await this.handleAddUserToTicket(command.data);
          break;

        case 'REMOVE_USER_FROM_TICKET':
          await this.handleRemoveUserFromTicket(command.data);
          break;

        case 'CHANGE_TICKET_PRIORITY':
          await this.handleChangeTicketPriority(command.data);
          break;

        case 'DELETE_TICKET':
          await this.handleDeleteTicket(command.data);
          break;

        case 'UPDATE_CONFIG':
          await this.handleUpdateConfig(command.data);
          break;

        default:
          throw new Error(`Unknown command action: ${command.action}`);
      }

      // Mark as completed
      await this.prisma.botCommand.update({
        where: { id: command.id },
        data: {
          status: 'COMPLETED'
        }
      });
    } catch (error: any) {
      console.error(`Error executing command ${command.action}:`, error);
      
      // Mark as failed
      await this.prisma.botCommand.update({
        where: { id: command.id },
        data: {
          status: 'FAILED',
          error: error.message || 'Unknown error'
        }
      });
    }
  }

  private async handleSendTicketPanel(data: any) {
    if (!this.ticketPanelService) {
      console.warn('[CommandService] Ticket panel service not initialized - ticket system may be disabled');
      return;
    }

    const guild = this.client.guilds.cache.first();
    if (!guild) {
      throw new Error('Bot is not in any guild');
    }


    // Create the panel using the ticket panel service
    const result = await this.ticketPanelService.createPanel(
      guild,
      data.channelId,
      data.type || 'BUTTON',
      {
        title: data.title,
        description: data.description,
        color: data.color
      },
      data.categories || []
    );
    
  }

  private async handleUpdateConfig(data: any) {
    // Reload configuration
    console.log('Config update requested:', data);
    // This would trigger a config reload in the bot
  }

  private async handleSendTicketMessage(data: any) {
    const { channelId, content, username, avatar } = data;

    if (!channelId || !content || !username) {
      throw new Error('Missing required fields: channelId, content, username');
    }

    console.log(`[CommandService] Sending ticket message to channel ${channelId}`);

    // Send message via webhook
    const success = await this.webhookService.sendMessage(
      channelId,
      content,
      username,
      avatar
    );

    if (!success) {
      throw new Error('Failed to send message via webhook');
    }

    console.log(`[CommandService] Message sent successfully`);
  }

  // Clean up old commands
  async cleanupOldCommands() {
    // Check if botCommand model exists
    if (!this.prisma.botCommand) {
      return;
    }
    
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    await this.prisma.botCommand.deleteMany({
      where: {
        botId: this.botId,
        status: {
          in: ['COMPLETED', 'FAILED']
        },
        createdAt: {
          lt: oneDayAgo
        }
      }
    });
  }

  private async handleRenameTicket(data: any) {
    const { ticketId, name } = data;
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found');

    const channel = this.client.channels.cache.get(ticket.channelId || ticket.threadId);
    if (channel && channel.isTextBased()) {
      await (channel as any).setName(name);
    }
  }

  private async handleClaimTicket(data: any) {
    const { ticketId } = data;
    // This would be handled by the actual /claim command
    // For now just update the DB
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { claimedBy: this.client.user?.id || null }
    });
  }

  private async handleUnclaimTicket(data: any) {
    const { ticketId } = data;
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { claimedBy: null }
    });
  }

  private async handleLockTicket(data: any) {
    const { ticketId } = data;
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found');

    const channel = this.client.channels.cache.get(ticket.channelId || ticket.threadId);
    if (channel && channel.isTextBased() && 'permissionOverwrites' in channel) {
      await (channel as any).permissionOverwrites.edit(ticket.userId, {
        SendMessages: false
      });
    }

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { locked: true }
    });
  }

  private async handleUnlockTicket(data: any) {
    const { ticketId } = data;
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found');

    const channel = this.client.channels.cache.get(ticket.channelId || ticket.threadId);
    if (channel && channel.isTextBased() && 'permissionOverwrites' in channel) {
      await (channel as any).permissionOverwrites.edit(ticket.userId, {
        SendMessages: true
      });
    }

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { locked: false }
    });
  }

  private async handleAddUserToTicket(data: any) {
    const { ticketId, userId } = data;
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found');

    const channel = this.client.channels.cache.get(ticket.channelId || ticket.threadId);
    if (channel && channel.isTextBased() && 'permissionOverwrites' in channel) {
      await (channel as any).permissionOverwrites.edit(userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });
    }

    await this.prisma.ticketParticipant.create({
      data: {
        ticketId,
        userId,
        role: 'USER'
      }
    });
  }

  private async handleRemoveUserFromTicket(data: any) {
    const { ticketId, userId } = data;
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found');

    const channel = this.client.channels.cache.get(ticket.channelId || ticket.threadId);
    if (channel && channel.isTextBased() && 'permissionOverwrites' in channel) {
      await (channel as any).permissionOverwrites.delete(userId);
    }

    await this.prisma.ticketParticipant.deleteMany({
      where: { ticketId, userId }
    });
  }

  private async handleChangeTicketPriority(data: any) {
    const { ticketId, priority } = data;
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { priority }
    });
  }

  private async handleDeleteTicket(data: any) {
    const { ticketId } = data;
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found');

    // Just soft delete in DB, don't delete the Discord channel
    // The channel will be deleted when the ticket is closed normally
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        deletedAt: new Date(),
        state: 'CLOSED'
      }
    });
  }
}