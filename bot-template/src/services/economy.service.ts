/**
 * Economy Service
 * Handles all economy operations for the Discord bot
 */

import { PrismaClient } from '@prisma/client';
import prisma from './prisma-singleton.service';

export interface EconomyConfig {
  currencyName: string;
  currencySymbol: string;
  currencyEmoji?: string | null;
  startingBalance: number;
  dailyAmount: number;
  dailyCooldown: number;
  workMinAmount: number;
  workMaxAmount: number;
  workCooldown: number;
  crimeEnabled: boolean;
  crimeMinAmount: number;
  crimeMaxAmount: number;
  crimeSuccessRate: number;
  crimeFinePercent: number;
  crimeCooldown: number;
  robEnabled: boolean;
  robMinAmount: number;
  robMaxPercent: number;
  robSuccessRate: number;
  robCooldown: number;
  gamblingEnabled: boolean;
  gamblingMinBet: number;
  gamblingMaxBet?: number | null;
  bankEnabled: boolean;
  maxBankBalance?: number | null;
  dailyStreakEnabled: boolean;
  streakBonusPercent: number;
  maxStreakBonus: number;
}

export interface UserEconomy {
  id: string;
  guildId: string;
  userId: string;
  balance: number;
  bankBalance: number;
  totalEarned: number;
  totalSpent: number;
  lastDaily?: Date | null;
  lastWork?: Date | null;
  lastCrime?: Date | null;
  lastRob?: Date | null;
  dailyStreak: number;
  longestStreak: number;
  workCount: number;
  crimeCount: number;
  crimeSuccesses: number;
  robCount: number;
  robSuccesses: number;
  timesRobbed: number;
  gamblingWins: number;
  gamblingLosses: number;
}

export class EconomyService {
  /**
   * Get or create economy config for a guild
   */
  static async getOrCreateConfig(guildId: string, botId: string): Promise<EconomyConfig> {
    let config = await prisma.economyConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      config = await prisma.economyConfig.create({
        data: {
          guildId,
          botId,
        },
      });
    }

