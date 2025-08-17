import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { DiscordService } from '../common/discord/discord.service';
import { EncryptionService } from '../common/encryption/encryption.service';

@Injectable()
export class BotMonitorService {
  constructor(
    private prisma: PrismaService,
    private discordService: DiscordService,
    private encryptionService: EncryptionService,
  ) {}

  // Check bot statuses every 5 minutes to reduce concurrency conflicts
  @Cron('0 */5 * * * *')
  async checkAllBotsStatus() {
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

      for (const bot of botsMarkedOnline) {
        try {
          const isReallyOnline = await this.verifyBotIsOnline(bot.tokenEncrypted);
          
          if (!isReallyOnline) {
            // Bot is not really online, update status
            await this.prisma.bot.update({
              where: { id: bot.id },
              data: { status: 'OFFLINE' }
            });
            foundOffline++;
            console.log(`❌ Bot "${bot.name}" was marked ONLINE but is actually OFFLINE - status corrected`);
          } else {
            stillOnline++;
          }
        } catch (error) {
          console.log(`⚠️ Could not verify bot "${bot.name}": ${error.message}`);
          // Don't change status if we can't verify - might be temporary network issue
        }
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
        await this.prisma.bot.update({
          where: { id: botId },
          data: { status: expectedStatus }
        });
        console.log(`🔄 Updated bot "${bot.name}" status to ${expectedStatus}`);
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
          await this.prisma.bot.update({
            where: { id: bot.id },
            data: { status: expectedStatus }
          });
          updated++;
          console.log(`🔄 Bot "${bot.name}": ${bot.status} → ${expectedStatus}`);
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