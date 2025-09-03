import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BotsService } from './bots.service';

export interface TicketCategory {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  roleId?: string;
  maxTickets?: number;
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

export interface TicketData {
  categories: TicketCategory[];
  panels: TicketPanel[];
  tickets: any[];
}

@Injectable()
export class TicketService {
  constructor(
    private prisma: PrismaService,
    private botsService: BotsService
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
      tickets: ticketData.tickets || []
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
      ...category
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
      
      // Get guilds where this bot is active
      const guilds = await this.botsService.getBotGuilds(botId);
      const guildIds = guilds.map(g => g.id);
      
      // Get tickets from the tickets table
      const tickets = await this.prisma.$queryRawUnsafe(`
        SELECT 
          t.id,
          t.guild_id as guildId,
          t.ticket_number as number,
          t.channel_id as channelId,
          t.thread_id as threadId,
          t.creator_id as creatorId,
          t.assigned_staff_id as assignedStaffId,
          t.type,
          t.category as categoryName,
          t.priority,
          t.state,
          t.activityState,
          t.containerType,
          t.last_activity as lastActivity,
          t.created_at as createdAt,
          t.closed_at as closedAt,
          COUNT(DISTINCT tm.id) as messageCount,
          MIN(CASE WHEN tm.is_staff = true THEN UNIX_TIMESTAMP(tm.created_at) * 1000 - UNIX_TIMESTAMP(t.created_at) * 1000 END) as firstResponseTime,
          CASE WHEN t.state IN ('CLOSED', 'RESOLVED') THEN UNIX_TIMESTAMP(t.closed_at) * 1000 - UNIX_TIMESTAMP(t.created_at) * 1000 END as resolutionTime
        FROM tickets t
        LEFT JOIN ticket_messages tm ON t.id = tm.ticket_id
        WHERE t.guild_id IN (${guildIds.map(() => '?').join(',')})
          AND t.deleted_at IS NULL
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `, ...guildIds).catch(() => []);
      
      return tickets || [];
    } catch (error) {
      console.error('Error fetching tickets from database:', error);
      // Fallback to old method
      const data = await this.getTicketData(botId);
      return data.tickets.filter(t => t.state !== 'CLOSED');
    }
  }

  async closeTicket(botId: string, ticketId: string): Promise<void> {
    const data = await this.getTicketData(botId);
    const ticketIndex = data.tickets.findIndex(t => t.id === ticketId);
    
    if (ticketIndex !== -1) {
      data.tickets[ticketIndex].state = 'CLOSED';
      data.tickets[ticketIndex].closedAt = new Date().toISOString();
      await this.saveTicketData(botId, { tickets: data.tickets });
      
      // TODO: Close ticket channel in Discord
      this.closeTicketInDiscord(botId, data.tickets[ticketIndex]);
    }
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
}