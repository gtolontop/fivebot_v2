import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from './common/prisma/prisma.service';
import { BotStatus } from '@prisma/client';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    console.log('🔄 Application starting...');
    
    // Skip the status reset to avoid database lock issues
    // Let the bots keep their current status - users can manage them manually
    console.log('🚀 Application ready - bot statuses preserved from previous session');
    
    // Optional: Add a delay and then try to reset in background
    setTimeout(async () => {
      try {
        console.log('🔄 Attempting to reset bot statuses in background...');
        const result = await this.prisma.bot.updateMany({
          where: {
            status: {
              in: [BotStatus.STARTING, BotStatus.STOPPING] // Only reset transitional states
            }
          },
          data: {
            status: BotStatus.OFFLINE
          }
        });
        
        if (result.count > 0) {
          console.log(`✅ Reset ${result.count} bots from transitional states to OFFLINE`);
        }
      } catch (error) {
        console.log('⚠️ Could not reset bot statuses, will skip for now');
      }
    }, 5000); // Wait 5 seconds after app start
  }

  // Helper method to safely update bot status with retry logic
  async updateBotStatusSafely(botId: string, status: BotStatus, maxRetries: number = 3): Promise<boolean> {
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