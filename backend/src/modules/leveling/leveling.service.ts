import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LevelingService {
  private readonly logger = new Logger(LevelingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add XP to a user
   * @param guildId - Guild ID
   * @param botId - Bot ID
   * @param userId - User ID
   * @param amount - Amount of XP to add
   */
  async addXp(
    guildId: string,
    botId: string,
    userId: string,
    amount: number,
  ): Promise<any> {
    try {
      const userLevel = await this.prisma.userLevel.upsert({
        where: {
          guildId_userId: {
            guildId,
            userId,
          },
        },
        create: {
          guildId,
          botId,
          userId,
          xp: amount,
          totalXp: amount,
          level: 0,
        },
        update: {
          xp: { increment: amount },
          totalXp: { increment: amount },
          messageCount: { increment: 1 },
          lastXpGain: new Date(),
        },
      });

      // Check for level up
      const leveledUp = await this.checkAndProcessLevelUp(
        guildId,
        botId,
        userId,
      );

      return { userLevel, leveledUp };
    } catch (error) {
      this.logger.error(`Failed to add XP: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Remove XP from a user
   * @param guildId - Guild ID
   * @param botId - Bot ID
   * @param userId - User ID
   * @param amount - Amount of XP to remove
   */
  async removeXp(
    guildId: string,
    botId: string,
    userId: string,
    amount: number,
  ): Promise<any> {
    try {
      const userLevel = await this.prisma.userLevel.findUnique({
        where: {
          guildId_userId: {
            guildId,
            userId,
          },
        },
      });

      if (!userLevel) {
        throw new NotFoundException('User level not found');
      }

      const newXp = Math.max(0, userLevel.xp - amount);
      const newTotalXp = Math.max(0, userLevel.totalXp - amount);

      return await this.prisma.userLevel.update({
        where: {
          guildId_userId: {
            guildId,
            userId,
          },
        },
        data: {
          xp: newXp,
          totalXp: newTotalXp,
          level: this.calculateLevelFromXp(newXp),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to remove XP: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Set a user's XP to a specific amount
   * @param guildId - Guild ID
   * @param botId - Bot ID
   * @param userId - User ID
   * @param amount - XP amount to set
   */
  async setXp(
    guildId: string,
    botId: string,
    userId: string,
    amount: number,
  ): Promise<any> {
    try {
      const level = this.calculateLevelFromXp(amount);

      return await this.prisma.userLevel.upsert({
        where: {
          guildId_userId: {
            guildId,
            userId,
          },
        },
        create: {
          guildId,
          botId,
          userId,
          xp: amount,
          totalXp: amount,
          level,
        },
        update: {
          xp: amount,
          totalXp: amount,
          level,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to set XP: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Set a user's level
   * @param guildId - Guild ID
   * @param botId - Bot ID
   * @param userId - User ID
   * @param level - Level to set
   */
  async setLevel(
    guildId: string,
    botId: string,
    userId: string,
    level: number,
  ): Promise<any> {
    try {
      const xpRequired = this.calculateXpForLevel(level);

      return await this.prisma.userLevel.upsert({
        where: {
          guildId_userId: {
            guildId,
            userId,
          },
        },
        create: {
          guildId,
          botId,
          userId,
          xp: xpRequired,
          totalXp: xpRequired,
          level,
        },
        update: {
          xp: xpRequired,
          totalXp: xpRequired,
          level,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to set level: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get a user's level data
   * @param guildId - Guild ID
   * @param userId - User ID
   */
  async getUserLevel(guildId: string, userId: string): Promise<any> {
    try {
      const userLevel = await this.prisma.userLevel.findFirst({
        where: {
          guildId,
          userId,
        },
      });

      if (!userLevel) {
        throw new NotFoundException('User level not found');
      }

      // Calculate rank
      const rank = await this.getGuildRank(guildId, userId);

      // Calculate XP needed for next level
      const xpForNextLevel = this.calculateXpForLevel(userLevel.level + 1);
      const xpForCurrentLevel = this.calculateXpForLevel(userLevel.level);
      const xpNeeded = xpForNextLevel - userLevel.xp;
      const xpProgress = userLevel.xp - xpForCurrentLevel;
      const xpRequired = xpForNextLevel - xpForCurrentLevel;

      return {
        ...userLevel,
        rank,
        xpNeeded,
        xpProgress,
        xpRequired,
        xpForNextLevel,
        xpForCurrentLevel,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get user level: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get the leaderboard for a guild
   * @param guildId - Guild ID
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   */
  async getLeaderboard(
    guildId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    try {
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        this.prisma.userLevel.findMany({
          where: { guildId },
          orderBy: [{ level: 'desc' }, { xp: 'desc' }],
          skip,
          take: limit,
        }),
        this.prisma.userLevel.count({
          where: { guildId },
        }),
      ]);

      const leaderboard = users.map((user, index) => ({
        ...user,
        rank: skip + index + 1,
        xpForNextLevel: this.calculateXpForLevel(user.level + 1),
        xpForCurrentLevel: this.calculateXpForLevel(user.level),
      }));

      return {
        data: leaderboard,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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
   * Get a user's rank in the guild
   * @param guildId - Guild ID
   * @param userId - User ID
   */
  async getGuildRank(guildId: string, userId: string): Promise<number> {
    try {
      const userLevel = await this.prisma.userLevel.findFirst({
        where: {
          guildId,
          userId,
        },
      });

      if (!userLevel) {
        return 0;
      }

      const rank = await this.prisma.userLevel.count({
        where: {
          guildId,
          OR: [
            { level: { gt: userLevel.level } },
            {
              level: userLevel.level,
              xp: { gt: userLevel.xp },
            },
          ],
        },
      });

      return rank + 1;
    } catch (error) {
      this.logger.error(
        `Failed to get guild rank: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Calculate level from XP
   * Formula: 5 * (level^2) + 50 * level + 100
   * @param xp - XP amount
   */
  calculateLevelFromXp(xp: number): number {
    let level = 0;
    let xpNeeded = 0;

    while (xpNeeded <= xp) {
      level++;
      xpNeeded = this.calculateXpForLevel(level);
    }

    return level - 1;
  }

  /**
   * Calculate XP needed for a specific level
   * Formula: 5 * (level^2) + 50 * level + 100
   * @param level - Level
   */
  calculateXpForLevel(level: number): number {
    return 5 * level * level + 50 * level + 100;
  }

  /**
   * Check if a user leveled up and process it
   * @param guildId - Guild ID
   * @param botId - Bot ID
   * @param userId - User ID
   */
  async checkAndProcessLevelUp(
    guildId: string,
    botId: string,
    userId: string,
  ): Promise<any> {
    try {
      const userLevel = await this.prisma.userLevel.findUnique({
        where: {
          guildId_userId: {
            guildId,
            userId,
          },
        },
      });

      if (!userLevel) {
        return null;
      }

      const newLevel = this.calculateLevelFromXp(userLevel.xp);

      if (newLevel > userLevel.level) {
        const updated = await this.prisma.userLevel.update({
          where: {
            guildId_userId: {
              guildId,
              userId,
            },
          },
          data: {
            level: newLevel,
          },
        });

        return {
          leveledUp: true,
          oldLevel: userLevel.level,
          newLevel,
          user: updated,
        };
      }

      return { leveledUp: false };
    } catch (error) {
      this.logger.error(
        `Failed to check level up: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Reset a user's level data
   * @param guildId - Guild ID
   * @param userId - User ID
   */
  async resetUser(guildId: string, userId: string): Promise<any> {
    try {
      return await this.prisma.userLevel.deleteMany({
        where: {
          guildId,
          userId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to reset user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Reset all users' level data in a guild
   * @param guildId - Guild ID
   */
  async resetGuild(guildId: string): Promise<any> {
    try {
      return await this.prisma.userLevel.deleteMany({
        where: {
          guildId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to reset guild: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get weekly leaderboard
   * @param guildId - Guild ID
   */
  async getWeeklyLeaderboard(guildId: string): Promise<any> {
    try {
      const users = await this.prisma.userLevel.findMany({
        where: { guildId },
        orderBy: [{ weeklyXp: 'desc' }],
        take: 10,
      });

      return users.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get weekly leaderboard: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get monthly leaderboard
   * @param guildId - Guild ID
   */
  async getMonthlyLeaderboard(guildId: string): Promise<any> {
    try {
      const users = await this.prisma.userLevel.findMany({
        where: { guildId },
        orderBy: [{ monthlyXp: 'desc' }],
        take: 10,
      });

      return users.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get monthly leaderboard: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
