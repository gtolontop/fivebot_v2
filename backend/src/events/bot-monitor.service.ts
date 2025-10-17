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
    // DISABLED: This service is redundant with backend/src/bots/bot-monitor.service.ts
    // which already has a heartbeat check every 15 seconds with proper process verification.
    // This service was causing conflicts by marking bots as OFFLINE based only on updatedAt
    // without checking if the process is actually running.

    // console.log('⚠️ EventsModule BotMonitorService is disabled - using main BotMonitorService instead');
  }

  private async checkDeadBots() {
    // DISABLED - See onModuleInit comment
  }
}
