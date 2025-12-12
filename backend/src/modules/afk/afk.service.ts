import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AfkService {
  constructor(private prisma: PrismaService) {}

  async getConfig(guildId: string, botId: string) {
    let config = await this.prisma.afkConfig.findUnique({
      where: { guildId },
      include: { users: true },
    });

    if (!config) {
      config = await this.prisma.afkConfig.create({
        data: { guildId, botId, enabled: true },
        include: { users: true },
      });
    }

    return config;
  }

  async updateConfig(guildId: string, botId: string, data: {
    enabled?: boolean;
    mentionResponse?: boolean;
    nicknamePrefix?: string;
    updateNickname?: boolean;
    ignoredChannels?: string[];
    ignoredRoles?: string[];
  }) {
    return this.prisma.afkConfig.upsert({
      where: { guildId },
      update: {
        ...data,
        ignoredChannels: data.ignoredChannels ? JSON.stringify(data.ignoredChannels) : undefined,
        ignoredRoles: data.ignoredRoles ? JSON.stringify(data.ignoredRoles) : undefined,
      },
      create: {
        guildId,
        botId,
        ...data,
        ignoredChannels: data.ignoredChannels ? JSON.stringify(data.ignoredChannels) : null,
        ignoredRoles: data.ignoredRoles ? JSON.stringify(data.ignoredRoles) : null,
      },
    });
  }

  async setAfk(guildId: string, userId: string, reason?: string, originalNickname?: string) {
    const config = await this.prisma.afkConfig.findUnique({ where: { guildId } });
    if (!config) return null;

    return this.prisma.afkUser.upsert({
      where: { configId_userId: { configId: config.id, userId } },
      update: { reason, setAt: new Date(), mentions: 0, originalNickname },
      create: { configId: config.id, guildId, userId, reason, originalNickname },
    });
  }

  async removeAfk(guildId: string, userId: string) {
    const config = await this.prisma.afkConfig.findUnique({ where: { guildId } });
    if (!config) return null;

    try {
      const user = await this.prisma.afkUser.delete({
        where: { configId_userId: { configId: config.id, userId } },
      });
      return user;
    } catch {
      return null;
    }
  }

  async getAfkUser(guildId: string, userId: string) {
    const config = await this.prisma.afkConfig.findUnique({ where: { guildId } });
    if (!config) return null;

    return this.prisma.afkUser.findUnique({
      where: { configId_userId: { configId: config.id, userId } },
    });
  }

  async incrementMentions(guildId: string, userId: string) {
    const config = await this.prisma.afkConfig.findUnique({ where: { guildId } });
    if (!config) return null;

    return this.prisma.afkUser.update({
      where: { configId_userId: { configId: config.id, userId } },
      data: { mentions: { increment: 1 } },
    });
  }

  async getAfkUsers(guildId: string) {
    const config = await this.prisma.afkConfig.findUnique({
      where: { guildId },
      include: { users: true },
    });

    return config?.users || [];
  }
}
