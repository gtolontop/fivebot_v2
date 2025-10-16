import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsGateway } from './events.gateway';

@Injectable()
export class BotMonitorService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private gateway: EventsGateway,
  ) {}

  onModuleInit() {
    // Check every 5 seconds for dead bots
    setInterval(() => this.checkDeadBots(), 5000);
  }

  private async checkDeadBots() {
    try {
      const onlineBots = await this.prisma.bot.findMany({
        where: { status: 'ONLINE' },
        select: { id: true, updatedAt: true },
      });

      const now = new Date();
      for (const bot of onlineBots) {
        const secondsSinceUpdate = (now.getTime() - bot.updatedAt.getTime()) / 1000;

        // If no update in 15 seconds, mark as offline
        if (secondsSinceUpdate > 15) {
          await this.prisma.bot.update({
            where: { id: bot.id },
            data: { status: 'OFFLINE' },
          });

          this.gateway.emitBotStatus(bot.id, 'OFFLINE');
        }
      }
    } catch (error) {
      console.error('Error checking dead bots:', error);
    }
  }
}
