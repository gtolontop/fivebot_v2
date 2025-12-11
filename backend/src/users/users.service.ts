import { Injectable, NotFoundException } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

interface CreateUserDto {
  discordId: string;
  username: string;
  email?: string;
  avatar?: string;
  discordAccessToken?: string;
  discordRefreshToken?: string;
  discordTokenExpiry?: Date;
}

interface UpdateUserDto {
  username?: string;
  email?: string;
  avatar?: string;
  role?: UserRole;
  credits?: number;
  discordAccessToken?: string;
  discordRefreshToken?: string;
  discordTokenExpiry?: Date;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<User> {
    const defaultCredits = parseInt(process.env.DEFAULT_CREDITS) || 100;
    
    return this.prisma.user.create({
      data: {
        ...data,
        credits: defaultCredits,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        bots: {
          select: {
            id: true,
            name: true,
            status: true,
            isActive: true,
            createdAt: true,
          },
        },
        creditsHistory: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findByDiscordId(discordId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { discordId },
    });
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async addCredits(userId: string, amount: number, reason: string): Promise<User> {
    return this.prisma.$transaction(
      async (tx) => {
        // Update user credits
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            credits: {
              increment: amount,
            },
          },
        });

        // Log the credit transaction
        await tx.creditsHistory.create({
          data: {
            userId,
            amount,
          reason,
          type: amount > 0 ? 'PURCHASE' : 'SPEND',
        },
      });

        return user;
      },
      {
        maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
        timeout: 15000, // Maximum time for the transaction to complete (15 seconds - Prisma Accelerate limit)
        isolationLevel: 'ReadCommitted', // Use less strict isolation to reduce locks
      }
    );
  }

  async spendCredits(userId: string, amount: number, reason: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.credits < amount) {
      throw new Error('Insufficient credits');
    }

    return this.addCredits(userId, -amount, reason);
  }

  async findAll(page = 1, limit = 10): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          bots: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteAccount(userId: string): Promise<{ success: boolean; message: string }> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Use transaction to ensure all related data is deleted
    await this.prisma.$transaction(async (tx) => {
      // 1. Stop all running bots first (mark them as offline)
      await tx.bot.updateMany({
        where: { ownerId: userId },
        data: { status: 'OFFLINE' },
      });

      // 2. Delete bot collaborators where user is invited
      await tx.botCollaborator.deleteMany({
        where: { userId },
      });

      // 3. Delete audit logs
      await tx.auditLog.deleteMany({
        where: { userId },
      });

      // 4. Delete notifications
      await tx.notification.deleteMany({
        where: { userId },
      });

      // 5. Delete credits history
      await tx.creditsHistory.deleteMany({
        where: { userId },
      });

      // 6. Delete transactions
      await tx.transaction.deleteMany({
        where: { userId },
      });

      // 7. Delete user modules (purchased modules)
      await tx.userModule.deleteMany({
        where: { userId },
      });

      // 8. Delete all bots owned by user (this will cascade to bot configs, modules, tickets, etc.)
      const userBots = await tx.bot.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });

      for (const bot of userBots) {
        // Delete bot-related data
        await tx.botModule.deleteMany({ where: { botId: bot.id } });
        await tx.botCollaborator.deleteMany({ where: { botId: bot.id } });
        await tx.botLog.deleteMany({ where: { botId: bot.id } });
        await tx.jobLog.deleteMany({ where: { botId: bot.id } });
        await tx.botConfig.deleteMany({ where: { botId: bot.id } });
      }

      // Delete bots
      await tx.bot.deleteMany({
        where: { ownerId: userId },
      });

      // 9. Finally, delete the user
      await tx.user.delete({
        where: { id: userId },
      });
    }, {
      maxWait: 30000,
      timeout: 60000,
    });

    return {
      success: true,
      message: 'Account and all associated data have been permanently deleted',
    };
  }

  async getUserGuilds(userId: string): Promise<any[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        discordAccessToken: true,
        discordTokenExpiry: true,
      },
    });

    if (!user || !user.discordAccessToken) {
      throw new NotFoundException('Discord token not found. Please re-authenticate.');
    }

    // Check if token is expired
    if (user.discordTokenExpiry && new Date() > user.discordTokenExpiry) {
      throw new Error('Discord token expired. Please re-authenticate.');
    }

    // Fetch guilds from Discord API
    try {
      const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: {
          Authorization: `Bearer ${user.discordAccessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.statusText}`);
      }

      const guilds = await response.json();

      // Filter guilds where user has MANAGE_GUILD permission (0x00000020)
      return guilds.filter((guild: any) => (guild.permissions & 0x00000020) === 0x00000020);
    } catch (error) {
      console.error('Error fetching user guilds from Discord:', error);
      throw error;
    }
  }
}