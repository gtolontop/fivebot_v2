import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ServerStatsService {
  constructor(private prisma: PrismaService) {}

  async getConfig(guildId: string, botId: string) {
    let config = await this.prisma.serverStatsConfig.findUnique({
      where: { guildId },
      include: { counters: true },
    });

    if (!config) {
      config = await this.prisma.serverStatsConfig.create({
        data: { guildId, botId, enabled: true },
        include: { counters: true },
      });
    }

    return config;
  }

  async updateConfig(guildId: string, botId: string, data: { enabled?: boolean; updateInterval?: number }) {
    return this.prisma.serverStatsConfig.upsert({
      where: { guildId },
      update: data,
      create: { guildId, botId, ...data },
    });
  }

  async createCounter(guildId: string, botId: string, dto: {
    channelId: string;
    counterType: string;
    template: string;
    targetRoleId?: string;
    channelTypes?: string[];
    customValue?: number;
  }) {
    const config = await this.getConfig(guildId, botId);

    return this.prisma.serverStatsCounter.create({
      data: {
        configId: config.id,
        guildId,
        channelId: dto.channelId,
        counterType: dto.counterType,
        template: dto.template,
        targetRoleId: dto.targetRoleId,
        channelTypes: dto.channelTypes ? JSON.stringify(dto.channelTypes) : null,
        customValue: dto.customValue,
      },
    });
  }

  async updateCounter(counterId: string, dto: {
    template?: string;
    counterType?: string;
    targetRoleId?: string;
    channelTypes?: string[];
    customValue?: number;
  }) {
    return this.prisma.serverStatsCounter.update({
      where: { id: counterId },
      data: {
        template: dto.template,
        counterType: dto.counterType,
        targetRoleId: dto.targetRoleId,
        channelTypes: dto.channelTypes ? JSON.stringify(dto.channelTypes) : undefined,
        customValue: dto.customValue,
      },
    });
  }

  async deleteCounter(counterId: string) {
    await this.prisma.serverStatsCounter.delete({ where: { id: counterId } });
    return { success: true };
  }

  async updateCounterValue(counterId: string, value: number) {
    return this.prisma.serverStatsCounter.update({
      where: { id: counterId },
      data: { lastValue: value, lastUpdated: new Date() },
    });
  }

  async getCountersToUpdate() {
    const configs = await this.prisma.serverStatsConfig.findMany({
      where: { enabled: true },
      include: { counters: true },
    });

    const countersToUpdate = [];
    const now = Date.now();

    for (const config of configs) {
      const intervalMs = config.updateInterval * 60 * 1000;

      for (const counter of config.counters) {
        const lastUpdate = counter.lastUpdated?.getTime() || 0;
        if (now - lastUpdate >= intervalMs) {
          countersToUpdate.push(counter);
        }
      }
    }

    return countersToUpdate;
  }
}
