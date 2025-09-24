import { ActivityState, TicketState, TimerType } from '@prisma/client';
import { Client } from 'discord.js';
import { TicketService } from './ticket.service';

interface TimerConfig {
  idleThreshold: number;
  warningThreshold: number;
  autoCloseThreshold: number;
}

export class TicketStateManager {
  private client: Client;
  private ticketService: TicketService;
  private globalTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private checkInterval = 60000; // Check every minute
  private cleanupInterval = 3600000; // Check every hour

  constructor(client: Client, ticketService: TicketService) {
    this.client = client;
    this.ticketService = ticketService;
  }

  // Start the global timer for checking ticket states
  startGlobalTimer(): void {
    if (this.globalTimer) {
      clearInterval(this.globalTimer);
    }

    this.globalTimer = setInterval(() => {
      this.processTicketStates();
    }, this.checkInterval);

    // Start cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupDeletedTickets();
    }, this.cleanupInterval);

    console.log('[TicketStateManager] Global timer and cleanup timer started');
  }

  stopGlobalTimer(): void {
    if (this.globalTimer) {
      clearInterval(this.globalTimer);
      this.globalTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    console.log('[TicketStateManager] Timers stopped');
  }

  // Process all active tickets for state changes
  private async processTicketStates(): Promise<void> {
    try {
      // Get list of guilds this bot is in
      const botGuildIds = Array.from(this.client.guilds.cache.keys());
      
      // Get all active tickets that might need state updates - only for guilds this bot is in
      const tickets = await this.ticketService.prismaClient.ticket.findMany({
        where: {
          guildId: { in: botGuildIds }, // Only process tickets from guilds this bot is in
          state: {
            notIn: [TicketState.CLOSED, TicketState.RESOLVED]
          },
          deletedAt: null
        },
        include: {
          timers: {
            where: { active: true }
          }
        }
      });

      // Process tickets in batches to avoid overload
      const batchSize = 50;
      for (let i = 0; i < tickets.length; i += batchSize) {
        const batch = tickets.slice(i, i + batchSize);
        await Promise.all(batch.map(ticket => this.checkTicketState(ticket)));
      }
    } catch (error) {
      console.error('[TicketStateManager] Error processing ticket states:', error);
    }
  }

  // Check individual ticket state
  private async checkTicketState(ticket: any): Promise<void> {
    const config = await this.ticketService.getConfig(ticket.guildId);
    if (!config || !config.enabled) return;

    const now = Date.now();
    const timeSinceActivity = now - ticket.lastActivity.getTime();
    
    const timerConfig: TimerConfig = {
      idleThreshold: (config.warningHours - 6) * 60 * 60 * 1000, // 6 hours before warning
      warningThreshold: config.warningHours * 60 * 60 * 1000,
      autoCloseThreshold: config.autoCloseHours * 60 * 60 * 1000
    };

    // Check for auto-close
    if (timeSinceActivity >= timerConfig.autoCloseThreshold) {
      await this.autoCloseTicket(ticket);
      return;
    }

    // Check for warning
    if (timeSinceActivity >= timerConfig.warningThreshold && !ticket.warningsentAt) {
      await this.sendWarning(ticket);
      return;
    }

    // Check for idle state
    if (timeSinceActivity >= timerConfig.idleThreshold && ticket.activityState !== ActivityState.RED) {
      await this.ticketService.updateActivityState(ticket.id, ActivityState.RED);
    }
  }

  // Send warning before auto-close
  private async sendWarning(ticket: any): Promise<void> {
    try {
      const guild = this.client.guilds.cache.get(ticket.guildId);
      if (!guild) return;

      let channel;
      if (ticket.threadId) {
        channel = await guild.channels.fetch(ticket.threadId);
      } else {
        channel = await guild.channels.fetch(ticket.channelId);
      }

      if (!channel || !channel.isTextBased()) return;

      const config = await this.ticketService.getConfig(ticket.guildId);
      const hoursUntilClose = Math.ceil((config!.autoCloseHours - config!.warningHours));

      await channel.send({
        embeds: [{
          color: 0xFF6B6B,
          title: '⚠️ Inactivity Warning',
          description: `This ticket will be automatically closed in **${hoursUntilClose} hours** due to inactivity.\n\nPlease send a message if you still need assistance.`,
          timestamp: new Date().toISOString()
        }]
      });

      await this.ticketService.updateTicket(ticket.id, {
        warningsentAt: new Date()
      });

      // Update activity state to RED
      await this.ticketService.updateActivityState(ticket.id, ActivityState.RED);

      // Send DM to ticket creator if notifications are enabled
      const botConfig = JSON.parse(process.env.CONFIG || '{}');
      if (botConfig.ticketDMNotifications) {
        try {
          const creator = await this.client.users.fetch(ticket.creatorId);
          await creator.send({
            embeds: [{
              color: 0xFF6B6B,
              title: '⚠️ Ticket Inactivity Warning',
              description: `Your ticket #${ticket.ticketNumber} in ${guild.name} will be closed in ${hoursUntilClose} hours due to inactivity.`,
              fields: [
                {
                  name: 'Ticket',
                  value: `<#${ticket.threadId || ticket.channelId}>`,
                  inline: true
                }
              ]
            }]
          });
        } catch (err) {
          // User might have DMs disabled
        }
      }

      await this.ticketService.logAction(ticket.id, 'WARNING_SENT', 'SYSTEM', {
        hoursUntilClose
      });
    } catch (error) {
      console.error(`[TicketStateManager] Error sending warning for ticket ${ticket.id}:`, error);
    }
  }

  // Auto-close inactive ticket
  private async autoCloseTicket(ticket: any): Promise<void> {
    try {
      const guild = this.client.guilds.cache.get(ticket.guildId);
      if (!guild) return;

      // Send final message
      let channel;
      if (ticket.threadId) {
        channel = await guild.channels.fetch(ticket.threadId);
      } else {
        channel = await guild.channels.fetch(ticket.channelId);
      }

      if (channel && channel.isTextBased()) {
        await channel.send({
          embeds: [{
            color: 0xE74C3C,
            title: '🔒 Ticket Closed',
            description: 'This ticket has been automatically closed due to inactivity.',
            timestamp: new Date().toISOString()
          }]
        });

        // Lock the channel/thread
        if (channel.isThread()) {
          await channel.setLocked(true);
          await channel.setArchived(true);
        } else {
          // Update permissions to make it read-only
          await channel.permissionOverwrites.edit(ticket.creatorId, {
            SendMessages: false,
            AddReactions: false
          });
        }
      }

      // Update ticket state
      await this.ticketService.closeTicket(ticket.id, 'SYSTEM', 'Auto-closed due to inactivity');

      // Send DM to creator if notifications are enabled
      const botConfig = JSON.parse(process.env.CONFIG || '{}');
      if (botConfig.ticketDMNotifications) {
        try {
          const creator = await this.client.users.fetch(ticket.creatorId);
          await creator.send({
            embeds: [{
              color: 0xE74C3C,
              title: '🔒 Ticket Closed',
              description: `Your ticket #${ticket.ticketNumber} in ${guild.name} has been closed due to inactivity.`,
              footer: {
                text: 'If you need further assistance, please create a new ticket.'
              }
            }]
          });
        } catch (err) {
          // User might have DMs disabled
        }
      }
    } catch (error) {
      console.error(`[TicketStateManager] Error auto-closing ticket ${ticket.id}:`, error);
    }
  }

  // Handle message activity
  async handleMessageActivity(ticketId: string, authorId: string, isStaff: boolean): Promise<void> {
    const ticket = await this.ticketService.getTicket(ticketId);
    if (!ticket || ticket.state === TicketState.CLOSED) return;

    // Determine new activity state
    const newActivityState = isStaff ? ActivityState.GREEN : ActivityState.ORANGE;
    
    // Reset timers if there was a warning
    if (ticket.warningsentAt) {
      await this.ticketService.updateTicket(ticketId, {
        warningsentAt: null
      });
    }

    // Update activity state and last activity
    await this.ticketService.updateTicket(ticketId, {
      activityState: newActivityState,
      lastMessageFrom: authorId,
      lastActivity: new Date()
    });

    // Reset any active timers
    await this.ticketService.prismaClient.ticketTimer.updateMany({
      where: {
        ticketId,
        active: true
      },
      data: {
        lastReset: new Date()
      }
    });
  }

  // Get activity state color
  getActivityColor(state: ActivityState): number {
    switch (state) {
      case ActivityState.GRAY:
        return 0x808080; // Gray
      case ActivityState.ORANGE:
        return 0xFFA500; // Orange
      case ActivityState.GREEN:
        return 0x00FF00; // Green
      case ActivityState.RED:
        return 0xFF0000; // Red
      default:
        return 0x808080;
    }
  }

  // Get state emoji
  getStateEmoji(state: ActivityState): string {
    switch (state) {
      case ActivityState.GRAY:
        return '🕔';
      case ActivityState.ORANGE:
        return '🟡';
      case ActivityState.GREEN:
        return '🟢';
      case ActivityState.RED:
        return '🔴';
      default:
        return '⚪';
    }
  }

  // Create or update timer for a ticket
  async createTimer(ticketId: string, type: TimerType, threshold: number, ticketType: string): Promise<void> {
    await this.ticketService.prismaClient.ticketTimer.upsert({
      where: {
        ticketId_type: { ticketId, type }
      },
      update: {
        threshold,
        active: true,
        lastReset: new Date()
      },
      create: {
        ticketId,
        type,
        threshold,
        ticketType,
        active: true
      }
    });
  }

  // Check if user can create a new ticket (cooldown)
  async canCreateTicket(guildId: string, userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const config = await this.ticketService.getConfig(guildId);
    if (!config) {
      return { allowed: false, reason: 'Ticket system not configured' };
    }

    // Check active ticket limit
    const activeTickets = await this.ticketService.getUserActiveTickets(guildId, userId);
    if (activeTickets.length >= config.maxTicketsPerUser) {
      return { 
        allowed: false, 
        reason: `You already have ${activeTickets.length} active ticket(s). Maximum allowed: ${config.maxTicketsPerUser}` 
      };
    }

    // Check cooldown
    const lastTicket = await this.ticketService.prismaClient.ticket.findFirst({
      where: {
        guildId,
        creatorId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (lastTicket) {
      const timeSinceLastTicket = Date.now() - lastTicket.createdAt.getTime();
      const cooldownMs = config.cooldownMinutes * 60 * 1000;

      if (timeSinceLastTicket < cooldownMs) {
        const remainingMinutes = Math.ceil((cooldownMs - timeSinceLastTicket) / 60000);
        return {
          allowed: false,
          reason: `Please wait ${remainingMinutes} minute(s) before creating another ticket`
        };
      }
    }

    return { allowed: true };
  }

  // Cleanup soft-deleted tickets
  private async cleanupDeletedTickets(): Promise<void> {
    try {
      const deletedCount = await this.ticketService.cleanupDeletedTickets();
      if (deletedCount > 0) {
        console.log(`[TicketStateManager] Cleaned up ${deletedCount} soft-deleted tickets`);
      }
    } catch (error) {
      console.error('[TicketStateManager] Error cleaning up deleted tickets:', error);
    }
  }
}