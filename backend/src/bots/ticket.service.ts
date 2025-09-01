import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BotsService } from './bots.service';

interface TicketCategory {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  roleId?: string;
  maxTickets?: number;
}

interface TicketPanel {
  id: string;
  channelId: string;
  title: string;
  description: string;
  color: string;
  type: 'BUTTON' | 'DROPDOWN' | 'HYBRID';
  categories: string[];
  messageId?: string;
}

interface TicketData {
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

    const ticketData = (bot.config as any).ticketData || {};
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
        ticketData: updatedData as any
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
    const data = await this.getTicketData(botId);
    // Return only active tickets
    return data.tickets.filter(t => t.state !== 'CLOSED');
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

  // Discord communication methods (to be implemented)
  private async sendPanelToDiscord(botId: string, panel: TicketPanel): Promise<void> {
    // TODO: Send panel message to Discord via bot process
    console.log(`TODO: Send panel ${panel.id} to Discord channel ${panel.channelId}`);
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