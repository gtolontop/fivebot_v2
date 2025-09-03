import { Client } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { TicketPanelService } from './ticketPanel.service';

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
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(client: Client, prisma: PrismaClient, botId: string) {
    this.client = client;
    this.prisma = prisma;
    this.botId = botId;
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
      throw new Error('Ticket panel service not initialized');
    }

    const guild = this.client.guilds.cache.first();
    if (!guild) {
      throw new Error('Bot is not in any guild');
    }

    console.log(`[CommandService] Received panel data with ${data.categories?.length || 0} categories`);
    if (data.categories && data.categories.length > 0) {
      console.log(`[CommandService] Categories modal config:`);
      data.categories.forEach((cat: any, index: number) => {
        console.log(`  - Category ${index}: ${cat.name}`);
        console.log(`    useCustomModal: ${cat.useCustomModal}`);
        console.log(`    modalFields: ${cat.modalFields?.length || 0}`);
      });
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
    
    console.log(`[CommandService] Panel ${result ? 'sent successfully' : 'failed to send'} to #${data.channelId}`);
  }

  private async handleUpdateConfig(data: any) {
    // Reload configuration
    console.log('Config update requested:', data);
    // This would trigger a config reload in the bot
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
}