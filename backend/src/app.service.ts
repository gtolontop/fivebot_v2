import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from './common/prisma/prisma.service';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    console.log('🔄 Application starting - resetting bot statuses...');
    
    try {
      // Reset all bots to OFFLINE when backend starts
      // This ensures consistency after restarts
      const result = await this.prisma.bot.updateMany({
        where: {
          status: {
            in: ['ONLINE', 'STARTING', 'STOPPING']
          }
        },
        data: {
          status: 'OFFLINE'
        }
      });

      console.log(`✅ Reset ${result.count} bots to OFFLINE status`);

      // Also create logs for the status changes
      const affectedBots = await this.prisma.bot.findMany({
        where: {
          status: 'OFFLINE'
        },
        select: { id: true }
      });

      // Create job logs for each reset bot
      for (const bot of affectedBots) {
        await this.prisma.jobLog.create({
          data: {
            botId: bot.id,
            jobId: `startup-reset-${Date.now()}`,
            jobType: 'SYSTEM_STARTUP',
            status: 'COMPLETED',
            message: 'Bot status reset to OFFLINE due to backend restart'
          }
        });
      }

    } catch (error) {
      console.error('❌ Error resetting bot statuses on startup:', error);
    }
  }
}