import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { DiscordService } from '../common/discord/discord.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { BotsService } from './bots.service';

@Injectable()
export class BotMonitorService {
  constructor(
    private prisma: PrismaService,
    private discordService: DiscordService,
    private encryptionService: EncryptionService,
    @Inject(forwardRef(() => BotsService))
    private botsService: BotsService,
  ) {}

  // Aggressive heartbeat check every 15 seconds
  /**
   * Helper method to update bot status with retry logic and exponential backoff
   * @param botId - The bot ID to update
   * @param data - The data to update
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @param initialDelay - Initial delay in milliseconds (default: 100)
   */
  private async updateBotWithRetry(
    botId: string,
    data: any,
    maxRetries: number = 3,
    initialDelay: number = 100
  ): Promise<void> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.prisma.bot.update({
          where: { id: botId },
          data
        });
        return; // Success, exit the function
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          // Calculate exponential backoff delay
          const delay = initialDelay * Math.pow(2, attempt);
          console.log(`⚠️ Bot update failed for ${botId}, attempt ${attempt + 1}/${maxRetries + 1}. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    console.error(`❌ Failed to update bot ${botId} after ${maxRetries + 1} attempts:`, lastError);
    throw lastError;
  }

  @Cron('*/15 * * * * *')
  async heartbeatCheck() {
    try {
      console.log('💓 Heartbeat check starting...');
      
      // Quick check for obvious mismatches
      const allBots = await this.prisma.bot.findMany({
        select: { id: true, name: true, status: true }
      });

      let corrections = 0;
      
      for (const bot of allBots) {
        // Get running status from queue service
        const queueService = this.botsService.queueService as any;
        const isProcessRunning = queueService?.getRunningBots?.().includes(bot.id) ?? false;
        
        // Quick correction for obvious mismatches
        if (bot.status === 'ONLINE' && !isProcessRunning) {
          console.log(`💓 Heartbeat correcting bot ${bot.id} (${bot.name}): ONLINE → OFFLINE`);
          try {
            await this.updateBotWithRetry(bot.id, { 
              status: 'OFFLINE',
              updatedAt: new Date()
            });
            corrections++;
          } catch (error) {
            console.error(`❌ Failed to correct bot ${bot.id} status in heartbeat check:`, error);
          }
        } else if (bot.status === 'ERROR' && !isProcessRunning) {
          console.log(`💓 Heartbeat correcting bot ${bot.id} (${bot.name}): ERROR → OFFLINE`);
          try {
            await this.updateBotWithRetry(bot.id, { 
              status: 'OFFLINE',
              updatedAt: new Date()
            });
            corrections++;
          } catch (error) {
            console.error(`❌ Failed to correct bot ${bot.id} status in heartbeat check:`, error);
          }
        }
      }
      
      if (corrections > 0) {
        console.log(`💓 Heartbeat made ${corrections} corrections`);
      }
    } catch (error) {
      console.error('❌ Heartbeat check failed:', error);
    }
  }

  // Deep status check every 30 seconds (less frequent but more thorough)
  @Cron('*/30 * * * * *')
  async checkAllBotsStatus() {
    // Add small random delay to prevent exact simultaneity 
    const randomDelay = Math.random() * 3000; // 0-3 seconds
    await new Promise(resolve => setTimeout(resolve, randomDelay));
    
    console.log('🔍 Starting periodic bot status check...');
    
    try {
      const botsMarkedOnline = await this.prisma.bot.findMany({
        where: { 
          status: 'ONLINE'
        },
        select: {
          id: true,
          name: true,
          tokenEncrypted: true
        }
      });

      console.log(`📊 Checking ${botsMarkedOnline.length} bots marked as ONLINE`);

      let stillOnline = 0;
      let foundOffline = 0;

      // Process bots with small delays to reduce concurrent updates
      for (const bot of botsMarkedOnline) {
        try {
          const isReallyOnline = await this.verifyBotIsOnline(bot.tokenEncrypted);
          
          if (!isReallyOnline) {
            // Bot is not really online, update status using the safe method
            await this.botsService.updateStatus(bot.id, 'OFFLINE');
            foundOffline++;
            console.log(`❌ Bot "${bot.name}" was marked ONLINE but is actually OFFLINE - status corrected`);
          } else {
            stillOnline++;
          }
        } catch (error) {
          console.log(`⚠️ Could not verify bot "${bot.name}": ${error.message}`);
          // Don't change status if we can't verify - might be temporary network issue
        }
        
        // Add small delay between checks to reduce database load
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      }

      if (foundOffline > 0 || stillOnline > 0) {
        console.log(`✅ Bot status check complete: ${stillOnline} confirmed online, ${foundOffline} corrected to offline`);
      }

    } catch (error) {
      console.error('❌ Error in periodic bot status check:', error);
    }
  }

  // Manual check for a specific bot
  async checkBotStatus(botId: string): Promise<boolean> {
    try {
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        select: { tokenEncrypted: true, name: true }
      });

      if (!bot) {
        throw new Error('Bot not found');
      }

      const isOnline = await this.verifyBotIsOnline(bot.tokenEncrypted);
      
      // Update status in database if different from current
      const currentBot = await this.prisma.bot.findUnique({
        where: { id: botId },
        select: { status: true }
      });

      const expectedStatus = isOnline ? 'ONLINE' : 'OFFLINE';
      if (currentBot.status !== expectedStatus) {
        try {
          await this.updateBotWithRetry(botId, { status: expectedStatus });
          console.log(`🔄 Updated bot "${bot.name}" status to ${expectedStatus}`);
        } catch (error) {
          console.error(`❌ Failed to update bot "${bot.name}" status:`, error);
          throw error; // Re-throw to maintain original behavior
        }
      }

      return isOnline;
    } catch (error) {
      console.error(`Error checking bot ${botId}:`, error);
      return false;
    }
  }

  private async verifyBotIsOnline(tokenEncrypted: string): Promise<boolean> {
    try {
      const token = this.encryptionService.decrypt(tokenEncrypted);
      
      // Try to get bot user info - if this works, bot is connected
      const result = await this.discordService.validateBotToken(token);
      
      // If validation succeeds and we can get application info, bot is likely online
      return result.isValid && !!result.application?.id;
      
    } catch (error) {
      // If we can't validate or get info, assume bot is offline
      return false;
    }
  }

  // Force refresh all bot statuses (can be called manually)
  async forceRefreshAllStatuses(): Promise<{ updated: number; errors: number }> {
    console.log('🔄 Force refreshing all bot statuses...');
    
    const allBots = await this.prisma.bot.findMany({
      select: {
        id: true,
        name: true,
        tokenEncrypted: true,
        status: true
      }
    });

    let updated = 0;
    let errors = 0;

    for (const bot of allBots) {
      try {
        const isOnline = await this.verifyBotIsOnline(bot.tokenEncrypted);
        const expectedStatus = isOnline ? 'ONLINE' : 'OFFLINE';
        
        if (bot.status !== expectedStatus) {
          try {
            await this.updateBotWithRetry(bot.id, { status: expectedStatus });
            updated++;
            console.log(`🔄 Bot "${bot.name}": ${bot.status} → ${expectedStatus}`);
          } catch (updateError) {
            errors++;
            console.error(`❌ Failed to update bot "${bot.name}" after retries:`, updateError);
          }
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error checking bot "${bot.name}":`, error);
      }
    }

    console.log(`✅ Force refresh complete: ${updated} updated, ${errors} errors`);
    return { updated, errors };
  }
}