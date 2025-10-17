import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole, Prisma } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== USERS ====================

  async getAllUsers(filters?: {
    search?: string;
    role?: UserRole;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (filters?.search) {
      where.OR = [
        { username: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { discordId: { contains: filters.search } },
      ];
    }

    if (filters?.role) {
      where.role = filters.role;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              bots: true,
              userModules: true,
              transactions: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        bots: true,
        userModules: {
          include: {
            module: true,
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        creditsHistory: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            bots: true,
            userModules: true,
            transactions: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserRole(userId: string, role: UserRole) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async adjustUserCredits(userId: string, amount: number, reason: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { username: true },
    });

    return this.prisma.$transaction(async (tx) => {
      // Update credits
      await tx.user.update({
        where: { id: userId },
        data: {
          credits: { increment: amount },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: amount > 0 ? 'ADMIN_GRANT' : 'ADMIN_DEDUCT',
          amount: Math.abs(amount),
          description: reason,
          metadata: JSON.stringify({
            adminId,
            adminUsername: admin?.username,
            previousBalance: user.credits,
            newBalance: user.credits + amount,
          }),
          status: 'COMPLETED',
        },
      });

      // Create credits history
      await tx.creditsHistory.create({
        data: {
          userId,
          amount,
          reason,
          type: amount > 0 ? 'ADMIN_ADJUSTMENT' : 'SPEND',
          metadata: JSON.stringify({
            adminId,
            adminUsername: admin?.username,
          }),
        },
      });

      return this.getUserById(userId);
    });
  }

  // ==================== BOTS ====================

  async getAllBots(filters?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.BotWhereInput = {};

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { clientId: { contains: filters.search } },
      ];
    }

    if (filters?.status) {
      where.status = filters.status as any;
    }

    const [bots, total] = await Promise.all([
      this.prisma.bot.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatar: true,
              email: true,
            },
          },
          _count: {
            select: {
              botModules: true,
              logs: true,
              collaborators: true,
            },
          },
        },
      }),
      this.prisma.bot.count({ where }),
    ]);

    return {
      bots,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getBotById(botId: string) {
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
      include: {
        owner: true,
        config: true,
        botModules: {
          include: {
            module: true,
          },
        },
        collaborators: {
          include: {
            user: true,
          },
        },
        hosts: true,
        _count: {
          select: {
            logs: true,
            metrics: true,
          },
        },
      },
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    return bot;
  }

  // ==================== MODULES ====================

  async getAllModulesAdmin() {
    return this.prisma.module.findMany({
      orderBy: [{ isCore: 'desc' }, { downloads: 'desc' }],
      include: {
        _count: {
          select: {
            userModules: true,
            botModules: true,
          },
        },
      },
    });
  }

  async createModule(data: any) {
    return this.prisma.module.create({
      data,
    });
  }

  async updateModule(moduleId: string, data: any) {
    return this.prisma.module.update({
      where: { id: moduleId },
      data,
    });
  }

  async toggleModuleActive(moduleId: string, isActive: boolean) {
    return this.prisma.module.update({
      where: { id: moduleId },
      data: { isActive },
    });
  }

  // ==================== TRANSACTIONS ====================

  async getAllTransactions(filters?: {
    userId?: string;
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.type) {
      where.type = filters.type as any;
    }

    if (filters?.status) {
      where.status = filters.status as any;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== STATS ====================

  async getDashboardStats() {
    const [
      totalUsers,
      totalBots,
      activeBots,
      totalModules,
      totalTransactions,
      totalCreditsDistributed,
      recentUsers,
      recentBots,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.bot.count(),
      this.prisma.bot.count({ where: { status: 'ONLINE' } }),
      this.prisma.module.count({ where: { isActive: true } }),
      this.prisma.transaction.count(),
      this.prisma.transaction.aggregate({
        where: { type: { in: ['ADMIN_GRANT', 'BONUS'] } },
        _sum: { amount: true },
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          username: true,
          avatar: true,
          createdAt: true,
          credits: true,
          role: true,
        },
      }),
      this.prisma.bot.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          owner: {
            select: {
              username: true,
            },
          },
        },
      }),
    ]);

    return {
      stats: {
        totalUsers,
        totalBots,
        activeBots,
        totalModules,
        totalTransactions,
        totalCreditsDistributed: totalCreditsDistributed._sum.amount || 0,
      },
      recentUsers,
      recentBots,
    };
  }
}
