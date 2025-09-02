import { 
  Ticket, 
  TicketConfig, 
  TicketMessage, 
  TicketParticipant, 
  TicketLog,
  TicketState,
  ActivityState,
  ContainerType,
  TicketPriority,
  ParticipantRole,
  AssignmentModel,
  TicketCategory as PrismaTicketCategory,
  TicketPanel as PrismaTicketPanel
} from '@prisma/client';
import { prisma } from '../lib/database';
import { Client, Guild, GuildMember, TextChannel, ThreadChannel, User } from 'discord.js';
import { parseTicketConfig, TicketConfigWithArrays } from '../utils/ticketConfigHelpers';

// Export types for other services
export { TicketConfigWithArrays } from '../utils/ticketConfigHelpers';

// Export interfaces used by other services
export interface TicketCategory {
  id: string;
  name: string;
  emoji?: string | null;
  description?: string | null;
  staffRoleId?: string | null;
  channelId?: string | null;
  order?: number | null;
  active: boolean;
}

export interface TicketPanel {
  id: string;
  messageId?: string | null;
  active: boolean;
}

export interface TicketData extends Ticket {
  messages: TicketMessage[];
  participants: TicketParticipant[];
  timers: any[];
}

export class TicketService {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  // Get prisma instance for other services
  get prismaClient() {
    return prisma;
  }

  // Configuration Management
  async getConfig(guildId: string): Promise<TicketConfigWithArrays | null> {
    const config = await prisma.ticketConfig.findUnique({
      where: { guildId },
      include: {
        categories: {
          where: { active: true },
          orderBy: { order: 'asc' }
        },
        panels: {
          where: { active: true }
        }
      }
    });
    
    return config ? parseTicketConfig(config) : null;
  }

  async createConfig(guildId: string, data?: Partial<TicketConfigWithArrays>): Promise<TicketConfigWithArrays> {
    const { categories, panels, ...configData } = data || {};
    const config = await prisma.ticketConfig.create({
      data: {
        guildId,
        ...configData
      }
    });
    return parseTicketConfig(config);
  }

  async updateConfig(guildId: string, data: Partial<TicketConfigWithArrays>): Promise<TicketConfigWithArrays> {
    const { categories, panels, ...configData } = data;
    const config = await prisma.ticketConfig.update({
      where: { guildId },
      data: configData
    });
    return parseTicketConfig(config);
  }

  // Ticket CRUD Operations
  async createTicket(data: {
    guildId: string;
    creatorId: string;
    type?: string;
    category?: string;
    priority?: TicketPriority;
    containerType?: ContainerType;
    channelId: string;
    threadId?: string;
  }): Promise<Ticket> {
    const config = await this.getConfig(data.guildId);
    if (!config) {
      throw new Error('Ticket system not configured for this guild');
    }

    // Get the next ticket number
    const lastTicket = await prisma.ticket.findFirst({
      where: { guildId: data.guildId },
      orderBy: { ticketNumber: 'desc' }
    });
    
    const ticketNumber = (lastTicket?.ticketNumber || config.startingNumber - 1) + 1;

    // Create the ticket
    const ticket = await prisma.ticket.create({
      data: {
        guildId: data.guildId,
        ticketNumber,
        creatorId: data.creatorId,
        type: data.type || 'support',
        category: data.category,
        priority: data.priority || TicketPriority.NORMAL,
        containerType: data.containerType || config.containerType,
        channelId: data.channelId,
        threadId: data.threadId,
        state: TicketState.NEW,
        activityState: ActivityState.GRAY
      }
    });

    // Add creator as participant
    await prisma.ticketParticipant.create({
      data: {
        ticketId: ticket.id,
        userId: data.creatorId,
        role: ParticipantRole.CREATOR
      }
    });

    // Log creation
    await this.logAction(ticket.id, 'TICKET_CREATED', data.creatorId, {
      type: data.type,
      category: data.category
    });

    return ticket;
  }