    return config as EconomyConfig;
  }

  /**
   * Get or create user economy
   */
  static async getOrCreateUserEconomy(
    guildId: string,
    botId: string,
    userId: string
  ): Promise<UserEconomy> {
    let userEconomy = await prisma.userEconomy.findFirst({
      where: { guildId, userId },
    });

    if (!userEconomy) {
      const config = await this.getOrCreateConfig(guildId, botId);
      userEconomy = await prisma.userEconomy.create({
        data: {
          guildId,
          botId,
          userId,
          balance: config.startingBalance,
        },
      });
    }

    return userEconomy as UserEconomy;
  }

  /**
   * Get user balance
   */
  static async getBalance(
    guildId: string,
    userId: string
  ): Promise<{ balance: number; bankBalance: number; totalEarned: number; totalSpent: number }> {
    const userEconomy = await prisma.userEconomy.findFirst({
      where: { guildId, userId },
    });

    if (!userEconomy) {
      return {
        balance: 0,
        bankBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
      };
    }

    return {
      balance: userEconomy.balance,
      bankBalance: userEconomy.bankBalance,
      totalEarned: userEconomy.totalEarned,
      totalSpent: userEconomy.totalSpent,
    };
  }

  /**
   * Add money to user balance
   */
  static async addMoney(
    guildId: string,
    botId: string,
    userId: string,
    amount: number,
    type: string,
    description?: string
  ): Promise<UserEconomy> {
    const userEconomy = await this.getOrCreateUserEconomy(guildId, botId, userId);

    const updated = await prisma.userEconomy.update({
      where: { id: userEconomy.id },
      data: {
        balance: { increment: amount },
        totalEarned: { increment: amount },
      },
    });

    // Record transaction
    await prisma.economyTransaction.create({
      data: {
        guildId,
        botId,
        userId,
        economyId: userEconomy.id,
        type: type as any,
        amount,
        balanceBefore: userEconomy.balance,
        balanceAfter: updated.balance,
        description,
      },
    });

    return updated as UserEconomy;
  }

  /**
   * Remove money from user balance
   */
  static async removeMoney(
    guildId: string,
    userId: string,
    amount: number,
    type: string,
    description?: string
  ): Promise<UserEconomy> {
    const userEconomy = await prisma.userEconomy.findFirst({
      where: { guildId, userId },
    });

    if (!userEconomy || userEconomy.balance < amount) {
      throw new Error('Insufficient balance');
    }

    const updated = await prisma.userEconomy.update({
      where: { id: userEconomy.id },
      data: {
        balance: { decrement: amount },
        totalSpent: { increment: amount },
      },
    });

    // Record transaction
    await prisma.economyTransaction.create({
      data: {
        guildId,
        botId: userEconomy.botId,
        userId,
        economyId: userEconomy.id,
        type: type as any,
        amount: -amount,
        balanceBefore: userEconomy.balance,
        balanceAfter: updated.balance,
        description,
      },
    });

    return updated as UserEconomy;
  }

  /**
   * Transfer money between users
   */
  static async transferMoney(
    guildId: string,
    fromUserId: string,
    toUserId: string,
    amount: number
  ): Promise<void> {
    if (fromUserId === toUserId) {
      throw new Error('Cannot transfer to yourself');
    }

    const fromEconomy = await prisma.userEconomy.findFirst({
      where: { guildId, userId: fromUserId },
    });

    if (!fromEconomy || fromEconomy.balance < amount) {
      throw new Error('Insufficient balance');
    }

    const toEconomy = await prisma.userEconomy.findFirst({
      where: { guildId, userId: toUserId },
    });

    if (!toEconomy) {
      throw new Error('Target user not found');
    }

    await prisma.$transaction([
      prisma.userEconomy.update({
        where: { id: fromEconomy.id },
        data: { balance: { decrement: amount } },
      }),
      prisma.economyTransaction.create({
        data: {
          guildId,
          botId: fromEconomy.botId,
          userId: fromUserId,
          economyId: fromEconomy.id,
          type: 'TRANSFER_OUT',
          amount: -amount,
          balanceBefore: fromEconomy.balance,
          balanceAfter: fromEconomy.balance - amount,
          targetUserId: toUserId,
          description: `Transfer to ${toUserId}`,
        },
      }),
      prisma.userEconomy.update({
        where: { id: toEconomy.id },
        data: { balance: { increment: amount } },
      }),
      prisma.economyTransaction.create({
        data: {
          guildId,
          botId: toEconomy.botId,
          userId: toUserId,
          economyId: toEconomy.id,
          type: 'TRANSFER_IN',
          amount,
          balanceBefore: toEconomy.balance,
          balanceAfter: toEconomy.balance + amount,
          targetUserId: fromUserId,
          description: `Transfer from ${fromUserId}`,
        },
      }),
    ]);
  }

  /**
   * Deposit money to bank
   */
  static async deposit(guildId: string, userId: string, amount: number): Promise<UserEconomy> {
    const userEconomy = await prisma.userEconomy.findFirst({
      where: { guildId, userId },
    });

    if (!userEconomy || userEconomy.balance < amount) {
      throw new Error('Insufficient balance');
    }

    const config = await prisma.economyConfig.findUnique({
      where: { guildId },
    });

    if (config?.maxBankBalance && userEconomy.bankBalance + amount > config.maxBankBalance) {
      throw new Error(`Bank balance limit is ${config.maxBankBalance}`);
    }

    const updated = await prisma.userEconomy.update({
      where: { id: userEconomy.id },
      data: {
        balance: { decrement: amount },
        bankBalance: { increment: amount },
      },
    });

    await prisma.economyTransaction.create({
      data: {
        guildId,
        botId: userEconomy.botId,
        userId,
        economyId: userEconomy.id,
        type: 'BANK_DEPOSIT',
        amount,
        balanceBefore: userEconomy.balance,
        balanceAfter: updated.balance,
        description: 'Bank deposit',
      },
    });

    return updated as UserEconomy;
  }

  /**
   * Withdraw money from bank
   */
  static async withdraw(guildId: string, userId: string, amount: number): Promise<UserEconomy> {
    const userEconomy = await prisma.userEconomy.findFirst({
      where: { guildId, userId },
    });

    if (!userEconomy || userEconomy.bankBalance < amount) {
      throw new Error('Insufficient bank balance');
    }

    const updated = await prisma.userEconomy.update({
      where: { id: userEconomy.id },
      data: {
        balance: { increment: amount },
        bankBalance: { decrement: amount },
      },
    });

    await prisma.economyTransaction.create({
      data: {
        guildId,
        botId: userEconomy.botId,
        userId,
        economyId: userEconomy.id,
        type: 'BANK_WITHDRAW',
        amount,
        balanceBefore: userEconomy.balance,
        balanceAfter: updated.balance,
        description: 'Bank withdrawal',
      },
    });

    return updated as UserEconomy;
  }

  /**
   * Check if cooldown is active
   */
  static isCooldownActive(lastTime: Date | null | undefined, cooldownSeconds: number): boolean {
    if (!lastTime) return false;
    const now = Date.now();
    const elapsed = now - lastTime.getTime();
    return elapsed < cooldownSeconds * 1000;
  }

  /**
   * Get remaining cooldown time
   */
  static getRemainingCooldown(lastTime: Date | null | undefined, cooldownSeconds: number): number {
    if (!lastTime) return 0;
    const now = Date.now();
    const elapsed = now - lastTime.getTime();
    const remaining = cooldownSeconds * 1000 - elapsed;
    return Math.max(0, Math.ceil(remaining / 1000));
  }

  /**
   * Format cooldown time
   */
  static formatCooldown(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Get leaderboard
   */
  static async getLeaderboard(guildId: string, limit: number = 10): Promise<UserEconomy[]> {
    const users = await prisma.userEconomy.findMany({
      where: { guildId },
      orderBy: [
        { balance: 'desc' },
        { bankBalance: 'desc' },
      ],
      take: limit,
    });

    return users as UserEconomy[];
  }

  /**
   * Get shop items
   */
  static async getShopItems(guildId: string, category?: string) {
    const config = await prisma.economyConfig.findUnique({
      where: { guildId },
      include: {
        shopItems: {
          where: {
            isActive: true,
            isHidden: false,
            ...(category ? { category } : {}),
          },
          orderBy: { price: 'asc' },
        },
      },
    });

    return config?.shopItems || [];
  }

  /**
   * Get user inventory
   */
  static async getInventory(guildId: string, userId: string) {
    const userEconomy = await prisma.userEconomy.findFirst({
      where: { guildId, userId },
      include: {
        inventory: {
          include: {
            item: true,
          },
          where: {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        },
      },
    });

    return userEconomy?.inventory || [];
  }

  /**
   * Buy item from shop
   */
  static async buyItem(guildId: string, userId: string, itemId: string): Promise<void> {
    const userEconomy = await prisma.userEconomy.findFirst({
      where: { guildId, userId },
    });

    if (!userEconomy) {
      throw new Error('User economy not found');
    }

    const item = await prisma.shopItem.findUnique({
      where: { id: itemId },
    });

    if (!item || !item.isActive) {
      throw new Error('Item not found or not available');
    }

    if (userEconomy.balance < item.price) {
      throw new Error('Insufficient balance');
    }

    // Check stock
    if (item.maxStock !== null && item.currentStock !== null && item.currentStock <= 0) {
      throw new Error('Item out of stock');
    }

    // Check max owned
    const ownedCount = await prisma.userInventory.count({
      where: {
        economyId: userEconomy.id,
        itemId: item.id,
      },
    });

    if (ownedCount >= item.maxOwned) {
      throw new Error(`You can only own ${item.maxOwned} of this item`);
    }

    // Purchase item
    await prisma.$transaction([
      prisma.userEconomy.update({
        where: { id: userEconomy.id },
        data: {
          balance: { decrement: item.price },
          totalSpent: { increment: item.price },
        },
      }),
      prisma.economyTransaction.create({
        data: {
          guildId,
          botId: userEconomy.botId,
          userId,
          economyId: userEconomy.id,
          type: 'SHOP_BUY',
          amount: -item.price,
          balanceBefore: userEconomy.balance,
          balanceAfter: userEconomy.balance - item.price,
          description: `Bought ${item.name}`,
        },
      }),
      prisma.userInventory.upsert({
        where: {
          economyId_itemId: {
            economyId: userEconomy.id,
            itemId: item.id,
          },
        },
        create: {
          economyId: userEconomy.id,
          itemId: item.id,
          quantity: 1,
          expiresAt: item.duration ? new Date(Date.now() + item.duration * 1000) : null,
        },
        update: {
          quantity: { increment: 1 },
        },
      }),
      ...(item.currentStock !== null
        ? [
            prisma.shopItem.update({
              where: { id: item.id },
              data: { currentStock: { decrement: 1 } },
            }),
          ]
        : []),
    ]);
  }

  /**
   * Update daily streak
   */
  static async updateDailyStreak(userEconomy: UserEconomy): Promise<number> {
    const now = new Date();
    const lastDaily = userEconomy.lastDaily;

    let newStreak = 1;

    if (lastDaily) {
      const hoursSinceLastDaily = (now.getTime() - lastDaily.getTime()) / (1000 * 60 * 60);

      // If claimed within 48 hours, continue streak
      if (hoursSinceLastDaily <= 48) {
        newStreak = userEconomy.dailyStreak + 1;
      }
    }

    const longestStreak = Math.max(userEconomy.longestStreak, newStreak);

    await prisma.userEconomy.update({
      where: { id: userEconomy.id },
      data: {
        lastDaily: now,
        dailyStreak: newStreak,
        longestStreak,
      },
    });

    return newStreak;
  }
}
