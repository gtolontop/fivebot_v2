import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from './common/prisma/prisma.service';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    console.log('🔄 Application starting - resetting bot statuses...');
    
    try {
      // Simple approach: reset all non-offline bots to offline on startup
      // This prevents concurrency issues and ensures clean state
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

      console.log(`✅ Reset ${result.count} bots to OFFLINE status on startup`);
      console.log('🚀 Application ready - all bots are now offline and can be started manually');

    } catch (error) {
      console.error('❌ Error resetting bot statuses on startup:', error);
    }
  }

  // Helper method to safely update bot status with retry logic
  async updateBotStatusSafely(botId: string, status: string, maxRetries: number = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.prisma.bot.update({
          where: { id: botId },
          data: { 
            status,
            updatedAt: new Date()
          }
        });
        return true;
      } catch (error) {
        if (error.code === 1020 && attempt < maxRetries) {
          // MySQL record changed error - wait and retry
          console.log(`⚠️ Retrying bot status update (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
          continue;
        }
        console.error(`❌ Failed to update bot status after ${attempt} attempts:`, error);
        return false;
      }
    }
    return false;
  }
}