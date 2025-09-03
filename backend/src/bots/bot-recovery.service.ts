import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class BotRecoveryService {
  private readonly logger = new Logger(BotRecoveryService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  // Temporarily disabled - recovery service
  async onApplicationBootstrap() {
    this.logger.log('🔄 Bot recovery temporarily disabled');
  }

  async enableAutoRestart(botId: string): Promise<void> {
    // Temporarily disabled
  }

  async disableAutoRestart(botId: string): Promise<void> {
    // Temporarily disabled
  }

  async triggerManualRecovery(): Promise<{ recovered: number; failed: number }> {
    return { recovered: 0, failed: 0 };
  }
}