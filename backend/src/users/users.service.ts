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
        timeout: 30000, // Maximum time for the transaction to complete (30 seconds)
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
}