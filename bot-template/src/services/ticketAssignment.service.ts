import { AssignmentModel, Ticket } from '@prisma/client';
import { prisma } from '../lib/database';
import { Guild, GuildMember } from 'discord.js';
import { TicketService, TicketConfigWithArrays } from './ticket.service';

interface StaffWorkload {
  staffId: string;
  activeTickets: number;
  weightedLoad: number;
  lastAssigned?: Date;
}

export class TicketAssignmentService {
  private ticketService: TicketService;

  constructor(ticketService: TicketService) {
    this.ticketService = ticketService;
  }

  // Auto-assign ticket based on configuration
  async autoAssignTicket(
    guild: Guild,
    ticket: Ticket,
    config: TicketConfigWithArrays
  ): Promise<string | null> {
    if (config.assignmentModel !== AssignmentModel.AUTO_ASSIGN) {
      return null;
    }

    try {
      const availableStaff = await this.getAvailableStaff(guild, config);
      if (availableStaff.length === 0) return null;

      let assignedStaffId: string | null = null;

      // Determine assignment strategy
      switch (this.getAssignmentStrategy(config)) {
        case 'round-robin':
          assignedStaffId = await this.assignRoundRobin(availableStaff, ticket.guildId);
          break;
        
        case 'least-busy':
          assignedStaffId = await this.assignLeastBusy(availableStaff, ticket.guildId);
          break;
        
        case 'category-based':
          assignedStaffId = await this.assignByCategory(availableStaff, ticket, config);
          break;
        
        default:
          assignedStaffId = availableStaff[0].id; // Fallback to first available
      }

      if (assignedStaffId) {
        await this.ticketService.assignTicket(ticket.id, assignedStaffId, 'SYSTEM');
      }

      return assignedStaffId;
    } catch (error) {
      console.error('[TicketAssignmentService] Error auto-assigning ticket:', error);
      return null;
    }
  }

  // Get available staff members
  private async getAvailableStaff(
    guild: Guild,
    config: TicketConfigWithArrays
  ): Promise<GuildMember[]> {
    const availableStaff: GuildMember[] = [];

    for (const roleId of config.staffRoles) {
      const role = guild.roles.cache.get(roleId);
      if (!role) continue;

      for (const [, member] of role.members) {
        // Check if staff is online and not a bot
        if (!member.user.bot && member.presence?.status !== 'offline') {
          if (!availableStaff.find(m => m.id === member.id)) {
            availableStaff.push(member);
          }
        }
      }
    }

    return availableStaff;
  }

