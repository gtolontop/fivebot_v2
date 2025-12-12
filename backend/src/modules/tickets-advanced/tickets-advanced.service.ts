import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TranscriptService } from './transcript.service';
import { TicketPriority } from './dto';

@Injectable()
export class TicketsAdvancedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transcriptService: TranscriptService,
  ) {}

  // ==================== CREATE TICKET ====================

  async createTicket(
    guildId: string,
    userId: string,
    categoryId: string,
    topic: string,
    type: string = 'support',
    priority: string = 'medium',
  ) {
    // Get config to validate and get settings
    const config = await this.prisma.ticketConfig.findUnique({
      where: { guildId },
    });

    if (!config || !config.enabled) {
      throw new ForbiddenException('Ticket system is not enabled for this guild');
    }

    // Check if user has reached max tickets
    const existingTickets = await this.prisma.ticket.count({
      where: {
        guildId,
        creatorId: userId,
        state: 'open',
      },
    });

    if (existingTickets >= config.maxTicketsPerUser) {
      throw new BadRequestException(
        `You have reached the maximum of ${config.maxTicketsPerUser} open tickets`,
      );
    }

    // Check cooldown
    const lastTicket = await this.prisma.ticket.findFirst({
      where: {
        guildId,
        creatorId: userId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (lastTicket && config.cooldownMinutes > 0) {
      const timeSince = Date.now() - lastTicket.createdAt.getTime();
      const cooldown = config.cooldownMinutes * 60 * 1000;
      if (timeSince < cooldown) {
        const timeLeft = Math.ceil((cooldown - timeSince) / 1000 / 60);
        throw new BadRequestException(
          `You must wait ${timeLeft} minutes before creating another ticket`,
        );
      }
    }

    // Get next ticket number
    const lastTicketNumber = await this.prisma.ticket.findFirst({
      where: { guildId },
      orderBy: { ticketNumber: 'desc' },
    });

    const ticketNumber = (lastTicketNumber?.ticketNumber || 0) + 1;

    // Verify category exists
    const category = await this.prisma.ticketCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category || !category.active) {
      throw new NotFoundException('Category not found or inactive');
    }

    // Create ticket
    const ticket = await this.prisma.ticket.create({
      data: {
        guildId,
        ticketNumber,
        creatorId: userId,
        type,
        category: category.name,
        priority,
        state: 'open',
        activityState: 'active',
        containerType: config.containerType.toLowerCase(),
        lastActivity: new Date(),
      },
    });

    // Add creator as participant
    await this.prisma.ticketParticipant.create({
      data: {
        ticketId: ticket.id,
        userId,
        role: 'CREATOR',
      },
    });

    // Create log
    await this.prisma.ticketLog.create({
      data: {
        ticketId: ticket.id,
        action: 'CREATED',
        performedBy: userId,
        details: `Ticket created with topic: ${topic}`,
      },
    });

    // Create initial message
    await this.prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        userId,
        authorId: userId,
        content: topic,
        isStaff: false,
        messageNumber: 1,
      },
    });

    return ticket;
  }

  // ==================== CLOSE TICKET ====================

  async closeTicket(ticketId: string, closedBy: string, reason?: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.state === 'closed') {
      throw new BadRequestException('Ticket is already closed');
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        state: 'closed',
        closedAt: new Date(),
      },
    });

    // Create log
    await this.prisma.ticketLog.create({
      data: {
        ticketId,
        action: 'CLOSED',
        performedBy: closedBy,
        details: reason || 'Ticket closed',
      },
    });

    return updatedTicket;
  }

  // ==================== GENERATE TRANSCRIPT ====================

  async generateTranscript(ticketId: string) {
    return this.transcriptService.generateTranscript(ticketId);
  }

  async saveTranscript(ticketId: string, outputDir?: string) {
    return this.transcriptService.saveTranscriptToFile(ticketId, outputDir);
  }

  // ==================== ADD RATING ====================

  async addRating(ticketId: string, rating: number, feedback?: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.state !== 'closed') {
      throw new BadRequestException('Can only rate closed tickets');
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        feedbackRating: rating,
      },
    });

    // Create log
    await this.prisma.ticketLog.create({
      data: {
        ticketId,
        action: 'RATED',
        performedBy: ticket.creatorId,
        details: feedback
          ? `Rating: ${rating}/5 - ${feedback}`
          : `Rating: ${rating}/5`,
      },
    });

    return updatedTicket;
  }

  // ==================== CLAIM TICKET ====================

  async claimTicket(ticketId: string, staffId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.state === 'closed') {
      throw new BadRequestException('Cannot claim closed ticket');
    }

    if (ticket.assignedStaffId) {
      throw new BadRequestException(
        `Ticket is already claimed by ${ticket.assignedStaffId}`,
      );
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedStaffId: staffId,
        lastActivity: new Date(),
      },
    });

    // Add staff as participant if not already
    const existingParticipant = await this.prisma.ticketParticipant.findFirst({
      where: {
        ticketId,
        userId: staffId,
        removedAt: null,
      },
    });

    if (!existingParticipant) {
      await this.prisma.ticketParticipant.create({
        data: {
          ticketId,
          userId: staffId,
          role: 'STAFF',
        },
      });
    }

    // Create log
    await this.prisma.ticketLog.create({
      data: {
        ticketId,
        action: 'CLAIMED',
        performedBy: staffId,
        details: 'Ticket claimed by staff',
      },
    });

    return updatedTicket;
  }

  // ==================== TRANSFER TICKET ====================

  async transferTicket(ticketId: string, newStaffId: string, transferredBy: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.state === 'closed') {
      throw new BadRequestException('Cannot transfer closed ticket');
    }

    const oldStaffId = ticket.assignedStaffId;

    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedStaffId: newStaffId,
        lastActivity: new Date(),
      },
    });

    // Add new staff as participant if not already
    const existingParticipant = await this.prisma.ticketParticipant.findFirst({
      where: {
        ticketId,
        userId: newStaffId,
        removedAt: null,
      },
    });

    if (!existingParticipant) {
      await this.prisma.ticketParticipant.create({
        data: {
          ticketId,
          userId: newStaffId,
          role: 'STAFF',
        },
      });
    }

    // Create log
    await this.prisma.ticketLog.create({
      data: {
        ticketId,
        action: 'TRANSFERRED',
        performedBy: transferredBy,
        details: `Transferred from ${oldStaffId || 'unassigned'} to ${newStaffId}`,
      },
    });

    return updatedTicket;
  }

  // ==================== ADD USER ====================

  async addUser(ticketId: string, userId: string, addedBy: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.state === 'closed') {
      throw new BadRequestException('Cannot add users to closed ticket');
    }

    // Check if already participant
    const existing = await this.prisma.ticketParticipant.findFirst({
      where: {
        ticketId,
        userId,
        removedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException('User is already a participant');
    }

    const participant = await this.prisma.ticketParticipant.create({
      data: {
        ticketId,
        userId,
        role: 'OBSERVER',
      },
    });

    // Update activity
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { lastActivity: new Date() },
    });

    // Create log
    await this.prisma.ticketLog.create({
      data: {
        ticketId,
        action: 'USER_ADDED',
        performedBy: addedBy,
        details: `Added user ${userId}`,
      },
    });

    return participant;
  }

  // ==================== REMOVE USER ====================

  async removeUser(ticketId: string, userId: string, removedBy: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const participant = await this.prisma.ticketParticipant.findFirst({
      where: {
        ticketId,
        userId,
        removedAt: null,
      },
    });

    if (!participant) {
      throw new NotFoundException('User is not a participant');
    }

    if (participant.role === 'CREATOR') {
      throw new BadRequestException('Cannot remove ticket creator');
    }

    await this.prisma.ticketParticipant.update({
      where: { id: participant.id },
      data: { removedAt: new Date() },
    });

    // Update activity
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { lastActivity: new Date() },
    });

    // Create log
    await this.prisma.ticketLog.create({
      data: {
        ticketId,
        action: 'USER_REMOVED',
        performedBy: removedBy,
        details: `Removed user ${userId}`,
      },
    });

    return { success: true };
  }

  // ==================== SET PRIORITY ====================

  async setTicketPriority(ticketId: string, priority: string, updatedBy: string) {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      throw new BadRequestException('Invalid priority level');
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        priority,
        lastActivity: new Date(),
      },
    });

    // Create log
    await this.prisma.ticketLog.create({
      data: {
        ticketId,
        action: 'PRIORITY_CHANGED',
        performedBy: updatedBy,
        details: `Priority changed from ${ticket.priority} to ${priority}`,
      },
    });

    return updatedTicket;
  }

  // ==================== GET TICKET STATS ====================

  async getTicketStats(guildId: string) {
    const [
      totalTickets,
      openTickets,
      closedTickets,
      avgResponseTime,
      avgResolutionTime,
      ticketsByPriority,
      ticketsByCategory,
      recentTickets,
      topStaff,
    ] = await Promise.all([
      // Total tickets
      this.prisma.ticket.count({ where: { guildId } }),

      // Open tickets
      this.prisma.ticket.count({ where: { guildId, state: 'open' } }),

      // Closed tickets
      this.prisma.ticket.count({ where: { guildId, state: 'closed' } }),

      // Average response time (placeholder - would need more complex query)
      Promise.resolve(0),

      // Average resolution time
      this.getAverageResolutionTime(guildId),

      // Tickets by priority
      this.prisma.ticket.groupBy({
        by: ['priority'],
        where: { guildId },
        _count: true,
      }),

      // Tickets by category
      this.prisma.ticket.groupBy({
        by: ['category'],
        where: { guildId, category: { not: null } },
        _count: true,
      }),

      // Recent tickets
      this.prisma.ticket.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          ticketNumber: true,
          state: true,
          priority: true,
          category: true,
          createdAt: true,
          closedAt: true,
        },
      }),

      // Top staff by tickets handled
      this.getTopStaff(guildId),
    ]);

    // Calculate ratings
    const ratedTickets = await this.prisma.ticket.findMany({
      where: {
        guildId,
        feedbackRating: { not: null },
      },
      select: { feedbackRating: true },
    });

    const avgRating = ratedTickets.length > 0
      ? ratedTickets.reduce((sum, t) => sum + (t.feedbackRating || 0), 0) / ratedTickets.length
      : 0;

    return {
      overview: {
        total: totalTickets,
        open: openTickets,
        closed: closedTickets,
        avgRating: Math.round(avgRating * 100) / 100,
        ratedCount: ratedTickets.length,
      },
      performance: {
        avgResponseTime,
        avgResolutionTime,
      },
      distribution: {
        byPriority: ticketsByPriority.map((p) => ({
          priority: p.priority,
          count: p._count,
        })),
        byCategory: ticketsByCategory.map((c) => ({
          category: c.category,
          count: c._count,
        })),
      },
      recentTickets,
      topStaff,
    };
  }

  private async getAverageResolutionTime(guildId: string): Promise<number> {
    const closedTickets = await this.prisma.ticket.findMany({
      where: {
        guildId,
        state: 'closed',
        closedAt: { not: null },
      },
      select: {
        createdAt: true,
        closedAt: true,
      },
    });

    if (closedTickets.length === 0) return 0;

    const totalTime = closedTickets.reduce((sum, ticket) => {
      const created = ticket.createdAt.getTime();
      const closed = ticket.closedAt!.getTime();
      return sum + (closed - created);
    }, 0);

    // Return average in hours
    return Math.round((totalTime / closedTickets.length) / (1000 * 60 * 60) * 100) / 100;
  }

  private async getTopStaff(guildId: string) {
    const staffTickets = await this.prisma.ticket.groupBy({
      by: ['assignedStaffId'],
      where: {
        guildId,
        assignedStaffId: { not: null },
        state: 'closed',
      },
      _count: true,
      orderBy: {
        _count: {
          assignedStaffId: 'desc',
        },
      },
      take: 5,
    });

    return staffTickets.map((s) => ({
      staffId: s.assignedStaffId,
      ticketsHandled: s._count,
    }));
  }

  // ==================== TICKET PANELS ====================

  async createPanel(
    guildId: string,
    botId: string,
    channelId: string,
    type: string,
    config?: Record<string, any>,
  ) {
    const panel = await this.prisma.ticketPanel.create({
      data: {
        guildId,
        botId,
        channelId,
        type,
        active: true,
        config: config ? JSON.stringify(config) : null,
      },
    });

    return panel;
  }

  async getPanels(guildId: string) {
    return this.prisma.ticketPanel.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePanel(panelId: string, data: any) {
    return this.prisma.ticketPanel.update({
      where: { id: panelId },
      data: {
        ...data,
        config: data.config ? JSON.stringify(data.config) : undefined,
      },
    });
  }

  async deletePanel(panelId: string) {
    return this.prisma.ticketPanel.delete({
      where: { id: panelId },
    });
  }

  // ==================== TICKET QUERIES ====================

  async getTicket(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        participants: {
          where: { removedAt: null },
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async getTickets(guildId: string, filters?: {
    state?: string;
    priority?: string;
    assignedStaffId?: string;
    creatorId?: string;
  }) {
    return this.prisma.ticket.findMany({
      where: {
        guildId,
        ...filters,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ==================== ADD MESSAGE ====================

  async addMessage(
    ticketId: string,
    userId: string,
    authorId: string,
    content: string,
    isStaff: boolean = false,
    attachments?: any,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.state === 'closed') {
      throw new BadRequestException('Cannot add messages to closed ticket');
    }

    // Get next message number
    const lastMessage = await this.prisma.ticketMessage.findFirst({
      where: { ticketId },
      orderBy: { messageNumber: 'desc' },
    });

    const messageNumber = (lastMessage?.messageNumber || 0) + 1;

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        userId,
        authorId,
        content,
        isStaff,
        messageNumber,
        attachments: attachments ? JSON.stringify(attachments) : null,
      },
    });

    // Update last activity
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { lastActivity: new Date() },
    });

    return message;
  }
}
