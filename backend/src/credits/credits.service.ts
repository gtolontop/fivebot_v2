import { Injectable } from '@nestjs/common';
import { CreditType, CreditsHistory } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CreditsService {
  constructor(private prisma: PrismaService) {}

  async getUserCreditsHistory(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    history: CreditsHistory[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      this.prisma.creditsHistory.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              username: true,
            },
          },
        },
      }),
      this.prisma.creditsHistory.count({
        where: { userId },
      }),
    ]);

    return {
      history,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllCreditsHistory(
    page = 1,
    limit = 50,
  ): Promise<{
    history: CreditsHistory[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      this.prisma.creditsHistory.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              discordId: true,
            },
          },
        },
      }),
      this.prisma.creditsHistory.count(),
    ]);

    return {
      history,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCreditStats(): Promise<{
    totalSpent: number;
    totalEarned: number;
    totalUsers: number;
    averageCreditsPerUser: number;
    topSpenders: Array<{
      userId: string;
      username: string;
      totalSpent: number;
    }>;
  }> {
    // Get total spent and earned
    const [spentResult, earnedResult] = await Promise.all([
      this.prisma.creditsHistory.aggregate({
        where: { amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.creditsHistory.aggregate({
        where: { amount: { gt: 0 } },
        _sum: { amount: true },
      }),
    ]);

    // Get user stats
    const [totalUsers, userCredits] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.aggregate({
        _avg: { credits: true },
      }),
    ]);

    // Get top spenders
    const topSpenders = await this.prisma.creditsHistory.groupBy({
      by: ['userId'],
      where: { amount: { lt: 0 } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'asc' } },
      take: 10,
    });

    const topSpendersWithNames = await Promise.all(
      topSpenders.map(async (spender) => {
        const user = await this.prisma.user.findUnique({
          where: { id: spender.userId },
          select: { username: true },
        });
        return {
          userId: spender.userId,
          username: user?.username || 'Unknown',
          totalSpent: Math.abs(spender._sum.amount || 0),
        };
      }),
    );

    return {
      totalSpent: Math.abs(spentResult._sum.amount || 0),
      totalEarned: earnedResult._sum.amount || 0,
      totalUsers,
      averageCreditsPerUser: userCredits._avg.credits || 0,
      topSpenders: topSpendersWithNames,
    };
  }

  async addCreditsToUser(
    userId: string,
    amount: number,
    reason: string,
    type: CreditType = CreditType.ADMIN_ADJUSTMENT,
    metadata?: any,
  ): Promise<CreditsHistory> {
    return this.prisma.$transaction(
      async (tx) => {
        // Update user credits
        await tx.user.update({
          where: { id: userId },
          data: {
            credits: {
              increment: amount,
            },
          },
        });

        // Create history record
        return tx.creditsHistory.create({
          data: {
            userId,
            amount,
            reason,
            type,
            metadata,
          },
          include: {
            user: {
              select: {
                username: true,
                credits: true,
              },
            },
          },
        });
      },
      {
        maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
        timeout: 30000, // Maximum time for the transaction to complete (30 seconds)
        isolationLevel: 'ReadCommitted', // Use less strict isolation to reduce locks
      }
    );
  }

  async getUserBalance(userId: string): Promise<{ credits: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    return { credits: user?.credits || 0 };
  }
}