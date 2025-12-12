import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GiveawayStatus, Prisma } from '@prisma/client';
import { CreateGiveawayDto } from './dto/create-giveaway.dto';
import { UpdateGiveawayDto } from './dto/update-giveaway.dto';
import { UpdateConfigDto } from './dto/update-config.dto';

@Injectable()
export class GiveawayService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CONFIG ====================

  /**
   * Get giveaway configuration for a guild
   */
  async getConfig(guildId: string) {
    const config = await this.prisma.giveawayConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      throw new NotFoundException('Giveaway config not found for this guild');
    }

    return this.formatConfig(config);
  }

  /**
   * Update giveaway configuration for a guild
   */
  async updateConfig(guildId: string, botId: string, data: UpdateConfigDto) {
    // Prepare the update data
    const updateData: any = { ...data };

    // Convert arrays to text for database storage
    if (data.managerRoleIds) {
      updateData.managerRoleIds = data.managerRoleIds.join(',');
    }

    // Upsert the configuration
    const config = await this.prisma.giveawayConfig.upsert({
      where: { guildId },
      update: updateData,
      create: {
        guildId,
        botId,
        ...updateData,
      },
    });

    return this.formatConfig(config);
  }

  // ==================== GIVEAWAY MANAGEMENT ====================

  /**
   * Create a new giveaway
   */
  async createGiveaway(guildId: string, botId: string, data: CreateGiveawayDto) {
    // Get or create config
    let config = await this.prisma.giveawayConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      config = await this.prisma.giveawayConfig.create({
        data: {
          guildId,
          botId,
        },
      });
    }

    if (!config.enabled) {
      throw new BadRequestException('Giveaways are disabled for this guild');
    }

    // Validate winners count
    if (data.winnersCount && data.winnersCount > config.maxWinners) {
      throw new BadRequestException(`Winners count cannot exceed ${config.maxWinners}`);
    }

    // Calculate end time
    let endAt: Date;
    if (data.endAt) {
      endAt = new Date(data.endAt);
    } else if (data.duration) {
      if (data.duration > config.maxDuration) {
        throw new BadRequestException(`Duration cannot exceed ${config.maxDuration} seconds`);
      }
      endAt = new Date(Date.now() + data.duration * 1000);
    } else {
      endAt = new Date(Date.now() + config.defaultDuration * 1000);
    }

    // Validate end time is in the future
    if (endAt <= new Date()) {
      throw new BadRequestException('End time must be in the future');
    }

    // Determine start time
    const startAt = data.startAt ? new Date(data.startAt) : new Date();
    const status: GiveawayStatus = startAt > new Date() ? 'SCHEDULED' : 'ACTIVE';

    // Prepare giveaway data
    const giveawayData: Prisma.GiveawayCreateInput = {
      config: { connect: { id: config.id } },
      guildId: data.guildId,
      channelId: data.channelId,
      hostId: data.hostId,
      prize: data.prize,
      description: data.description,
      winnersCount: data.winnersCount || config.defaultWinners,
      emoji: data.emoji || config.defaultEmoji,
      thumbnail: data.thumbnail,
      requiredRoleIds: data.requiredRoleIds?.join(','),
      requiredLevel: data.requiredLevel,
      requiredMessages: data.requiredMessages,
      blacklistedRoleIds: data.blacklistedRoleIds?.join(','),
      bonusRoles: data.bonusRoles ? JSON.stringify(data.bonusRoles) : null,
      startAt,
      endAt,
      status,
    };

    const giveaway = await this.prisma.giveaway.create({
      data: giveawayData,
      include: {
        config: true,
        entries: true,
      },
    });

    return this.formatGiveaway(giveaway);
  }

  /**
   * End a giveaway and pick winners
   */
  async endGiveaway(giveawayId: string) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id: giveawayId },
      include: {
        entries: true,
      },
    });

    if (!giveaway) {
      throw new NotFoundException('Giveaway not found');
    }

    if (giveaway.status === 'ENDED') {
      throw new BadRequestException('Giveaway has already ended');
    }

    if (giveaway.status === 'CANCELLED') {
      throw new BadRequestException('Cannot end a cancelled giveaway');
    }

    // Pick winners
    const winners = await this.pickWinners(giveawayId, giveaway.winnersCount);

    // Update giveaway status
    const updatedGiveaway = await this.prisma.giveaway.update({
      where: { id: giveawayId },
      data: {
        status: 'ENDED',
        winners: winners.length > 0 ? JSON.stringify(winners) : null,
      },
      include: {
        config: true,
        entries: true,
      },
    });

    return {
      giveaway: this.formatGiveaway(updatedGiveaway),
      winners,
    };
  }

  /**
   * Cancel a giveaway
   */
  async cancelGiveaway(giveawayId: string) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id: giveawayId },
    });

    if (!giveaway) {
      throw new NotFoundException('Giveaway not found');
    }

    if (giveaway.status === 'ENDED') {
      throw new BadRequestException('Cannot cancel an ended giveaway');
    }

    if (giveaway.status === 'CANCELLED') {
      throw new BadRequestException('Giveaway is already cancelled');
    }

    const updatedGiveaway = await this.prisma.giveaway.update({
      where: { id: giveawayId },
      data: { status: 'CANCELLED' },
      include: {
        config: true,
        entries: true,
      },
    });

    return this.formatGiveaway(updatedGiveaway);
  }

  /**
   * Pause a giveaway
   */
  async pauseGiveaway(giveawayId: string) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id: giveawayId },
    });

    if (!giveaway) {
      throw new NotFoundException('Giveaway not found');
    }

    if (giveaway.status !== 'ACTIVE') {
      throw new BadRequestException('Can only pause active giveaways');
    }

    if (giveaway.isPaused) {
      throw new BadRequestException('Giveaway is already paused');
    }

    const updatedGiveaway = await this.prisma.giveaway.update({
      where: { id: giveawayId },
      data: { isPaused: true },
      include: {
        config: true,
        entries: true,
      },
    });

    return this.formatGiveaway(updatedGiveaway);
  }

  /**
   * Resume a paused giveaway
   */
  async resumeGiveaway(giveawayId: string) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id: giveawayId },
    });

    if (!giveaway) {
      throw new NotFoundException('Giveaway not found');
    }

    if (!giveaway.isPaused) {
      throw new BadRequestException('Giveaway is not paused');
    }

    const updatedGiveaway = await this.prisma.giveaway.update({
      where: { id: giveawayId },
      data: { isPaused: false },
      include: {
        config: true,
        entries: true,
      },
    });

    return this.formatGiveaway(updatedGiveaway);
  }

  /**
   * Update a giveaway
   */
  async updateGiveaway(giveawayId: string, data: UpdateGiveawayDto) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id: giveawayId },
    });

    if (!giveaway) {
      throw new NotFoundException('Giveaway not found');
    }

    if (giveaway.status === 'ENDED') {
      throw new BadRequestException('Cannot update an ended giveaway');
    }

    if (giveaway.status === 'CANCELLED') {
      throw new BadRequestException('Cannot update a cancelled giveaway');
    }

    // Prepare update data
    const updateData: any = {};

    if (data.prize !== undefined) updateData.prize = data.prize;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.winnersCount !== undefined) updateData.winnersCount = data.winnersCount;
    if (data.emoji !== undefined) updateData.emoji = data.emoji;
    if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
    if (data.requiredRoleIds !== undefined) updateData.requiredRoleIds = data.requiredRoleIds.join(',');
    if (data.requiredLevel !== undefined) updateData.requiredLevel = data.requiredLevel;
    if (data.requiredMessages !== undefined) updateData.requiredMessages = data.requiredMessages;
    if (data.blacklistedRoleIds !== undefined) updateData.blacklistedRoleIds = data.blacklistedRoleIds.join(',');
    if (data.bonusRoles !== undefined) updateData.bonusRoles = JSON.stringify(data.bonusRoles);
    if (data.endAt !== undefined) {
      const endAt = new Date(data.endAt);
      if (endAt <= new Date()) {
        throw new BadRequestException('End time must be in the future');
      }
      updateData.endAt = endAt;
    }

    const updatedGiveaway = await this.prisma.giveaway.update({
      where: { id: giveawayId },
      data: updateData,
      include: {
        config: true,
        entries: true,
      },
    });

    return this.formatGiveaway(updatedGiveaway);
  }

  /**
   * Reroll a giveaway to pick new winners
   */
  async rerollGiveaway(giveawayId: string, winnersCount?: number) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id: giveawayId },
      include: {
        entries: true,
      },
    });

    if (!giveaway) {
      throw new NotFoundException('Giveaway not found');
    }

    if (giveaway.status !== 'ENDED') {
      throw new BadRequestException('Can only reroll ended giveaways');
    }

    // Set status to REROLLING temporarily
    await this.prisma.giveaway.update({
      where: { id: giveawayId },
      data: { status: 'REROLLING' },
    });

    // Pick new winners
    const count = winnersCount || giveaway.winnersCount;
    const winners = await this.pickWinners(giveawayId, count, true);

    // Update with new winners
    const updatedGiveaway = await this.prisma.giveaway.update({
      where: { id: giveawayId },
      data: {
        status: 'ENDED',
        winners: winners.length > 0 ? JSON.stringify(winners) : null,
      },
      include: {
        config: true,
        entries: true,
      },
    });

    return {
      giveaway: this.formatGiveaway(updatedGiveaway),
      winners,
    };
  }

  // ==================== ENTRIES ====================

  /**
   * Enter a user into a giveaway
   */
  async enterGiveaway(giveawayId: string, userId: string) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id: giveawayId },
      include: {
        entries: true,
      },
    });

    if (!giveaway) {
      throw new NotFoundException('Giveaway not found');
    }

    if (giveaway.status !== 'ACTIVE') {
      throw new BadRequestException('Giveaway is not active');
    }

    if (giveaway.isPaused) {
      throw new BadRequestException('Giveaway is currently paused');
    }

    if (new Date() >= giveaway.endAt) {
      throw new BadRequestException('Giveaway has ended');
    }

    // Check if user already entered
    const existingEntry = giveaway.entries.find((e) => e.userId === userId);
    if (existingEntry) {
      throw new ConflictException('User has already entered this giveaway');
    }

    // Calculate bonus entries
    const bonusEntries = 1; // Default, will be calculated based on bonusRoles if needed

    // Create entry
    const entry = await this.prisma.giveawayEntry.create({
      data: {
        giveawayId,
        userId,
        entries: bonusEntries,
      },
    });

    // Update participant count
    await this.prisma.giveaway.update({
      where: { id: giveawayId },
      data: {
        participantCount: { increment: 1 },
      },
    });

    return entry;
  }

  /**
   * Remove a user from a giveaway
   */
  async leaveGiveaway(giveawayId: string, userId: string) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id: giveawayId },
    });

    if (!giveaway) {
      throw new NotFoundException('Giveaway not found');
    }

    if (giveaway.status !== 'ACTIVE') {
      throw new BadRequestException('Cannot leave a non-active giveaway');
    }

    const entry = await this.prisma.giveawayEntry.findUnique({
      where: {
        giveawayId_userId: {
          giveawayId,
          userId,
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('User has not entered this giveaway');
    }

    await this.prisma.giveawayEntry.delete({
      where: { id: entry.id },
    });

    // Update participant count
    await this.prisma.giveaway.update({
      where: { id: giveawayId },
      data: {
        participantCount: { decrement: 1 },
      },
    });

    return { success: true };
  }

  /**
   * Get all entries for a giveaway
   */
  async getGiveawayEntries(giveawayId: string) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id: giveawayId },
    });

    if (!giveaway) {
      throw new NotFoundException('Giveaway not found');
    }

    const entries = await this.prisma.giveawayEntry.findMany({
      where: { giveawayId },
      orderBy: { createdAt: 'desc' },
    });

    return entries;
  }

  // ==================== QUERIES ====================

  /**
   * Get a single giveaway by ID
   */
  async getGiveaway(giveawayId: string) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id: giveawayId },
      include: {
        config: true,
        entries: true,
      },
    });

    if (!giveaway) {
      throw new NotFoundException('Giveaway not found');
    }

    return this.formatGiveaway(giveaway);
  }

  /**
   * Get all active giveaways for a guild
   */
  async getActiveGiveaways(guildId: string) {
    const giveaways = await this.prisma.giveaway.findMany({
      where: {
        guildId,
        status: {
          in: ['SCHEDULED', 'ACTIVE'],
        },
      },
      include: {
        config: true,
        entries: true,
      },
      orderBy: { endAt: 'asc' },
    });

    return giveaways.map((g) => this.formatGiveaway(g));
  }

  /**
   * Get ended giveaways with pagination
   */
  async getEndedGiveaways(guildId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [giveaways, total] = await Promise.all([
      this.prisma.giveaway.findMany({
        where: {
          guildId,
          status: {
            in: ['ENDED', 'CANCELLED'],
          },
        },
        include: {
          config: true,
          entries: true,
        },
        orderBy: { endAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.giveaway.count({
        where: {
          guildId,
          status: {
            in: ['ENDED', 'CANCELLED'],
          },
        },
      }),
    ]);

    return {
      giveaways: giveaways.map((g) => this.formatGiveaway(g)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== REQUIREMENTS ====================

  /**
   * Check if a user meets the requirements to enter a giveaway
   */
  async checkRequirements(giveawayId: string, userId: string, userRoles?: string[], userLevel?: number, userMessages?: number) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id: giveawayId },
    });

    if (!giveaway) {
      throw new NotFoundException('Giveaway not found');
    }

    const requirements: any = {
      eligible: true,
      reasons: [],
    };

    // Check required roles
    if (giveaway.requiredRoleIds && userRoles) {
      const requiredRoles = giveaway.requiredRoleIds.split(',');
      const hasRequiredRole = requiredRoles.some((roleId) => userRoles.includes(roleId));
      if (!hasRequiredRole) {
        requirements.eligible = false;
        requirements.reasons.push('Missing required role');
      }
    }

    // Check blacklisted roles
    if (giveaway.blacklistedRoleIds && userRoles) {
      const blacklistedRoles = giveaway.blacklistedRoleIds.split(',');
      const hasBlacklistedRole = blacklistedRoles.some((roleId) => userRoles.includes(roleId));
      if (hasBlacklistedRole) {
        requirements.eligible = false;
        requirements.reasons.push('Has blacklisted role');
      }
    }

    // Check required level
    if (giveaway.requiredLevel !== null && giveaway.requiredLevel !== undefined) {
      if (userLevel === undefined || userLevel < giveaway.requiredLevel) {
        requirements.eligible = false;
        requirements.reasons.push(`Requires level ${giveaway.requiredLevel}`);
      }
    }

    // Check required messages
    if (giveaway.requiredMessages !== null && giveaway.requiredMessages !== undefined) {
      if (userMessages === undefined || userMessages < giveaway.requiredMessages) {
        requirements.eligible = false;
        requirements.reasons.push(`Requires ${giveaway.requiredMessages} messages`);
      }
    }

    return requirements;
  }

  /**
   * Pick winners for a giveaway
   */
  async pickWinners(giveawayId: string, count: number, excludePreviousWinners: boolean = false) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id: giveawayId },
      include: {
        entries: true,
      },
    });

    if (!giveaway) {
      throw new NotFoundException('Giveaway not found');
    }

    let eligibleEntries = giveaway.entries;

    // Exclude previous winners if rerolling
    if (excludePreviousWinners) {
      eligibleEntries = eligibleEntries.filter((e) => !e.isWinner);
    }

    if (eligibleEntries.length === 0) {
      return [];
    }

    // Create weighted array based on bonus entries
    const weightedEntries: string[] = [];
    eligibleEntries.forEach((entry) => {
      for (let i = 0; i < entry.entries; i++) {
        weightedEntries.push(entry.userId);
      }
    });

    // Pick random winners
    const winners: string[] = [];
    const winnerSet = new Set<string>();

    const maxPicks = Math.min(count, eligibleEntries.length);

    while (winners.length < maxPicks && weightedEntries.length > 0) {
      const randomIndex = Math.floor(Math.random() * weightedEntries.length);
      const winnerId = weightedEntries[randomIndex];

      if (!winnerSet.has(winnerId)) {
        winners.push(winnerId);
        winnerSet.add(winnerId);

        // Remove all entries of this user from weighted array
        for (let i = weightedEntries.length - 1; i >= 0; i--) {
          if (weightedEntries[i] === winnerId) {
            weightedEntries.splice(i, 1);
          }
        }
      }
    }

    // Mark winners in database
    await this.prisma.giveawayEntry.updateMany({
      where: {
        giveawayId,
        userId: { in: winners },
      },
      data: { isWinner: true },
    });

    return winners;
  }

  // ==================== SCHEDULED PROCESSING ====================

  /**
   * Process scheduled giveaways (to be called by cron job)
   */
  async processScheduledGiveaways() {
    const now = new Date();

    // Find giveaways that should start
    const giveawaysToStart = await this.prisma.giveaway.findMany({
      where: {
        status: 'SCHEDULED',
        startAt: {
          lte: now,
        },
      },
    });

    // Update to ACTIVE
    for (const giveaway of giveawaysToStart) {
      await this.prisma.giveaway.update({
        where: { id: giveaway.id },
        data: { status: 'ACTIVE' },
      });
    }

    // Find giveaways that should end
    const giveawaysToEnd = await this.prisma.giveaway.findMany({
      where: {
        status: 'ACTIVE',
        isPaused: false,
        endAt: {
          lte: now,
        },
      },
    });

    // End each giveaway
    const results = [];
    for (const giveaway of giveawaysToEnd) {
      try {
        const result = await this.endGiveaway(giveaway.id);
        results.push(result);
      } catch (error) {
        console.error(`Failed to end giveaway ${giveaway.id}:`, error);
      }
    }

    return {
      started: giveawaysToStart.length,
      ended: results.length,
      results,
    };
  }

  // ==================== HELPERS ====================

  /**
   * Format config for API response
   */
  private formatConfig(config: any) {
    return {
      ...config,
      managerRoleIds: config.managerRoleIds ? config.managerRoleIds.split(',') : [],
    };
  }

  /**
   * Format giveaway for API response
   */
  private formatGiveaway(giveaway: any) {
    return {
      ...giveaway,
      requiredRoleIds: giveaway.requiredRoleIds ? giveaway.requiredRoleIds.split(',') : [],
      blacklistedRoleIds: giveaway.blacklistedRoleIds ? giveaway.blacklistedRoleIds.split(',') : [],
      bonusRoles: giveaway.bonusRoles ? JSON.parse(giveaway.bonusRoles) : {},
      winners: giveaway.winners ? JSON.parse(giveaway.winners) : [],
    };
  }
}