  // Round-robin assignment
  private async assignRoundRobin(
    availableStaff: GuildMember[],
    guildId: string
  ): Promise<string | null> {
    if (availableStaff.length === 0) return null;

    // Get last assigned staff
    const lastAssignment = await prisma.ticketLog.findFirst({
      where: {
        action: 'TICKET_ASSIGNED',
        ticket: {
          guildId
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!lastAssignment || !lastAssignment.details) {
      return availableStaff[0].id;
    }

    const lastStaffId = (lastAssignment.details as any).staffId;
    const lastIndex = availableStaff.findIndex(m => m.id === lastStaffId);
    
    // Get next staff member in rotation
    const nextIndex = (lastIndex + 1) % availableStaff.length;
    return availableStaff[nextIndex].id;
  }

  // Least busy assignment
  private async assignLeastBusy(
    availableStaff: GuildMember[],
    guildId: string
  ): Promise<string | null> {
    if (availableStaff.length === 0) return null;

    const workloads = await this.getStaffWorkloads(availableStaff.map(m => m.id), guildId);
    
    // Find staff with lowest workload
    let leastBusy = workloads[0];
    for (const workload of workloads) {
      if (workload.weightedLoad < leastBusy.weightedLoad) {
        leastBusy = workload;
      }
    }

    return leastBusy.staffId;
  }

  // Category-based assignment
  private async assignByCategory(
    availableStaff: GuildMember[],
    ticket: Ticket,
    config: TicketConfigWithArrays
  ): Promise<string | null> {
    if (!ticket.category) {
      return this.assignLeastBusy(availableStaff, ticket.guildId);
    }

    // Get category configuration
    const category = await prisma.ticketCategory.findFirst({
      where: {
        id: ticket.category,
        botId: config.botId
      }
    });

    // Note: staffRoleId doesn't exist in TicketCategory schema
    // Using all available staff instead
    if (!category) {
      return this.assignLeastBusy(availableStaff, ticket.guildId);
    }

    // Use all available staff as category doesn't have specific staff role
    const categoryStaff = availableStaff;

    if (categoryStaff.length === 0) {
      return this.assignLeastBusy(availableStaff, ticket.guildId);
    }

    return this.assignLeastBusy(categoryStaff, ticket.guildId);
  }

  // Get staff workloads
  async getStaffWorkloads(
    staffIds: string[],
    guildId: string
  ): Promise<StaffWorkload[]> {
    const workloads: StaffWorkload[] = [];

    for (const staffId of staffIds) {
      const tickets = await prisma.ticket.findMany({
        where: {
          guildId,
          assignedStaffId: staffId,
          state: {
            notIn: ['CLOSED', 'RESOLVED']
          },
          deletedAt: null
        }
      });

      // Calculate weighted load (high priority = 2x weight)
      let weightedLoad = 0;
      for (const ticket of tickets) {
        weightedLoad += ticket.priority === 'HIGH' || ticket.priority === 'URGENT' ? 2 : 1;
      }

      workloads.push({
        staffId,
        activeTickets: tickets.length,
        weightedLoad
      });
    }

    return workloads.sort((a, b) => a.weightedLoad - b.weightedLoad);
  }

  // Check if user can perform action based on assignment model
  async canPerformAction(
    userId: string,
    ticket: Ticket,
    action: 'reply' | 'close' | 'manage',
    config: TicketConfigWithArrays
  ): Promise<boolean> {
    const isStaff = await this.ticketService.isStaff(ticket.guildId, userId);
    const isAssigned = ticket.assignedStaffId === userId;
    const isCreator = ticket.creatorId === userId;

    switch (config.assignmentModel) {
      case AssignmentModel.COLLABORATIVE:
        // All staff can perform any action
        return isStaff || (isCreator && action === 'close');
      
      case AssignmentModel.SOFT_CLAIM:
        // Prefer assigned staff but allow others
        if (action === 'reply') return isStaff || isCreator;
        if (action === 'close') return isAssigned || isStaff || isCreator;
        if (action === 'manage') return isAssigned || isStaff;
        break;
      
      case AssignmentModel.STRICT_CLAIM:
        // Only assigned staff (and admins)
        if (action === 'reply') return isAssigned || isCreator;
        if (action === 'close') return isAssigned || isCreator;
        if (action === 'manage') return isAssigned;
        break;
      
      case AssignmentModel.NO_ASSIGNMENT:
        // Pure activity tracking
        return isStaff || isCreator;
      
      case AssignmentModel.AUTO_ASSIGN:
        // Similar to soft claim after assignment
        if (!ticket.assignedStaffId) return isStaff;
        if (action === 'reply') return isStaff || isCreator;
        if (action === 'close') return isAssigned || isStaff || isCreator;
        if (action === 'manage') return isAssigned || isStaff;
        break;
    }

    return false;
  }

  // Get assignment strategy from config metadata
  private getAssignmentStrategy(config: TicketConfigWithArrays): string {
    // This would typically come from config metadata
    // For now, default to least-busy
    return 'least-busy';
  }

  // Transfer ticket to another staff member
  async transferTicket(
    ticket: Ticket,
    newStaffId: string,
    transferredBy: string
  ): Promise<Ticket> {
    const oldStaffId = ticket.assignedStaffId;
    
    const updatedTicket = await this.ticketService.updateTicket(ticket.id, {
      assignedStaffId: newStaffId
    });

    await this.ticketService.addParticipant(ticket.id, newStaffId, 'STAFF' as any);
    
    await this.ticketService.logAction(ticket.id, 'TICKET_TRANSFERRED', transferredBy, {
      fromStaffId: oldStaffId,
      toStaffId: newStaffId
    });

    return updatedTicket;
  }

  // Get assignment statistics
  async getAssignmentStats(guildId: string): Promise<{
    totalTickets: number;
    assignedTickets: number;
    unassignedTickets: number;
    staffDistribution: Record<string, number>;
    averageResponseTime: number;
  }> {
    const tickets = await prisma.ticket.findMany({
      where: {
        guildId,
        deletedAt: null
      }
    });

    const assignedTickets = tickets.filter(t => t.assignedStaffId).length;
    const unassignedTickets = tickets.length - assignedTickets;

    // Calculate staff distribution
    const staffDistribution: Record<string, number> = {};
    for (const ticket of tickets) {
      if (ticket.assignedStaffId) {
        staffDistribution[ticket.assignedStaffId] = 
          (staffDistribution[ticket.assignedStaffId] || 0) + 1;
      }
    }

    // Calculate average response time (simplified)
    let totalResponseTime = 0;
    let responseCount = 0;

    for (const ticket of tickets) {
      if (ticket.assignedStaffId && ticket.state !== 'NEW') {
        const firstResponse = await prisma.ticketMessage.findFirst({
          where: {
            ticketId: ticket.id,
            isStaff: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        });

        if (firstResponse) {
          const responseTime = firstResponse.createdAt.getTime() - ticket.createdAt.getTime();
          totalResponseTime += responseTime;
          responseCount++;
        }
      }
    }

    const averageResponseTime = responseCount > 0 
      ? totalResponseTime / responseCount / 1000 / 60 // Convert to minutes
      : 0;

    return {
      totalTickets: tickets.length,
      assignedTickets,
      unassignedTickets,
      staffDistribution,
      averageResponseTime
    };
  }
}