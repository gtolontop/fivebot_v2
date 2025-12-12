import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateConfigDto } from './dto/update-config.dto';

@Injectable()
export class InviteTrackerService {
  private readonly logger = new Logger(InviteTrackerService.name);
  private readonly BONUS_INVITE_PREFIX = 'BONUS_';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get invite tracker configuration for a guild
   * @param guildId - Guild ID
   */
  async getConfig(guildId: string): Promise<any> {
    try {
      const config = await this.prisma.inviteTrackerConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        throw new NotFoundException('Invite tracker config not found');
      }

      return config;
    } catch (error) {
      this.logger.error(`Failed to get config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update invite tracker configuration
   * @param guildId - Guild ID
   * @param data - Update data
   */
  async updateConfig(guildId: string, data: UpdateConfigDto): Promise<any> {
    try {
      const config = await this.prisma.inviteTrackerConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        throw new NotFoundException('Invite tracker config not found');
      }

      return await this.prisma.inviteTrackerConfig.update({
        where: { guildId },
        data,
      });
    } catch (error) {
      this.logger.error(
        `Failed to update config: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Track an invite code
   * @param guildId - Guild ID
   * @param inviteCode - Invite code
   * @param inviterId - Inviter user ID
   * @param channelId - Channel ID (optional)
   * @param uses - Current uses count
   * @param maxUses - Maximum uses (optional)
   * @param expiresAt - Expiration date (optional)
   */
  async trackInvite(
    guildId: string,
    inviteCode: string,
    inviterId?: string,
    channelId?: string,
    uses: number = 0,
    maxUses?: number,
    expiresAt?: Date,
  ): Promise<any> {
    try {
      const config = await this.prisma.inviteTrackerConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        throw new NotFoundException('Invite tracker config not found');
      }

      return await this.prisma.trackedInvite.upsert({
        where: {
          guildId_code: {
            guildId,
            code: inviteCode,
          },
        },
        create: {
          configId: config.id,
          guildId,
          code: inviteCode,
          inviterId,
          channelId,
          uses,
          maxUses,
          expiresAt,
        },
        update: {
          inviterId,
          channelId,
          uses,
          maxUses,
          expiresAt,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to track invite: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle member join - detect which invite was used
   * @param guildId - Guild ID
   * @param member - Member data with userId
   * @param currentInvites - Current invite snapshot from Discord
   */
  async handleMemberJoin(
    guildId: string,
    member: { userId: string; joinedAt?: Date },
    currentInvites?: Map<string, number>,
  ): Promise<any> {
    try {
      const config = await this.prisma.inviteTrackerConfig.findUnique({
        where: { guildId },
      });

      if (!config || !config.enabled) {
        return null;
      }

      // Get all tracked invites for the guild
      const trackedInvites = await this.prisma.trackedInvite.findMany({
        where: { guildId },
      });

      let usedInvite: any = null;

      // Compare current invites with tracked invites to find which one was used
      if (currentInvites) {
        for (const tracked of trackedInvites) {
          const currentUses = currentInvites.get(tracked.code);
          if (currentUses !== undefined && currentUses > tracked.uses) {
            usedInvite = tracked;
            break;
          }
        }
      }

      // If no invite was found, create an unknown invite entry
      if (!usedInvite && config.trackUnknown) {
        usedInvite = await this.trackInvite(
          guildId,
          'UNKNOWN',
          undefined,
          undefined,
          1,
        );
      }

      if (!usedInvite) {
        return null;
      }

      // Check if this is a fake join (user joined recently before)
      const accountAge = member.joinedAt
        ? Date.now() - new Date(member.joinedAt).getTime()
        : Date.now();
      const isFake = accountAge < 7 * 24 * 60 * 60 * 1000; // Account less than 7 days old

      // Update the tracked invite
      await this.prisma.trackedInvite.update({
        where: { id: usedInvite.id },
        data: {
          uses: { increment: 1 },
          totalJoins: { increment: 1 },
          fakeJoins: isFake ? { increment: 1 } : undefined,
        },
      });

      // Create invited member record
      const invitedMember = await this.prisma.invitedMember.upsert({
        where: {
          guildId_userId: {
            guildId,
            userId: member.userId,
          },
        },
        create: {
          inviteId: usedInvite.id,
          guildId,
          userId: member.userId,
          isFake,
          joinedAt: member.joinedAt || new Date(),
        },
        update: {
          inviteId: usedInvite.id,
          leftAt: null,
          isFake,
          joinedAt: member.joinedAt || new Date(),
        },
      });

      return {
        invite: usedInvite,
        member: invitedMember,
        isFake,
      };
    } catch (error) {
      this.logger.error(
        `Failed to handle member join: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle member leave - track the leave
   * @param guildId - Guild ID
   * @param member - Member data with userId
   */
  async handleMemberLeave(
    guildId: string,
    member: { userId: string },
  ): Promise<any> {
    try {
      const invitedMember = await this.prisma.invitedMember.findUnique({
        where: {
          guildId_userId: {
            guildId,
            userId: member.userId,
          },
        },
        include: {
          invite: true,
        },
      });

      if (!invitedMember) {
        this.logger.warn(
          `Member ${member.userId} not found in invite records for guild ${guildId}`,
        );
        return null;
      }

      // Update invited member with leave date
      await this.prisma.invitedMember.update({
        where: {
          guildId_userId: {
            guildId,
            userId: member.userId,
          },
        },
        data: {
          leftAt: new Date(),
        },
      });

      // Update the tracked invite
      await this.prisma.trackedInvite.update({
        where: { id: invitedMember.inviteId },
        data: {
          totalLeaves: { increment: 1 },
        },
      });

      return {
        invite: invitedMember.invite,
        member: invitedMember,
      };
    } catch (error) {
      this.logger.error(
        `Failed to handle member leave: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get inviter statistics
   * @param guildId - Guild ID
   * @param userId - User ID
   */
  async getInviterStats(guildId: string, userId: string): Promise<any> {
    try {
      // Get all invites created by this user
      const invites = await this.prisma.trackedInvite.findMany({
        where: {
          guildId,
          inviterId: userId,
        },
        include: {
          members: true,
        },
      });

      // Get bonus invites (special tracked invite with code BONUS_${userId})
      const bonusInvite = await this.prisma.trackedInvite.findUnique({
        where: {
          guildId_code: {
            guildId,
            code: `${this.BONUS_INVITE_PREFIX}${userId}`,
          },
        },
      });

      // Calculate statistics
      let totalInvites = 0;
      let realInvites = 0;
      let fakeInvites = 0;
      let leftInvites = 0;
      let bonusInvites = bonusInvite ? bonusInvite.totalJoins : 0;

      for (const invite of invites) {
        totalInvites += invite.totalJoins;
        fakeInvites += invite.fakeJoins;

        // Count members who left
        const leftCount = invite.members.filter((m) => m.leftAt !== null).length;
        leftInvites += leftCount;
      }

      // Real invites = total - fake - left
      realInvites = totalInvites - fakeInvites - leftInvites + bonusInvites;

      return {
        userId,
        guildId,
        totalInvites,
        realInvites,
        fakeInvites,
        leftInvites,
        bonusInvites,
        invites: invites.map((inv) => ({
          code: inv.code,
          uses: inv.uses,
          totalJoins: inv.totalJoins,
          totalLeaves: inv.totalLeaves,
          fakeJoins: inv.fakeJoins,
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get inviter stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get leaderboard of top inviters
   * @param guildId - Guild ID
   * @param limit - Number of top inviters to return
   */
  async getLeaderboard(guildId: string, limit: number = 10): Promise<any> {
    try {
      // Get all invites in the guild grouped by inviter
      const invites = await this.prisma.trackedInvite.findMany({
        where: {
          guildId,
          inviterId: { not: null },
        },
        include: {
          members: true,
        },
      });

      // Group by inviter and calculate stats
      const inviterStats = new Map<
        string,
        {
          userId: string;
          totalInvites: number;
          realInvites: number;
          fakeInvites: number;
          leftInvites: number;
          bonusInvites: number;
        }
      >();

      for (const invite of invites) {
        if (!invite.inviterId) continue;

        // Skip bonus invite codes
        if (invite.code.startsWith(this.BONUS_INVITE_PREFIX)) {
          const userId = invite.code.substring(this.BONUS_INVITE_PREFIX.length);
          const stats = inviterStats.get(userId) || {
            userId,
            totalInvites: 0,
            realInvites: 0,
            fakeInvites: 0,
            leftInvites: 0,
            bonusInvites: 0,
          };
          stats.bonusInvites += invite.totalJoins;
          inviterStats.set(userId, stats);
          continue;
        }

        const stats = inviterStats.get(invite.inviterId) || {
          userId: invite.inviterId,
          totalInvites: 0,
          realInvites: 0,
          fakeInvites: 0,
          leftInvites: 0,
          bonusInvites: 0,
        };

        stats.totalInvites += invite.totalJoins;
        stats.fakeInvites += invite.fakeJoins;

        const leftCount = invite.members.filter((m) => m.leftAt !== null).length;
        stats.leftInvites += leftCount;

        inviterStats.set(invite.inviterId, stats);
      }

      // Calculate real invites and sort
      const leaderboard = Array.from(inviterStats.values())
        .map((stats) => ({
          ...stats,
          realInvites:
            stats.totalInvites -
            stats.fakeInvites -
            stats.leftInvites +
            stats.bonusInvites,
        }))
        .sort((a, b) => b.realInvites - a.realInvites)
        .slice(0, limit)
        .map((stats, index) => ({
          ...stats,
          rank: index + 1,
        }));

      return {
        guildId,
        leaderboard,
        total: inviterStats.size,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get leaderboard: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Reset all invites for a user
   * @param guildId - Guild ID
   * @param userId - User ID
   */
  async resetUserInvites(guildId: string, userId: string): Promise<any> {
    try {
      // Delete all invited members for this inviter's invites
      await this.prisma.invitedMember.deleteMany({
        where: {
          guildId,
          invite: {
            inviterId: userId,
          },
        },
      });

      // Reset all invites by this user
      const result = await this.prisma.trackedInvite.updateMany({
        where: {
          guildId,
          inviterId: userId,
        },
        data: {
          totalJoins: 0,
          totalLeaves: 0,
          fakeJoins: 0,
          uses: 0,
        },
      });

      // Delete bonus invites
      await this.prisma.trackedInvite.deleteMany({
        where: {
          guildId,
          code: `${this.BONUS_INVITE_PREFIX}${userId}`,
        },
      });

      return {
        success: true,
        count: result.count,
      };
    } catch (error) {
      this.logger.error(
        `Failed to reset user invites: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Add bonus invites to a user
   * @param guildId - Guild ID
   * @param userId - User ID
   * @param amount - Number of bonus invites to add
   */
  async addBonusInvites(
    guildId: string,
    userId: string,
    amount: number,
  ): Promise<any> {
    try {
      const config = await this.prisma.inviteTrackerConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        throw new NotFoundException('Invite tracker config not found');
      }

      // Create or update bonus invite tracking
      const bonusInvite = await this.prisma.trackedInvite.upsert({
        where: {
          guildId_code: {
            guildId,
            code: `${this.BONUS_INVITE_PREFIX}${userId}`,
          },
        },
        create: {
          configId: config.id,
          guildId,
          code: `${this.BONUS_INVITE_PREFIX}${userId}`,
          inviterId: userId,
          totalJoins: amount,
        },
        update: {
          totalJoins: { increment: amount },
        },
      });

      return {
        success: true,
        userId,
        bonusInvites: bonusInvite.totalJoins,
        added: amount,
      };
    } catch (error) {
      this.logger.error(
        `Failed to add bonus invites: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Remove bonus invites from a user
   * @param guildId - Guild ID
   * @param userId - User ID
   * @param amount - Number of bonus invites to remove
   */
  async removeBonusInvites(
    guildId: string,
    userId: string,
    amount: number,
  ): Promise<any> {
    try {
      const bonusInvite = await this.prisma.trackedInvite.findUnique({
        where: {
          guildId_code: {
            guildId,
            code: `${this.BONUS_INVITE_PREFIX}${userId}`,
          },
        },
      });

      if (!bonusInvite) {
        throw new NotFoundException('No bonus invites found for this user');
      }

      const newTotal = Math.max(0, bonusInvite.totalJoins - amount);

      const updated = await this.prisma.trackedInvite.update({
        where: {
          guildId_code: {
            guildId,
            code: `${this.BONUS_INVITE_PREFIX}${userId}`,
          },
        },
        data: {
          totalJoins: newTotal,
        },
      });

      return {
        success: true,
        userId,
        bonusInvites: updated.totalJoins,
        removed: amount,
      };
    } catch (error) {
      this.logger.error(
        `Failed to remove bonus invites: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Sync guild invites with Discord
   * This should be called with the current invites from Discord API
   * @param guildId - Guild ID
   * @param discordInvites - Array of invite data from Discord
   */
  async syncGuildInvites(
    guildId: string,
    discordInvites: Array<{
      code: string;
      inviterId?: string;
      channelId?: string;
      uses: number;
      maxUses?: number;
      expiresAt?: Date;
    }>,
  ): Promise<any> {
    try {
      const config = await this.prisma.inviteTrackerConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        throw new NotFoundException('Invite tracker config not found');
      }

      const synced: any[] = [];
      const inviteCodes = new Set<string>();

      // Update or create tracked invites
      for (const invite of discordInvites) {
        inviteCodes.add(invite.code);

        const tracked = await this.trackInvite(
          guildId,
          invite.code,
          invite.inviterId,
          invite.channelId,
          invite.uses,
          invite.maxUses,
          invite.expiresAt,
        );

        synced.push(tracked);
      }

      // Find and mark deleted invites (invites that no longer exist in Discord)
      const existingInvites = await this.prisma.trackedInvite.findMany({
        where: {
          guildId,
          code: {
            notIn: Array.from(inviteCodes),
            not: {
              startsWith: this.BONUS_INVITE_PREFIX,
            },
          },
        },
      });

      // Optionally delete or mark old invites
      // For now, we'll keep them for historical data

      return {
        success: true,
        synced: synced.length,
        existing: existingInvites.length,
        total: synced.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to sync guild invites: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