  async getTicket(ticketId: string): Promise<TicketData | null> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        participants: {
          where: { leftAt: null }
        },
        timers: {
          where: { active: true }
        }
      }
    });
    
    return ticket as TicketData | null;
  }

  async getTicketByChannel(channelId: string): Promise<Ticket | null> {
    return await prisma.ticket.findFirst({
      where: {
        OR: [
          { channelId },
          { threadId: channelId }
        ],
        state: { not: TicketState.CLOSED },
        deletedAt: null
      }
    });
  }

  async getUserActiveTickets(guildId: string, userId: string): Promise<Ticket[]> {
    return await prisma.ticket.findMany({
      where: {
        guildId,
        creatorId: userId,
        state: { not: TicketState.CLOSED },
        deletedAt: null
      }
    });
  }

  async updateTicket(ticketId: string, data: any): Promise<Ticket> {
    // Remove fields that shouldn't be updated directly
    const { id, guildId, ticketNumber, createdAt, ...updateData } = data;
    
    return await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });
  }

  async closeTicket(ticketId: string, closedBy: string, reason?: string): Promise<Ticket> {
    const ticket = await this.updateTicket(ticketId, {
      state: TicketState.CLOSED,
      closedAt: new Date()
    });

    await this.logAction(ticketId, 'TICKET_CLOSED', closedBy, { reason });
    
    // Deactivate all timers
    await prisma.ticketTimer.updateMany({
      where: { ticketId, active: true },
      data: { active: false }
    });

    return ticket;
  }

  async deleteTicket(ticketId: string, deletedBy: string, reason?: string): Promise<Ticket> {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found');

    // Soft delete with backup
    const backupData = {
      ticket,
      messages: await prisma.ticketMessage.findMany({ where: { ticketId } }),
      participants: await prisma.ticketParticipant.findMany({ where: { ticketId } }),
      logs: await prisma.ticketLog.findMany({ where: { ticketId } })
    };

    return await this.updateTicket(ticketId, {
      deletedAt: new Date(),
      deletedBy,
      deletionReason: reason,
      permanentDeleteAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      backupData: backupData as any
    });
  }

  // Message Tracking
  async addMessage(data: {
    ticketId: string;
    messageId: string;
    authorId: string;
    content: string;
    isStaff: boolean;
    attachments?: any;
  }): Promise<TicketMessage> {
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: data.ticketId,
        messageId: data.messageId,
        authorId: data.authorId,
        content: data.content,
        isStaff: data.isStaff,
        attachments: data.attachments
      }
    });

    // Update activity state based on who sent the message
    const ticket = await this.getTicket(data.ticketId);
    if (ticket && ticket.state !== TicketState.CLOSED) {
      const newActivityState = data.isStaff ? ActivityState.GREEN : ActivityState.ORANGE;
      await this.updateTicket(data.ticketId, {
        activityState: newActivityState,
        lastMessageFrom: data.authorId,
        lastActivity: new Date()
      });
    }

    return message;
  }

  // Participant Management
  async addParticipant(ticketId: string, userId: string, role: ParticipantRole): Promise<void> {
    await prisma.ticketParticipant.upsert({
      where: {
        ticketId_userId: { ticketId, userId }
      },
      update: {
        leftAt: null,
        role
      },
      create: {
        ticketId,
        userId,
        role
      }
    });
  }

  async removeParticipant(ticketId: string, userId: string): Promise<void> {
    await prisma.ticketParticipant.update({
      where: {
        ticketId_userId: { ticketId, userId }
      },
      data: {
        leftAt: new Date()
      }
    });
  }

  async isStaff(guildId: string, userId: string): Promise<boolean> {
    const config = await this.getConfig(guildId);
    if (!config || config.staffRoles.length === 0) return false;

    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return false;

    try {
      const member = await guild.members.fetch(userId);
      return config.staffRoles.some(roleId => member.roles.cache.has(roleId));
    } catch {
      return false;
    }
  }

  // Assignment Management
  async assignTicket(ticketId: string, staffId: string, assignedBy: string): Promise<Ticket> {
    const ticket = await this.updateTicket(ticketId, {
      assignedStaffId: staffId,
      state: TicketState.IN_PROGRESS
    });

    await this.addParticipant(ticketId, staffId, ParticipantRole.STAFF);
    await this.logAction(ticketId, 'TICKET_ASSIGNED', assignedBy, { staffId });

    return ticket;
  }

  async unassignTicket(ticketId: string, unassignedBy: string): Promise<Ticket> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket || !ticket.assignedStaffId) throw new Error('Ticket not assigned');

    const updatedTicket = await this.updateTicket(ticketId, {
      assignedStaffId: null,
      state: TicketState.OPEN
    });

    await this.logAction(ticketId, 'TICKET_UNASSIGNED', unassignedBy, {
      previousStaff: ticket.assignedStaffId
    });

    return updatedTicket;
  }

  // Activity State Management
  async updateActivityState(ticketId: string, state: ActivityState): Promise<void> {
    await this.updateTicket(ticketId, {
      activityState: state,
      lastActivity: new Date()
    });

    if (state === ActivityState.RED) {
      await this.updateTicket(ticketId, {
        warningsentAt: new Date()
      });
    }
  }

  // Logging
  async logAction(ticketId: string, action: string, performedBy: string, details?: any): Promise<void> {
    await prisma.ticketLog.create({
      data: {
        ticketId,
        action,
        performedBy,
        details
      }
    });
  }

  // Channel/Thread Name Generation
  generateChannelName(pattern: string, variables: Record<string, any>): string {
    let name = pattern;
    
    for (const [key, value] of Object.entries(variables)) {
      name = name.replace(`{${key}}`, String(value));
    }

    // Sanitize for Discord channel names
    return this.sanitizeChannelName(name);
  }

  private sanitizeChannelName(text: string, maxLength: number = 50): string {
    const safeLength = Math.min(maxLength, 93);
    
    const sanitized = text
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/--+/g, '-')
      .substring(0, safeLength)
      .replace(/^-|-$/g, '');

    if (!sanitized) {
      return `ticket-${Math.random().toString(36).substr(2, 6)}`;
    }

    return sanitized;
  }

  // UUID Generation
  generateShortUUID(): string {
    return Math.random().toString(36).substr(2, 6);
  }

  generateMediumUUID(): string {
    return Date.now().toString(36);
  }

  // Category Management
  async createCategory(guildId: string, configId: string, data: {
    name: string;
    emoji?: string;
    description?: string;
    staffRoleId?: string;
    channelId?: string;
    order?: number;
  }): Promise<PrismaTicketCategory> {
    return await prisma.ticketCategory.create({
      data: {
        guildId,
        configId,
        ...data
      }
    });
  }

  async updateCategory(categoryId: string, data: Partial<PrismaTicketCategory>): Promise<PrismaTicketCategory> {
    return await prisma.ticketCategory.update({
      where: { id: categoryId },
      data
    });
  }

  // Panel Management
  async createPanel(guildId: string, configId: string, data: {
    channelId: string;
    type: 'BUTTON' | 'DROPDOWN' | 'HYBRID';
    embedData: any;
    components: any;
  }): Promise<PrismaTicketPanel> {
    return await prisma.ticketPanel.create({
      data: {
        guildId,
        configId,
        ...data
      }
    });
  }

  async updatePanel(panelId: string, data: any): Promise<PrismaTicketPanel> {
    // Remove fields that shouldn't be updated directly
    const { id, guildId, configId, createdAt, ...updateData } = data;
    
    return await prisma.ticketPanel.update({
      where: { id: panelId },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });
  }

  // Cleanup soft-deleted tickets
  async cleanupDeletedTickets(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const deleted = await prisma.ticket.deleteMany({
      where: {
        deletedAt: { lt: sevenDaysAgo },
        permanentDeleteAt: { lt: new Date() }
      }
    });

    return deleted.count;
  }
}