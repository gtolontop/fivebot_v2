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
      await this.resetBotStatusesWithRetry();
    }, 5000); // Wait 5 seconds after app start
  }

  // Helper method to reset bot statuses with retry logic and exponential backoff
  private async resetBotStatusesWithRetry(maxRetries: number = 3): Promise<void> {
    const baseDelay = 1000; // Start with 1 second delay
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempting to reset bot statuses (attempt ${attempt}/${maxRetries})...`);
        
        // Use a transaction with a timeout to prevent long locks
        const result = await this.prisma.$transaction(
          async (tx) => {
            return await tx.bot.updateMany({
              where: {
                status: {
                  in: [BotStatus.STARTING, BotStatus.STOPPING] // Only reset transitional states
                }
              },
              data: {
                status: BotStatus.OFFLINE
              }
            });
          },
          {
            maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
            timeout: 60000, // Maximum time for the transaction to complete (60 seconds)
            isolationLevel: 'ReadCommitted', // Use less strict isolation to reduce locks
          }
        );
        
        if (result.count > 0) {
          console.log(`✅ Successfully reset ${result.count} bots from transitional states to OFFLINE`);
        } else {
          console.log('✅ No bots needed to be reset');
        }
        
        return; // Success, exit the retry loop
        
      } catch (error) {
        const isLockTimeout = 
          error.code === 'P2034' || // Prisma transaction failed
          error.code === 'ER_LOCK_WAIT_TIMEOUT' || // MySQL lock wait timeout
          error.message?.includes('lock') ||
          error.message?.includes('timeout');
        
        if (isLockTimeout && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff: 1s, 2s, 4s
          console.log(`⚠️ Lock timeout detected, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Final attempt failed or non-retryable error
        console.error(`❌ Failed to reset bot statuses after ${attempt} attempts:`, {
          code: error.code,
          message: error.message
        });
        console.log('⚠️ Bot statuses will remain in their current state');
      }
    }
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