import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BotsService } from './bots.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { DiscordService } from '../common/discord/discord.service';

export interface TicketCategory {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  roleId?: string;
  active?: boolean;
  priority?: number;
  color?: string;
  requiredRoles?: string[];
  welcomeMessage?: string;
  useCustomModal?: boolean;
  modalTitle?: string;
  modalDescription?: string;
  modalFields?: {
    id: string;
    label: string;
    type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'NUMBER' | 'EMAIL' | 'URL';
    placeholder?: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    options?: { label: string; value: string }[];
    rows?: number;
  }[];
}

export interface TicketPanel {
  id: string;
  channelId: string;
  title: string;
  description: string;
  color: string;
  type: 'BUTTON' | 'DROPDOWN' | 'HYBRID';
  categories: string[];
  messageId?: string;
}

export interface TicketCommands {
  close: boolean;
  add: boolean;
  remove: boolean;
  claim: boolean;
  unclaim: boolean;
  lock: boolean;
  unlock: boolean;
  rename: boolean;
  transfer: boolean;
  priority: boolean;
}

export interface TicketData {
  categories: TicketCategory[];
  panels: TicketPanel[];
  tickets: any[];
  commands?: TicketCommands;
}

@Injectable()
export class TicketService {
  constructor(
    private prisma: PrismaService,
    private botsService: BotsService,
    private encryptionService: EncryptionService,
    private discordService: DiscordService
  ) {}

