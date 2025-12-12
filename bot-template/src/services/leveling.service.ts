import { PrismaClient, UserLevel, LevelingConfig } from '@prisma/client';

export class LevelingService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Calculate the XP required for a specific level
   * Formula: 5 * (level^2) + 50 * level + 100
   */
  calculateXPForLevel(level: number): number {
    return 5 * (level ** 2) + 50 * level + 100;
  }

  /**
   * Calculate the level from total XP
   */
  calculateLevel(totalXp: number): number {
    let level = 1;
    let xpRequired = this.calculateXPForLevel(level);

    while (totalXp >= xpRequired) {
      totalXp -= xpRequired;
      level++;
      xpRequired = this.calculateXPForLevel(level);
    }

    return level;
  }

  /**
   * Get user level data or create if doesn't exist
   */
  async getUserLevel(guildId: string, userId: string, botId: string): Promise<UserLevel> {
    let userLevel = await this.prisma.userLevel.findUnique({
      where: {
        guildId_userId_botId: {
          guildId,
          userId,
          botId,
        },
      },
    });

    if (!userLevel) {
      userLevel = await this.prisma.userLevel.create({
        data: {
          guildId,
          userId,
          botId,
          xp: 0,
          level: 1,
          totalXp: 0,
          messageCount: 0,
        },
      });
    }

    return userLevel;
  }

  /**
   * Add XP to a user and handle level ups
   */
  async addXp(
    guildId: string,
    userId: string,
    botId: string,
    amount: number
  ): Promise<{ userLevel: UserLevel; leveledUp: boolean; newLevel?: number; oldLevel?: number }> {
    const userLevel = await this.getUserLevel(guildId, userId, botId);

    const oldLevel = userLevel.level;
    const newTotalXp = userLevel.totalXp + amount;
    const newLevel = this.calculateLevel(newTotalXp);

    // Calculate current level XP (XP within the current level)
    let currentLevelXp = newTotalXp;
    for (let i = 1; i < newLevel; i++) {
      currentLevelXp -= this.calculateXPForLevel(i);
    }

    const updatedUserLevel = await this.prisma.userLevel.update({
      where: {
        guildId_userId_botId: {
          guildId,
          userId,
          botId,
        },
      },
      data: {
        xp: currentLevelXp,
        level: newLevel,
        totalXp: newTotalXp,
        messageCount: { increment: 1 },
        lastMessageTime: new Date(),
      },
    });

    return {
      userLevel: updatedUserLevel,
      leveledUp: newLevel > oldLevel,
      newLevel: newLevel > oldLevel ? newLevel : undefined,
      oldLevel: newLevel > oldLevel ? oldLevel : undefined,
    };
  }

  /**
   * Remove XP from a user
   */
  async removeXp(
    guildId: string,
    userId: string,
    botId: string,
    amount: number
  ): Promise<UserLevel> {
    const userLevel = await this.getUserLevel(guildId, userId, botId);

    const newTotalXp = Math.max(0, userLevel.totalXp - amount);
    const newLevel = this.calculateLevel(newTotalXp);

    // Calculate current level XP
    let currentLevelXp = newTotalXp;
    for (let i = 1; i < newLevel; i++) {
      currentLevelXp -= this.calculateXPForLevel(i);
    }

    return await this.prisma.userLevel.update({
      where: {
        guildId_userId_botId: {
          guildId,
          userId,
          botId,
        },
      },
      data: {
        xp: currentLevelXp,
        level: newLevel,
        totalXp: newTotalXp,
      },
    });
  }

  /**
   * Set user level directly
   */
  async setLevel(
    guildId: string,
    userId: string,
    botId: string,
    level: number
  ): Promise<UserLevel> {
    // Calculate total XP needed for this level (minimum XP of the level)
    let totalXp = 0;
    for (let i = 1; i < level; i++) {
      totalXp += this.calculateXPForLevel(i);
    }

    const userLevel = await this.getUserLevel(guildId, userId, botId);

    return await this.prisma.userLevel.update({
      where: {
        guildId_userId_botId: {
          guildId,
          userId,
          botId,
        },
      },
      data: {
        level,
        xp: 0, // Start at the beginning of the level
        totalXp,
      },
    });
  }

  /**
   * Get leaderboard for a guild
   */
  async getLeaderboard(
    guildId: string,
    botId: string,
    type: 'all-time' | 'weekly' | 'monthly' = 'all-time',
    limit: number = 10
  ): Promise<UserLevel[]> {
    let dateFilter = {};

    if (type === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { updatedAt: { gte: weekAgo } };
    } else if (type === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { updatedAt: { gte: monthAgo } };
    }

    return await this.prisma.userLevel.findMany({
      where: {
        guildId,
        botId,
        ...dateFilter,
      },
      orderBy: [
        { totalXp: 'desc' },
        { level: 'desc' },
      ],
      take: limit,
    });
  }

  /**
   * Get user rank in guild
   */
  async getUserRank(guildId: string, userId: string, botId: string): Promise<number> {
    const userLevel = await this.getUserLevel(guildId, userId, botId);

    const higherRanked = await this.prisma.userLevel.count({
      where: {
        guildId,
        botId,
        OR: [
          { totalXp: { gt: userLevel.totalXp } },
          {
            totalXp: userLevel.totalXp,
            level: { gt: userLevel.level },
          },
        ],
      },
    });

    return higherRanked + 1;
  }

  /**
   * Get or create leveling config for a guild
   */
  async getLevelingConfig(guildId: string, botId: string): Promise<LevelingConfig> {
    let config = await this.prisma.levelingConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      config = await this.prisma.levelingConfig.create({
        data: {
          guildId,
          botId,
          enabled: true,
          xpPerMessage: 15,
          xpMin: 10,
          xpMax: 25,
          cooldownSeconds: 60,
          announceInChannel: true,
          stackRoles: false,
          resetOnLeave: false,
          allowMultipleLevels: true,
        },
      });
    }

    return config;
  }

  /**
   * Update leveling config
   */
  async updateLevelingConfig(
    guildId: string,
    data: Partial<Omit<LevelingConfig, 'id' | 'guildId' | 'botId' | 'createdAt' | 'updatedAt'>>
  ): Promise<LevelingConfig> {
    return await this.prisma.levelingConfig.update({
      where: { guildId },
      data,
    });
  }

  /**
   * Reset user level
   */
  async resetUserLevel(guildId: string, userId: string, botId: string): Promise<void> {
    await this.prisma.userLevel.update({
      where: {
        guildId_userId_botId: {
          guildId,
          userId,
          botId,
        },
      },
      data: {
        xp: 0,
        level: 1,
        totalXp: 0,
        messageCount: 0,
      },
    });
  }

  /**
   * Get XP required for next level
   */
  getXpForNextLevel(currentLevel: number): number {
    return this.calculateXPForLevel(currentLevel + 1);
  }

  /**
   * Generate a progress bar for XP
   */
  generateProgressBar(current: number, required: number, length: number = 10): string {
    const percentage = Math.min(current / required, 1);
    const filled = Math.floor(percentage * length);
    const empty = length - filled;

    const filledChar = '█';
    const emptyChar = '░';

    return filledChar.repeat(filled) + emptyChar.repeat(empty);
  }

  /**
   * Calculate XP percentage to next level
   */
  getXpPercentage(current: number, required: number): number {
    return Math.round((current / required) * 100);
  }
}

/**
 * Standalone function to get leveling service instance
 */
export async function getLevelingService(): Promise<LevelingService> {
  const { getPrismaClient } = await import('./prisma-singleton.service');
  const prisma = getPrismaClient();
  return new LevelingService(prisma);
}
