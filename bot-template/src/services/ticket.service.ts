import {
  Ticket,
  TicketConfig,
  TicketMessage,
  TicketParticipant,
  TicketLog,
  TicketCategory as PrismaTicketCategory,
  TicketPanel as PrismaTicketPanel,
  TicketPriority,
  ContainerType
} from '@prisma/client';

// Additional type definitions
type TicketState = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ARCHIVED';
type ParticipantRole = 'CREATOR' | 'STAFF' | 'OBSERVER';
type AssignmentModel = 'COLLABORATIVE' | 'ASSIGNED';
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
  spawnCategoryId?: string | null;
  order?: number | null;
  active: boolean;
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
      where: { guildId }
    });

    if (!config) return null;

    // Load categories from JSON field
    let jsonCategories: TicketCategory[] = [];
    if (config.categories) {
      try {
        jsonCategories = JSON.parse(config.categories);
      } catch {
        jsonCategories = [];
      }
    }

    // Also load categories from TicketCategory table and merge
    const dbCategories = await prisma.ticketCategory.findMany({
      where: { guildId }
    });

    // Merge DB categories with JSON categories (DB takes priority for same ID)
    const categoryMap = new Map<string, TicketCategory>();

    // Add JSON categories first
    for (const cat of jsonCategories) {
      categoryMap.set(cat.id, cat);
    }

    // Add/override with DB categories
    for (const dbCat of dbCategories) {
      const existing = categoryMap.get(dbCat.id);
      categoryMap.set(dbCat.id, {
        ...(existing || {}),
        id: dbCat.id,
        name: dbCat.name,
        emoji: dbCat.emoji,
        active: dbCat.active,
      });
    }

    const mergedCategories = Array.from(categoryMap.values());

    // Parse JSON fields and transform data
    const parsed: any = {
      ...config,
      categories: mergedCategories,
      panels: config.panels ? JSON.parse(config.panels) : [],
      // Load staff roles from JSON array, or fallback to single staffRoleId
      staffRoles: (() => {
        const roles: string[] = [];
        // First, try to load from staffRoles JSON array
        if (config.staffRoles) {
          const parsed = Array.isArray(config.staffRoles) ? config.staffRoles : [];
          roles.push(...parsed.filter(r => typeof r === 'string'));
        }
        // Fallback to legacy staffRoleId field
        if (config.staffRoleId && !roles.includes(config.staffRoleId)) {
          roles.push(config.staffRoleId);
        }
        return roles;
      })(),
      allowedFileTypes: [],
      // Map categoryId to supportCategoryId for validation
      supportCategoryId: config.supportCategoryId || config.categoryId,
      // Map namingFormat to namingPattern for consistency
      namingPattern: config.namingPattern || config.namingFormat || 'ticket-{counter}',
      // Map maxTickets to maxTicketsPerUser
      maxTicketsPerUser: config.maxTicketsPerUser || config.maxTickets || 3,
      // Set default container type if not set
      containerType: config.containerType || 'CHANNEL' as any
    };

    return parsed;
  }

  async createConfig(guildId: string, data?: Partial<TicketConfigWithArrays>): Promise<TicketConfigWithArrays> {
    const { categories, panels, ...configData } = data || {};

    // Ensure botId is provided
    if (!configData.botId) {
      throw new Error('botId is required to create ticket config');
    }

    const config = await prisma.ticketConfig.create({
      data: {
        guildId,
        botId: configData.botId,
        ...configData,
        categories: categories ? JSON.stringify(categories) : null,
        panels: panels ? JSON.stringify(panels) : null
      }
    });

    return {
      ...config,
      staffRoles: [],
      allowedFileTypes: [],
      categories: categories || [],
      panels: panels || []
    };
  }

  async updateConfig(guildId: string, data: Partial<TicketConfigWithArrays>): Promise<TicketConfigWithArrays> {
    const { categories, panels, ...configData } = data;

    const updateData: any = { ...configData };
    if (categories !== undefined) {
      updateData.categories = JSON.stringify(categories);
    }
    if (panels !== undefined) {
      updateData.panels = JSON.stringify(panels);
    }

    const config = await prisma.ticketConfig.update({
      where: { guildId },
      data: updateData
    });

    return {
      ...config,
      staffRoles: [],
      allowedFileTypes: [],
      categories: config.categories ? JSON.parse(config.categories as string) : [],
      panels: config.panels ? JSON.parse(config.panels as string) : []
    } as TicketConfigWithArrays;
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

    const ticketNumber = (lastTicket?.ticketNumber || 0) + 1;

    // Create the ticket
    const ticket = await prisma.ticket.create({
      data: {
        guildId: data.guildId,
        ticketNumber,
        creatorId: data.creatorId,
        type: data.type || 'support',
        category: data.category,
        priority: data.priority || 'NORMAL',
        containerType: data.containerType || config.containerType,
        channelId: data.channelId,
        threadId: data.threadId,
        state: 'OPEN',
        activityState: 'ACTIVE'
      }
    });

    // Add creator as participant
    await prisma.ticketParticipant.create({
      data: {
        ticketId: ticket.id,
        userId: data.creatorId,
        role: 'CREATOR'
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
          where: { removedAt: null }
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
        state: { not: 'CLOSED' },
        deletedAt: null
      }
    });
  }

  async getUserActiveTickets(guildId: string, userId: string): Promise<Ticket[]> {
    return await prisma.ticket.findMany({
      where: {
        guildId,
        creatorId: userId,
        state: { not: 'CLOSED' },
        deletedAt: null
      }
    });
  }

  async updateTicket(ticketId: string, data: any): Promise<Ticket> {
    // Remove fields that shouldn't be updated directly
    const { id, guildId, ticketNumber, createdAt, ...updateData } = data;

    return await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData
    });
  }

  async closeTicket(ticketId: string, closedBy: string, reason?: string): Promise<Ticket> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { messages: true }
    });

    if (!ticket) throw new Error('Ticket not found');

    // Update ticket state
    const updatedTicket = await this.updateTicket(ticketId, {
      state: 'CLOSED',
      closedAt: new Date()
    });

    await this.logAction(ticketId, 'TICKET_CLOSED', closedBy, { reason });

    // Generate and send transcript based on configuration
    const config = await this.getConfig(ticket.guildId);
    const client = (global as any).discordClient;

    // Only generate transcript if autoSaveTranscripts or sendTranscriptToUser is enabled
    if (client && (config?.autoSaveTranscripts || config?.sendTranscriptToUser)) {
      try {
        const messages = ticket.messages || [];

        // Build transcript text
        let transcript = `Ticket #${ticket.ticketNumber} Transcript\n`;
        transcript += `Creator: <@${ticket.creatorId}>\n`;
        transcript += `Closed by: ${closedBy}\n`;
        transcript += `Reason: ${reason || 'No reason provided'}\n`;
        transcript += `Created: ${new Date(ticket.createdAt).toLocaleString()}\n`;
        transcript += `Closed: ${new Date().toLocaleString()}\n\n`;
        transcript += '='.repeat(50) + '\n\n';

        for (const msg of messages.reverse()) {
          const timestamp = new Date(msg.createdAt).toLocaleString();
          transcript += `[${timestamp}] ${msg.authorId}: ${msg.content}\n`;

          // Include attachments URLs if configured
          if (config?.includeAttachments && msg.attachments) {
            try {
              const attachments = typeof msg.attachments === 'string'
                ? JSON.parse(msg.attachments)
                : msg.attachments;

              if (Array.isArray(attachments) && attachments.length > 0) {
                transcript += `  📎 Attachments:\n`;
                attachments.forEach((att: any) => {
                  transcript += `    - ${att.url || att}\n`;
                });
              }
            } catch (e) {
              transcript += `  📎 [Attachments]\n`;
            }
          }
          transcript += '\n';
        }

        const buffer = Buffer.from(transcript, 'utf-8');

        // Send to transcript channel if autoSaveTranscripts is enabled
        if (config?.autoSaveTranscripts && config?.transcriptChannelId) {
          try {
            const transcriptChannel = await client.channels.fetch(config.transcriptChannelId);
            if (transcriptChannel?.isTextBased()) {
              await transcriptChannel.send({
                embeds: [{
                  color: 0x5865f2,
                  title: `📋 Ticket #${ticket.ticketNumber} Closed`,
                  fields: [
                    { name: 'Creator', value: `<@${ticket.creatorId}>`, inline: true },
                    { name: 'Closed By', value: closedBy, inline: true },
                    { name: 'Reason', value: reason || 'No reason provided', inline: false },
                    { name: 'Messages', value: messages.length.toString(), inline: true },
                    { name: 'Duration', value: `${Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 60000)} minutes`, inline: true }
                  ],
                  timestamp: new Date().toISOString()
                }],
                files: [{
                  attachment: buffer,
                  name: `ticket-${ticket.ticketNumber}-transcript.txt`
                }]
              });
              console.log(`[TicketService] Transcript sent to channel for ticket #${ticket.ticketNumber}`);
            }
          } catch (channelError) {
            console.error('[TicketService] Error sending transcript to channel:', channelError);
          }
        }

        // Send to user via DM if sendTranscriptToUser is enabled
        if (config?.sendTranscriptToUser) {
          try {
            const user = await client.users.fetch(ticket.creatorId);
            if (user) {
              await user.send({
                embeds: [{
                  color: 0x5865f2,
                  title: `📋 Your Ticket #${ticket.ticketNumber} Has Been Closed`,
                  description: `Your ticket has been closed. Here's a transcript of your conversation.`,
                  fields: [
                    { name: 'Closed By', value: closedBy, inline: true },
                    { name: 'Reason', value: reason || 'No reason provided', inline: false },
                    { name: 'Duration', value: `${Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 60000)} minutes`, inline: true }
                  ],
                  timestamp: new Date().toISOString()
                }],
                files: [{
                  attachment: buffer,
                  name: `ticket-${ticket.ticketNumber}-transcript.txt`
                }]
              });
              console.log(`[TicketService] Transcript sent to user ${ticket.creatorId} for ticket #${ticket.ticketNumber}`);
            }
          } catch (dmError) {
            console.error('[TicketService] Error sending transcript to user DM:', dmError);
            // Don't fail if user has DMs disabled
          }
        }
      } catch (transcriptError) {
        console.error('[TicketService] Error generating transcript:', transcriptError);
      }
    }

    // Delete the channel after a delay (5 seconds)
    setTimeout(async () => {
      try {
        const { Client } = await import('discord.js');
        const client = (global as any).discordClient;

        if (client) {
          const channelId = ticket.channelId || ticket.threadId;
          if (channelId) {
            const channel = await client.channels.fetch(channelId);
            if (channel && 'delete' in channel) {
              await (channel as any).delete();
              console.log(`[TicketService] Channel deleted for ticket #${ticket.ticketNumber}`);
            }
          }
        }
      } catch (deleteError) {
        console.error('[TicketService] Error deleting channel:', deleteError);
      }
    }, 5000);

    return updatedTicket;
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
      deletedAt: new Date()
      // Note: deletedBy, deletionReason, permanentDeleteAt, backupData fields don't exist in schema
      // Add them to Ticket model if you need them for tracking deleted tickets
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
        userId: data.authorId,
        authorId: data.authorId,
        content: data.content,
        isStaff: data.isStaff
      }
    });

    // Update activity state based on who sent the message
    const ticket = await this.getTicket(data.ticketId);
    if (ticket && ticket.state !== 'CLOSED') {
      // Map to valid ActivityState values from the schema
      const newActivityState = data.isStaff ? 'ACTIVE' : 'WARNING';
      await this.updateTicket(data.ticketId, {
        activityState: newActivityState,
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
      state: 'IN_PROGRESS'
    });

    await this.addParticipant(ticketId, staffId, 'STAFF');
    await this.logAction(ticketId, 'TICKET_ASSIGNED', assignedBy, { staffId });

    return ticket;
  }

  async unassignTicket(ticketId: string, unassignedBy: string): Promise<Ticket> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket || !ticket.assignedStaffId) throw new Error('Ticket not assigned');

    const updatedTicket = await this.updateTicket(ticketId, {
      assignedStaffId: null,
      state: 'OPEN'
    });

    await this.logAction(ticketId, 'TICKET_UNASSIGNED', unassignedBy, {
      previousStaff: ticket.assignedStaffId
    });

    return updatedTicket;
  }

  // Activity State Management
  async updateActivityState(ticketId: string, state: string): Promise<void> {
    await this.updateTicket(ticketId, {
      activityState: state,
      lastActivity: new Date()
    });

    if (state === 'RED') {
      await this.updateTicket(ticketId, {
        warningSentAt: new Date()
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
        details: details ? JSON.stringify(details) : null
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
    botId?: string;
  }): Promise<PrismaTicketCategory> {
    return await prisma.ticketCategory.create({
      data: {
        guildId,
        botId: data.botId || configId, // Use botId if provided, otherwise use configId as botId
        name: data.name,
        emoji: data.emoji,
        active: true
      }
    });
  }

  async updateCategory(categoryId: string, data: Partial<PrismaTicketCategory>): Promise<PrismaTicketCategory> {
    return await prisma.ticketCategory.update({
      where: { id: categoryId },
      data: data as any
    });
  }

  // Panel Management
  async createPanel(guildId: string, configId: string, data: {
    channelId: string;
    type: 'BUTTON' | 'DROPDOWN' | 'HYBRID';
    embedData: any;
    components: any;
    botId?: string;
  }): Promise<PrismaTicketPanel> {
    return await prisma.ticketPanel.create({
      data: {
        guildId,
        botId: data.botId || configId, // Use botId if provided, otherwise use configId as botId
        channelId: data.channelId,
        type: data.type,
        config: data.embedData,
        active: true
      }
    });
  }

  async updatePanel(panelId: string, data: any): Promise<PrismaTicketPanel> {
    // Remove fields that shouldn't be updated directly
    const { id, guildId, botId, createdAt, ...updateData } = data;
    
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
        deletedAt: { lt: sevenDaysAgo }
        // Note: permanentDeleteAt field doesn't exist in the schema
        // Add it to the Ticket model if you need permanent deletion tracking
      }
    });

    return deleted.count;
  }
}