  private async getTicketData(botId: string): Promise<TicketData> {
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
      include: { config: true }
    });

    if (!bot?.config) {
      return { categories: [], panels: [], tickets: [] };
    }

    // Parse ticketData if it's a string
    let ticketData: any = {};
    if (typeof bot.config.ticketData === 'string') {
      try {
        ticketData = JSON.parse(bot.config.ticketData);
      } catch (e) {
        console.error('Failed to parse ticketData:', e);
        ticketData = {};
      }
    } else {
      ticketData = bot.config.ticketData || {};
    }

    return {
      categories: ticketData.categories || [],
      panels: ticketData.panels || [],
      tickets: ticketData.tickets || [],
      commands: ticketData.commands || this.getDefaultCommands()
    };
  }

  private async saveTicketData(botId: string, data: Partial<TicketData>): Promise<void> {
    const currentData = await this.getTicketData(botId);
    const updatedData = { ...currentData, ...data };

    await this.prisma.botConfig.update({
      where: { botId },
      data: {
        ticketData: JSON.stringify(updatedData)
      }
    });
  }

  // Categories
  async getCategories(botId: string): Promise<TicketCategory[]> {
    const data = await this.getTicketData(botId);
    return data.categories;
  }

  async createCategory(botId: string, category: Omit<TicketCategory, 'id'>): Promise<TicketCategory> {
    const data = await this.getTicketData(botId);
    const newCategory: TicketCategory = {
      id: Date.now().toString(),
      ...category,
      // Set active to true by default if not provided
      active: category.active !== undefined ? category.active : true
    };

    data.categories.push(newCategory);
    await this.saveTicketData(botId, { categories: data.categories });

    return newCategory;
  }

  async updateCategory(botId: string, categoryId: string, updates: Partial<TicketCategory>): Promise<TicketCategory> {
    const data = await this.getTicketData(botId);
    const categoryIndex = data.categories.findIndex(c => c.id === categoryId);
    
    if (categoryIndex === -1) {
      throw new Error('Category not found');
    }

    data.categories[categoryIndex] = { ...data.categories[categoryIndex], ...updates };
    await this.saveTicketData(botId, { categories: data.categories });
    
    return data.categories[categoryIndex];
  }

  async deleteCategory(botId: string, categoryId: string): Promise<void> {
    const data = await this.getTicketData(botId);
    data.categories = data.categories.filter(c => c.id !== categoryId);
    
    // Also remove category from panels
    data.panels.forEach(panel => {
      panel.categories = panel.categories.filter(id => id !== categoryId);
    });
    
    await this.saveTicketData(botId, data);
  }

  // Panels
  async getPanels(botId: string): Promise<TicketPanel[]> {
    const data = await this.getTicketData(botId);
    return data.panels;
  }

  async createPanel(botId: string, panel: Omit<TicketPanel, 'id'>): Promise<TicketPanel> {
    const data = await this.getTicketData(botId);
    const newPanel: TicketPanel = {
      id: Date.now().toString(),
      ...panel
    };
    
    data.panels.push(newPanel);
    await this.saveTicketData(botId, { panels: data.panels });
    
    // TODO: Send panel message to Discord channel
    this.sendPanelToDiscord(botId, newPanel);
    
    return newPanel;
  }

  async updatePanel(botId: string, panelId: string, updates: Partial<TicketPanel>): Promise<TicketPanel> {
    const data = await this.getTicketData(botId);
    const panelIndex = data.panels.findIndex(p => p.id === panelId);
    
    if (panelIndex === -1) {
      throw new Error('Panel not found');
    }

    data.panels[panelIndex] = { ...data.panels[panelIndex], ...updates };
    await this.saveTicketData(botId, { panels: data.panels });
    
    // TODO: Update panel message in Discord
    this.updatePanelInDiscord(botId, data.panels[panelIndex]);
    
    return data.panels[panelIndex];
  }

  async deletePanel(botId: string, panelId: string): Promise<void> {
    const data = await this.getTicketData(botId);
    const panel = data.panels.find(p => p.id === panelId);
    
    if (panel) {
      // TODO: Delete panel message from Discord
      this.deletePanelFromDiscord(botId, panel);
    }
    
    data.panels = data.panels.filter(p => p.id !== panelId);
    await this.saveTicketData(botId, { panels: data.panels });
  }

  // Tickets
  async getTickets(botId: string): Promise<any[]> {
    try {
      // First try to get real tickets from the database
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId }
      });
      
      if (!bot) {
        return [];
      }
      
      // Get guild IDs associated with this bot from Discord API
      let guildIds: string[] = [];
      try {
        const decryptedToken = this.encryptionService.decrypt(bot.tokenEncrypted);
        const guilds = await this.discordService.getBotGuilds(decryptedToken);
        guildIds = guilds.map(guild => guild.id);
        
        if (guildIds.length === 0) {
          return [];
        }
      } catch (error) {
        console.error('Error fetching bot guilds:', error);
        return [];
      }
      
      const placeholders = guildIds.map(() => '?').join(', ');

      const tickets = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT
          t.id,
          t.guild_id as "guildId",
          t.ticket_number as "ticketNumber",
          t.channel_id as "channelId",
          t.thread_id as "threadId",
          t.creator_id as "creatorId",
          t.type,
          t.category as "categoryId",
          t.category as "categoryName",
          t.priority,
          t.state,
          t.activity_state as "activityState",
          t.container_type as "containerType",
          t.last_activity as "lastActivity",
          t.created_at as "createdAt",
          t.closed_at as "closedAt",
          (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as "messageCount"
        FROM tickets t
        WHERE t.deleted_at IS NULL
          AND t.guild_id IN (${placeholders})
        ORDER BY t.created_at DESC
        LIMIT 100
      `, ...guildIds).catch((error) => {
        console.error('Error fetching tickets:', error);
        return [];
      });
      
      return tickets;
    } catch (error) {
      console.error('Error fetching tickets from database:', error);
      // Fallback to old method
      const data = await this.getTicketData(botId);
      return data.tickets.filter(t => t.state !== 'CLOSED');
    }
  }

  async closeTicket(botId: string, ticketId: string): Promise<void> {
    // Try to close ticket in database first
    try {
      const ticket = await this.prisma.$queryRaw`
        SELECT * FROM tickets WHERE id = ${ticketId} LIMIT 1
      ` as any[];

      if (ticket && ticket.length > 0) {
        // Update ticket in database
        await this.prisma.$executeRaw`
          UPDATE tickets
          SET state = 'CLOSED', closed_at = NOW()
          WHERE id = ${ticketId}
        `;

        // Send command to bot to close ticket in Discord
        await this.botsService.sendCommandToBot(botId, {
          action: 'CLOSE_TICKET',
          data: {
            ticketId: ticketId,
            reason: 'Closed from dashboard'
          }
        });

        return;
      }
    } catch (error) {
      console.error('Error closing ticket in database:', error);
    }

    // Fallback to JSON storage
    const data = await this.getTicketData(botId);
    const ticketIndex = data.tickets.findIndex(t => t.id === ticketId);

    if (ticketIndex !== -1) {
      data.tickets[ticketIndex].state = 'CLOSED';
      data.tickets[ticketIndex].closedAt = new Date().toISOString();
      await this.saveTicketData(botId, { tickets: data.tickets });

      // Send command to bot to close ticket in Discord
      await this.botsService.sendCommandToBot(botId, {
        action: 'CLOSE_TICKET',
        data: {
          ticketId: ticketId,
          reason: 'Closed from dashboard'
        }
      });
    }
  }

  async getTicketStats(botId: string): Promise<any> {
    try {
      // Check if tickets table exists
      const tableExists = await this.prisma.$queryRaw`
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'tickets' 
        LIMIT 1
      ` as any[];
      
      if (tableExists.length === 0) {
        return this.getDefaultTicketStats();
      }
      
      // Get bot to access Discord API
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId }
      });
      
      if (!bot) {
        return this.getDefaultTicketStats();
      }
      
      // Get guild IDs associated with this bot from Discord API
      let guildIds: string[] = [];
      try {
        const decryptedToken = this.encryptionService.decrypt(bot.tokenEncrypted);
        const guilds = await this.discordService.getBotGuilds(decryptedToken);
        guildIds = guilds.map(guild => guild.id);
        
        if (guildIds.length === 0) {
          return this.getDefaultTicketStats();
        }
      } catch (error) {
        console.error('Error fetching bot guilds:', error);
        return this.getDefaultTicketStats();
      }
      
      // Create placeholders for SQL IN clause
      const placeholders = guildIds.map(() => '?').join(', ');

      // Get ticket statistics filtered by guild_id
      const stats = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT
          COUNT(*) as totalTickets,
          COUNT(CASE WHEN state = 'OPEN' OR state = 'IN_PROGRESS' THEN 1 END) as openTickets,
          COUNT(CASE WHEN state = 'CLOSED' THEN 1 END) as closedTickets,
          COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as todayTickets
        FROM tickets
        WHERE deleted_at IS NULL
          AND guild_id IN (${placeholders})
      `, ...guildIds);

      // Get message count and average response time
      const messageStats = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT
          COUNT(DISTINCT tm.id) as totalMessages,
          AVG(CASE
            WHEN tm.is_staff = 1 AND tm.message_number > 1
            THEN TIMESTAMPDIFF(SECOND, t.created_at, tm.created_at)
          END) as avgResponseTime
        FROM tickets t
        LEFT JOIN ticket_messages tm ON t.id = tm.ticket_id
        WHERE t.deleted_at IS NULL
          AND t.guild_id IN (${placeholders})
      `, ...guildIds);

      // Get average resolution time
      const resolutionStats = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT
          AVG(TIMESTAMPDIFF(HOUR, created_at, closed_at)) as avgResolutionTime
        FROM tickets
        WHERE deleted_at IS NULL
          AND state = 'CLOSED'
          AND closed_at IS NOT NULL
          AND guild_id IN (${placeholders})
      `, ...guildIds);
      
      // Get satisfaction score (if feedback exists)
      const satisfactionStats = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          AVG(CASE 
            WHEN feedback_rating IS NOT NULL 
            THEN feedback_rating * 20 
          END) as satisfactionScore
        FROM tickets
        WHERE deleted_at IS NULL
          AND feedback_rating IS NOT NULL
          AND guild_id IN (${placeholders})
      `, ...guildIds);
      
      const result = stats[0] || {};
      const msgResult = messageStats[0] || {};
      const resResult = resolutionStats[0] || {};
      const satResult = satisfactionStats[0] || {};
      
      return {
        totalTickets: parseInt(result.totalTickets) || 0,
        openTickets: parseInt(result.openTickets) || 0,
        closedTickets: parseInt(result.closedTickets) || 0,
        todayTickets: parseInt(result.todayTickets) || 0,
        totalMessages: parseInt(msgResult.totalMessages) || 0,
        avgResponseTime: msgResult.avgResponseTime ? 
          this.formatTime(parseFloat(msgResult.avgResponseTime)) : 'N/A',
        avgResolutionTime: resResult.avgResolutionTime ? 
          `${Math.round(parseFloat(resResult.avgResolutionTime))}h` : 'N/A',
        satisfactionScore: satResult.satisfactionScore ? 
          Math.round(parseFloat(satResult.satisfactionScore)) : 0,
      };
      
    } catch (error) {
      console.error('Error getting ticket stats:', error);
      return this.getDefaultTicketStats();
    }
  }
  
  private getDefaultTicketStats() {
    return {
      totalTickets: 0,
      openTickets: 0,
      closedTickets: 0,
      todayTickets: 0,
      totalMessages: 0,
      avgResponseTime: 'N/A',
      avgResolutionTime: 'N/A',
      satisfactionScore: 0,
    };
  }
  
  private formatTime(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  }

  // Public method to send panel
  async sendPanel(botId: string, panelId: string): Promise<{ success: boolean; message?: string }> {
    const data = await this.getTicketData(botId);
    const panel = data.panels.find(p => p.id === panelId);
    
    if (!panel) {
      throw new Error('Panel not found');
    }
    
    try {
      await this.sendPanelToDiscord(botId, panel);
      return { success: true, message: 'Panel sent successfully' };
    } catch (error) {
      console.error('Error sending panel:', error);
      
      // Provide user-friendly error messages
      let message = 'Failed to send panel';
      if (error.message === 'Bot is not online') {
        message = 'Cannot send panel: Bot is offline. Please start the bot first.';
      } else if (error.message) {
        message = error.message;
      }
      
      return { success: false, message };
    }
  }

  // Discord communication methods (to be implemented)
  private async sendPanelToDiscord(botId: string, panel: TicketPanel): Promise<void> {
    // Send command to bot process to create panel in Discord
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId }
    });
    
    if (!bot) {
      throw new Error('Bot not found');
    }
    
    // Get full category data for the selected category IDs
    const data = await this.getTicketData(botId);
    const selectedCategories = data.categories.filter(cat => 
      panel.categories.includes(cat.id)
    );
    
    // Send command to bot process via WebSocket or other communication method
    await this.botsService.sendCommandToBot(botId, {
      action: 'SEND_TICKET_PANEL',
      data: {
        ...panel,
        categories: selectedCategories
      }
    });
  }

  private async updatePanelInDiscord(botId: string, panel: TicketPanel): Promise<void> {
    // TODO: Update panel message in Discord
    console.log(`TODO: Update panel ${panel.id} in Discord`);
  }

  private async deletePanelFromDiscord(botId: string, panel: TicketPanel): Promise<void> {
    // TODO: Delete panel message from Discord
    console.log(`TODO: Delete panel ${panel.id} from Discord`);
  }

  private async closeTicketInDiscord(botId: string, ticket: any): Promise<void> {
    // TODO: Close ticket channel in Discord
    console.log(`TODO: Close ticket ${ticket.id} in Discord`);
  }

  // Commands Management
  private getDefaultCommands(): TicketCommands {
    return {
      close: true,
      add: true,
      remove: true,
      claim: true,
      unclaim: true,
      lock: true,
      unlock: true,
      rename: true,
      transfer: true,
      priority: true
    };
  }

  async getCommands(botId: string): Promise<TicketCommands> {
    const data = await this.getTicketData(botId);
    return data.commands || this.getDefaultCommands();
  }

  async updateCommands(botId: string, commands: Partial<TicketCommands>): Promise<TicketCommands> {
    const data = await this.getTicketData(botId);
    const updatedCommands = { ...data.commands, ...commands };
    await this.saveTicketData(botId, { commands: updatedCommands });
    return updatedCommands;
  }

  // Ticket Actions via Bot Commands
  async renameTicket(botId: string, ticketId: string, name: string): Promise<void> {
    await this.botsService.sendCommandToBot(botId, {
      action: 'RENAME_TICKET',
      data: { ticketId, name }
    });
  }

  async claimTicket(botId: string, ticketId: string): Promise<void> {
    await this.botsService.sendCommandToBot(botId, {
      action: 'CLAIM_TICKET',
      data: { ticketId }
    });
  }

  async unclaimTicket(botId: string, ticketId: string): Promise<void> {
    await this.botsService.sendCommandToBot(botId, {
      action: 'UNCLAIM_TICKET',
      data: { ticketId }
    });
  }

  async lockTicket(botId: string, ticketId: string): Promise<void> {
    await this.botsService.sendCommandToBot(botId, {
      action: 'LOCK_TICKET',
      data: { ticketId }
    });
  }

  async unlockTicket(botId: string, ticketId: string): Promise<void> {
    await this.botsService.sendCommandToBot(botId, {
      action: 'UNLOCK_TICKET',
      data: { ticketId }
    });
  }

  async addUserToTicket(botId: string, ticketId: string, userId: string): Promise<void> {
    await this.botsService.sendCommandToBot(botId, {
      action: 'ADD_USER_TO_TICKET',
      data: { ticketId, userId }
    });
  }

  async removeUserFromTicket(botId: string, ticketId: string, userId: string): Promise<void> {
    await this.botsService.sendCommandToBot(botId, {
      action: 'REMOVE_USER_FROM_TICKET',
      data: { ticketId, userId }
    });
  }

  async changeTicketPriority(botId: string, ticketId: string, priority: string): Promise<void> {
    await this.botsService.sendCommandToBot(botId, {
      action: 'CHANGE_TICKET_PRIORITY',
      data: { ticketId, priority }
    });
  }

  async deleteTicket(botId: string, ticketId: string): Promise<void> {
    await this.botsService.sendCommandToBot(botId, {
      action: 'DELETE_TICKET',
      data: { ticketId }
    });
  }
}