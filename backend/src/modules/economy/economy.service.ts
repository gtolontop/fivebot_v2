import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EconomyTransType } from '@prisma/client';
import { GambleType } from './dto';

@Injectable()
export class EconomyService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CONFIG ====================

  async getConfig(guildId: string) {
    const config = await this.prisma.economyConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      throw new NotFoundException(`Economy config not found for guild ${guildId}`);
    }

    return config;
  }

  async getOrCreateConfig(guildId: string, botId: string) {
    let config = await this.prisma.economyConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      config = await this.prisma.economyConfig.create({
        data: {
          guildId,
          botId,
        },
      });
    }

    return config;
  }

  async updateConfig(guildId: string, data: any) {
    // Parse arrays from JSON strings if needed
    if (data.workResponses && typeof data.workResponses === 'string') {
      data.workResponses = JSON.parse(data.workResponses);
    }
    if (data.crimeResponses && typeof data.crimeResponses === 'string') {
      data.crimeResponses = JSON.parse(data.crimeResponses);
    }

    // Convert arrays to JSON strings for storage
    const updateData = { ...data };
    if (updateData.workResponses && Array.isArray(updateData.workResponses)) {
      updateData.workResponses = JSON.stringify(updateData.workResponses);
    }
    if (updateData.crimeResponses && Array.isArray(updateData.crimeResponses)) {
      updateData.crimeResponses = JSON.stringify(updateData.crimeResponses);
    }

    return this.prisma.economyConfig.update({
      where: { guildId },
      data: updateData,
    });
  }

  // ==================== USER ECONOMY ====================

  async getOrCreateUserEconomy(guildId: string, botId: string, userId: string) {
    let userEconomy = await this.prisma.userEconomy.findFirst({
      where: { guildId, userId },
    });

    if (!userEconomy) {
      const config = await this.getOrCreateConfig(guildId, botId);
      userEconomy = await this.prisma.userEconomy.create({
        data: {
          guildId,
          botId,
          userId,
          balance: config.startingBalance,
        },
      });
    }

    return userEconomy;
  }

  async getBalance(guildId: string, userId: string) {
    const userEconomy = await this.prisma.userEconomy.findFirst({
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

  async addMoney(
    guildId: string,
    botId: string,
    userId: string,
    amount: number,
    type: EconomyTransType,
    description?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const userEconomy = await this.getOrCreateUserEconomy(guildId, botId, userId);

      const balanceBefore = userEconomy.balance;
      const balanceAfter = balanceBefore + amount;

      // Update balance and total earned
      const updated = await tx.userEconomy.update({
        where: { id: userEconomy.id },
        data: {
          balance: balanceAfter,
          totalEarned: { increment: amount },
        },
      });

      // Record transaction
      await tx.economyTransaction.create({
        data: {
          economyId: userEconomy.id,
          type,
          amount,
          balanceBefore,
          balanceAfter,
          description,
        },
      });

      return updated;
    });
  }

  async removeMoney(
    guildId: string,
    botId: string,
    userId: string,
    amount: number,
    type: EconomyTransType,
    description?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const userEconomy = await this.getOrCreateUserEconomy(guildId, botId, userId);

      if (userEconomy.balance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      const balanceBefore = userEconomy.balance;
      const balanceAfter = balanceBefore - amount;

      // Update balance and total spent
      const updated = await tx.userEconomy.update({
        where: { id: userEconomy.id },
        data: {
          balance: balanceAfter,
          totalSpent: { increment: amount },
        },
      });

      // Record transaction
      await tx.economyTransaction.create({
        data: {
          economyId: userEconomy.id,
          type,
          amount: -amount,
          balanceBefore,
          balanceAfter,
          description,
        },
      });

      return updated;
    });
  }

  async transferMoney(guildId: string, fromUserId: string, toUserId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    if (fromUserId === toUserId) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    return this.prisma.$transaction(async (tx) => {
      const fromEconomy = await tx.userEconomy.findFirst({
        where: { guildId, userId: fromUserId },
      });

      if (!fromEconomy || fromEconomy.balance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      const toEconomy = await tx.userEconomy.findFirst({
        where: { guildId, userId: toUserId },
      });

      if (!toEconomy) {
        throw new NotFoundException('Target user not found');
      }

      // Remove from sender
      const fromBalanceBefore = fromEconomy.balance;
      const fromBalanceAfter = fromBalanceBefore - amount;

      await tx.userEconomy.update({
        where: { id: fromEconomy.id },
        data: { balance: fromBalanceAfter },
      });

      await tx.economyTransaction.create({
        data: {
          economyId: fromEconomy.id,
          type: EconomyTransType.TRANSFER_OUT,
          amount: -amount,
          balanceBefore: fromBalanceBefore,
          balanceAfter: fromBalanceAfter,
          targetUserId: toUserId,
          description: `Transfer to ${toUserId}`,
        },
      });

      // Add to receiver
      const toBalanceBefore = toEconomy.balance;
      const toBalanceAfter = toBalanceBefore + amount;

      await tx.userEconomy.update({
        where: { id: toEconomy.id },
        data: { balance: toBalanceAfter },
      });

      await tx.economyTransaction.create({
        data: {
          economyId: toEconomy.id,
          type: EconomyTransType.TRANSFER_IN,
          amount,
          balanceBefore: toBalanceBefore,
          balanceAfter: toBalanceAfter,
          targetUserId: fromUserId,
          description: `Transfer from ${fromUserId}`,
        },
      });

      return { fromUserId, toUserId, amount };
    });
  }

  // ==================== BANK ====================

  async deposit(guildId: string, userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const userEconomy = await tx.userEconomy.findFirst({
        where: { guildId, userId },
      });

      if (!userEconomy || userEconomy.balance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      const config = await tx.economyConfig.findUnique({
        where: { guildId },
      });

      // Check bank limit
      if (config?.maxBankBalance && userEconomy.bankBalance + amount > config.maxBankBalance) {
        throw new BadRequestException(`Bank balance limit is ${config.maxBankBalance}`);
      }

      const balanceBefore = userEconomy.balance;
      const balanceAfter = balanceBefore - amount;

      const updated = await tx.userEconomy.update({
        where: { id: userEconomy.id },
        data: {
          balance: balanceAfter,
          bankBalance: { increment: amount },
        },
      });

      await tx.economyTransaction.create({
        data: {
          economyId: userEconomy.id,
          type: EconomyTransType.BANK_DEPOSIT,
          amount: -amount,
          balanceBefore,
          balanceAfter,
          description: `Deposited ${amount} to bank`,
        },
      });

      return updated;
    });
  }

  async withdraw(guildId: string, userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const userEconomy = await tx.userEconomy.findFirst({
        where: { guildId, userId },
      });

      if (!userEconomy || userEconomy.bankBalance < amount) {
        throw new BadRequestException('Insufficient bank balance');
      }

      const balanceBefore = userEconomy.balance;
      const balanceAfter = balanceBefore + amount;

      const updated = await tx.userEconomy.update({
        where: { id: userEconomy.id },
        data: {
          balance: balanceAfter,
          bankBalance: { decrement: amount },
        },
      });

      await tx.economyTransaction.create({
        data: {
          economyId: userEconomy.id,
          type: EconomyTransType.BANK_WITHDRAW,
          amount,
          balanceBefore,
          balanceAfter,
          description: `Withdrew ${amount} from bank`,
        },
      });

      return updated;
    });
  }

  // ==================== DAILY/WORK/CRIME ====================

  async claimDaily(guildId: string, botId: string, userId: string) {
    const config = await this.getOrCreateConfig(guildId, botId);
    const userEconomy = await this.getOrCreateUserEconomy(guildId, botId, userId);

    // Check cooldown
    if (userEconomy.lastDaily) {
      const timeSince = Date.now() - userEconomy.lastDaily.getTime();
      const cooldown = config.dailyCooldown * 1000;
      if (timeSince < cooldown) {
        const timeLeft = Math.ceil((cooldown - timeSince) / 1000);
        throw new BadRequestException(`Daily reward on cooldown. ${timeLeft}s remaining`);
      }
    }

    // Check streak
    const isStreak = userEconomy.lastDaily
      ? Date.now() - userEconomy.lastDaily.getTime() < 48 * 60 * 60 * 1000
      : false;

    const newStreak = isStreak ? userEconomy.dailyStreak + 1 : 1;
    const streakBonus = Math.min(newStreak * 10, 100); // Max 100 bonus
    const amount = config.dailyAmount + streakBonus;

    return this.prisma.$transaction(async (tx) => {
      const balanceBefore = userEconomy.balance;
      const balanceAfter = balanceBefore + amount;

      const updated = await tx.userEconomy.update({
        where: { id: userEconomy.id },
        data: {
          balance: balanceAfter,
          totalEarned: { increment: amount },
          lastDaily: new Date(),
          dailyStreak: newStreak,
        },
      });

      await tx.economyTransaction.create({
        data: {
          economyId: userEconomy.id,
          type: EconomyTransType.DAILY,
          amount,
          balanceBefore,
          balanceAfter,
          description: `Daily reward (streak: ${newStreak})`,
        },
      });

      return { amount, streak: newStreak, streakBonus };
    });
  }

  async work(guildId: string, botId: string, userId: string) {
    const config = await this.getOrCreateConfig(guildId, botId);
    const userEconomy = await this.getOrCreateUserEconomy(guildId, botId, userId);

    // Check cooldown
    if (userEconomy.lastWork) {
      const timeSince = Date.now() - userEconomy.lastWork.getTime();
      const cooldown = config.workCooldown * 1000;
      if (timeSince < cooldown) {
        const timeLeft = Math.ceil((cooldown - timeSince) / 1000);
        throw new BadRequestException(`Work on cooldown. ${timeLeft}s remaining`);
      }
    }

    // Random amount
    const amount = Math.floor(
      Math.random() * (config.workMaxAmount - config.workMinAmount + 1) + config.workMinAmount,
    );

    // Random response
    let response = 'You worked and earned some money!';
    if (config.workResponses) {
      try {
        const responses = JSON.parse(config.workResponses);
        if (Array.isArray(responses) && responses.length > 0) {
          response = responses[Math.floor(Math.random() * responses.length)];
        }
      } catch (e) {
        // Use default response
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const balanceBefore = userEconomy.balance;
      const balanceAfter = balanceBefore + amount;

      const updated = await tx.userEconomy.update({
        where: { id: userEconomy.id },
        data: {
          balance: balanceAfter,
          totalEarned: { increment: amount },
          lastWork: new Date(),
        },
      });

      await tx.economyTransaction.create({
        data: {
          economyId: userEconomy.id,
          type: EconomyTransType.WORK,
          amount,
          balanceBefore,
          balanceAfter,
          description: response,
        },
      });

      return { amount, response };
    });
  }

  async crime(guildId: string, botId: string, userId: string) {
    const config = await this.getOrCreateConfig(guildId, botId);
    const userEconomy = await this.getOrCreateUserEconomy(guildId, botId, userId);

    // Check cooldown
    if (userEconomy.lastCrime) {
      const timeSince = Date.now() - userEconomy.lastCrime.getTime();
      const cooldown = config.crimeCooldown * 1000;
      if (timeSince < cooldown) {
        const timeLeft = Math.ceil((cooldown - timeSince) / 1000);
        throw new BadRequestException(`Crime on cooldown. ${timeLeft}s remaining`);
      }
    }

    const success = Math.random() * 100 < config.crimeSuccessRate;
    const baseAmount = Math.floor(
      Math.random() * (config.crimeMaxAmount - config.crimeMinAmount + 1) + config.crimeMinAmount,
    );

    let amount: number;
    let response: string;
    let transType: EconomyTransType;

    if (success) {
      amount = baseAmount;
      transType = EconomyTransType.CRIME;
      response = 'You successfully committed a crime!';
    } else {
      amount = -Math.floor(userEconomy.balance * (config.crimeFinePercent / 100));
      transType = EconomyTransType.TAX;
      response = 'You got caught! You had to pay a fine.';
    }

    // Default crime responses
    const crimeResponses = success
      ? ['You successfully robbed a store!', 'You hacked into a bank account!', 'You pickpocketed someone!']
      : ['You got caught by the police!', 'Security caught you!', 'A witness reported you!'];
    response = crimeResponses[Math.floor(Math.random() * crimeResponses.length)];

    return this.prisma.$transaction(async (tx) => {
      const balanceBefore = userEconomy.balance;
      const balanceAfter = Math.max(0, balanceBefore + amount);

      const updated = await tx.userEconomy.update({
        where: { id: userEconomy.id },
        data: {
          balance: balanceAfter,
          totalEarned: success ? { increment: amount } : undefined,
          totalSpent: !success ? { increment: Math.abs(amount) } : undefined,
          lastCrime: new Date(),
        },
      });

      await tx.economyTransaction.create({
        data: {
          economyId: userEconomy.id,
          type: transType,
          amount,
          balanceBefore,
          balanceAfter,
          description: response,
        },
      });

      return { success, amount: Math.abs(amount), response };
    });
  }

  async rob(guildId: string, botId: string, userId: string, targetId: string) {
    const config = await this.getOrCreateConfig(guildId, botId);

    if (!config.robEnabled) {
      throw new ForbiddenException('Robbing is disabled');
    }

    if (userId === targetId) {
      throw new BadRequestException('Cannot rob yourself');
    }

    const userEconomy = await this.getOrCreateUserEconomy(guildId, botId, userId);
    const targetEconomy = await this.getOrCreateUserEconomy(guildId, botId, targetId);

    // Check cooldown
    if (userEconomy.lastRob) {
      const timeSince = Date.now() - userEconomy.lastRob.getTime();
      const cooldown = config.robCooldown * 1000;
      if (timeSince < cooldown) {
        const timeLeft = Math.ceil((cooldown - timeSince) / 1000);
        throw new BadRequestException(`Rob on cooldown. ${timeLeft}s remaining`);
      }
    }

    // Check minimum balance requirements
    if (userEconomy.balance < config.robMinAmount) {
      throw new BadRequestException(`You need at least ${config.robMinAmount} to rob`);
    }

    if (targetEconomy.balance < config.robMinAmount) {
      throw new BadRequestException('Target has insufficient balance');
    }

    const success = Math.random() * 100 < config.robSuccessRate;
    const maxRobAmount = Math.floor(targetEconomy.balance * (config.robMaxPercent / 100));
    const robAmount = Math.floor(Math.random() * maxRobAmount);

    return this.prisma.$transaction(async (tx) => {
      if (success) {
        // Rob successful - steal money
        const userBalanceBefore = userEconomy.balance;
        const targetBalanceBefore = targetEconomy.balance;

        await tx.userEconomy.update({
          where: { id: userEconomy.id },
          data: {
            balance: userBalanceBefore + robAmount,
            totalEarned: { increment: robAmount },
            lastRob: new Date(),
          },
        });

        await tx.economyTransaction.create({
          data: {
            economyId: userEconomy.id,
            type: EconomyTransType.ROB,
            amount: robAmount,
            balanceBefore: userBalanceBefore,
            balanceAfter: userBalanceBefore + robAmount,
            targetUserId: targetId,
            description: `Robbed ${targetId}`,
          },
        });

        await tx.userEconomy.update({
          where: { id: targetEconomy.id },
          data: {
            balance: Math.max(0, targetBalanceBefore - robAmount),
          },
        });

        await tx.economyTransaction.create({
          data: {
            economyId: targetEconomy.id,
            type: EconomyTransType.ROBBED,
            amount: -robAmount,
            balanceBefore: targetBalanceBefore,
            balanceAfter: Math.max(0, targetBalanceBefore - robAmount),
            targetUserId: userId,
            description: `Robbed by ${userId}`,
          },
        });

        return { success: true, amount: robAmount };
      } else {
        // Rob failed - pay fine (use crime fine percent for robbery failures)
        const fine = Math.floor(userEconomy.balance * (config.crimeFinePercent / 100));
        const userBalanceBefore = userEconomy.balance;

        await tx.userEconomy.update({
          where: { id: userEconomy.id },
          data: {
            balance: Math.max(0, userBalanceBefore - fine),
            totalSpent: { increment: fine },
            lastRob: new Date(),
          },
        });

        await tx.economyTransaction.create({
          data: {
            economyId: userEconomy.id,
            type: EconomyTransType.TAX,
            amount: -fine,
            balanceBefore: userBalanceBefore,
            balanceAfter: Math.max(0, userBalanceBefore - fine),
            targetUserId: targetId,
            description: 'Rob failed - paid fine',
          },
        });

        return { success: false, amount: fine };
      }
    });
  }

  // ==================== GAMBLING ====================

  async gamble(guildId: string, botId: string, userId: string, amount: number, type: GambleType) {
    const config = await this.getOrCreateConfig(guildId, botId);

    if (!config.gamblingEnabled) {
      throw new ForbiddenException('Gambling is disabled');
    }

    if (amount < config.gamblingMinBet) {
      throw new BadRequestException(`Minimum bet is ${config.gamblingMinBet}`);
    }

    if (amount > config.gamblingMaxBet) {
      throw new BadRequestException(`Maximum bet is ${config.gamblingMaxBet}`);
    }

    const userEconomy = await this.getOrCreateUserEconomy(guildId, botId, userId);

    if (userEconomy.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    let won = false;
    let winAmount = 0;
    let result: any = {};

    switch (type) {
      case GambleType.SLOTS:
        result = this.playSlots();
        won = result.won;
        winAmount = won ? amount * result.multiplier : 0;
        break;

      case GambleType.COINFLIP:
        result = this.playCoinflip();
        won = result.won;
        winAmount = won ? amount * 2 : 0;
        break;

      case GambleType.DICE:
        result = this.playDice();
        won = result.won;
        winAmount = won ? amount * result.multiplier : 0;
        break;

      default:
        throw new BadRequestException('Invalid gamble type');
    }

    return this.prisma.$transaction(async (tx) => {
      const balanceBefore = userEconomy.balance;
      const netChange = won ? winAmount - amount : -amount;
      const balanceAfter = balanceBefore + netChange;

      const updated = await tx.userEconomy.update({
        where: { id: userEconomy.id },
        data: {
          balance: balanceAfter,
          totalEarned: won ? { increment: winAmount - amount } : undefined,
          totalSpent: !won ? { increment: amount } : undefined,
        },
      });

      await tx.economyTransaction.create({
        data: {
          economyId: userEconomy.id,
          type: won ? EconomyTransType.GAMBLE_WIN : EconomyTransType.GAMBLE_LOSE,
          amount: netChange,
          balanceBefore,
          balanceAfter,
          description: `${type} - ${won ? 'Won' : 'Lost'}`,
          metadata: JSON.stringify(result),
        },
      });

      return { won, amount: won ? winAmount : amount, netChange, result };
    });
  }

  private playSlots() {
    const symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣'];
    const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
    const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
    const reel3 = symbols[Math.floor(Math.random() * symbols.length)];

    let won = false;
    let multiplier = 0;

    if (reel1 === reel2 && reel2 === reel3) {
      won = true;
      multiplier = reel1 === '7️⃣' ? 10 : reel1 === '💎' ? 5 : 3;
    } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
      won = true;
      multiplier = 2;
    }

    return { won, multiplier, reels: [reel1, reel2, reel3] };
  }

  private playCoinflip() {
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = Math.random() < 0.5;
    return { won, result };
  }

  private playDice() {
    const roll = Math.floor(Math.random() * 6) + 1;
    let won = false;
    let multiplier = 0;

    if (roll === 6) {
      won = true;
      multiplier = 4;
    } else if (roll >= 4) {
      won = true;
      multiplier = 2;
    }

    return { won, multiplier, roll };
  }

  // ==================== INTEREST ====================

  async processInterest(guildId: string) {
    const config = await this.prisma.economyConfig.findUnique({
      where: { guildId },
    });

    if (!config || config.bankInterestRate <= 0) {
      return { processed: 0 };
    }

    const users = await this.prisma.userEconomy.findMany({
      where: {
        guildId,
        bankBalance: { gt: 0 },
      },
    });

    let processed = 0;

    for (const user of users) {
      // Check if interest interval has passed
      if (user.lastInterest) {
        const timeSince = Date.now() - user.lastInterest.getTime();
        const interval = config.bankInterestInterval * 1000;
        if (timeSince < interval) {
          continue;
        }
      }

      const interest = Math.floor(user.bankBalance * (config.bankInterestRate / 100));

      if (interest > 0) {
        await this.prisma.$transaction(async (tx) => {
          const balanceBefore = user.balance;
          const balanceAfter = balanceBefore + interest;

          await tx.userEconomy.update({
            where: { id: user.id },
            data: {
              balance: balanceAfter,
              totalEarned: { increment: interest },
              lastInterest: new Date(),
            },
          });

          await tx.economyTransaction.create({
            data: {
              economyId: user.id,
              type: EconomyTransType.INTEREST,
              amount: interest,
              balanceBefore,
              balanceAfter,
              description: `Bank interest (${config.bankInterestRate}%)`,
            },
          });
        });

        processed++;
      }
    }

    return { processed };
  }

  // ==================== LEADERBOARD & STATS ====================

  async getLeaderboard(guildId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.userEconomy.findMany({
        where: { guildId },
        orderBy: [{ balance: 'desc' }, { bankBalance: 'desc' }],
        skip,
        take: limit,
        select: {
          userId: true,
          balance: true,
          bankBalance: true,
          totalEarned: true,
          totalSpent: true,
          dailyStreak: true,
        },
      }),
      this.prisma.userEconomy.count({ where: { guildId } }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserStats(guildId: string, userId: string) {
    const userEconomy = await this.prisma.userEconomy.findFirst({
      where: { guildId, userId },
      include: {
        inventory: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!userEconomy) {
      return null;
    }

    const [transactionCount, recentTransactions] = await Promise.all([
      this.prisma.economyTransaction.count({
        where: { economyId: userEconomy.id },
      }),
      this.prisma.economyTransaction.findMany({
        where: { economyId: userEconomy.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      ...userEconomy,
      transactionCount,
      recentTransactions,
      netWorth: userEconomy.balance + userEconomy.bankBalance,
    };
  }

  async resetUser(guildId: string, userId: string) {
    const userEconomy = await this.prisma.userEconomy.findFirst({
      where: { guildId, userId },
    });

    if (!userEconomy) {
      throw new NotFoundException('User economy not found');
    }

    const config = await this.prisma.economyConfig.findUnique({
      where: { guildId },
    });

    return this.prisma.userEconomy.update({
      where: { id: userEconomy.id },
      data: {
        balance: config?.startingBalance || 0,
        bankBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastDaily: null,
        lastWork: null,
        lastCrime: null,
        lastRob: null,
        lastInterest: null,
        dailyStreak: 0,
      },
    });
  }

  async getTransactionHistory(guildId: string, userId: string, page: number = 1, limit: number = 20) {
    const userEconomy = await this.prisma.userEconomy.findFirst({
      where: { guildId, userId },
    });

    if (!userEconomy) {
      return {
        transactions: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.economyTransaction.findMany({
        where: { economyId: userEconomy.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.economyTransaction.count({
        where: { economyId: userEconomy.id },
      }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
