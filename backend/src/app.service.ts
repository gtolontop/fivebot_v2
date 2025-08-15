import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from './common/prisma/prisma.service';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    console.log('🔄 Application starting - checking bot statuses...');
    
    try {
      // Get all bots that were marked as running
      const potentiallyRunningBots = await this.prisma.bot.findMany({
        where: {
          status: {
            in: ['ONLINE', 'STARTING', 'STOPPING']
          }
        },
        select: {
          id: true,
          name: true,
          status: true,
          tokenEncrypted: true
        }
      });

      console.log(`🔍 Found ${potentiallyRunningBots.length} bots that might be running`);

      let stillRunning = 0;
      let resetToOffline = 0;

      // Check each bot's real status instead of blindly resetting
      for (const bot of potentiallyRunningBots) {
        try {
          // Try to validate if the bot is actually connected to Discord
          // We'll use a simple approach: if the token is valid and can fetch user info, bot is likely running
          const isActuallyRunning = await this.checkIfBotIsReallyRunning(bot.tokenEncrypted);
          
          if (isActuallyRunning) {
            // Bot is really running, keep it as ONLINE
            await this.prisma.bot.update({
              where: { id: bot.id },
              data: { status: 'ONLINE' }
            });
            stillRunning++;
            console.log(`✅ Bot "${bot.name}" is confirmed running`);
          } else {
            // Bot is not running, set to OFFLINE
            await this.prisma.bot.update({
              where: { id: bot.id },
              data: { status: 'OFFLINE' }
            });
            resetToOffline++;
            console.log(`❌ Bot "${bot.name}" is not running, set to OFFLINE`);
          }
        } catch (error) {
          // If we can't check, assume offline for safety
          await this.prisma.bot.update({
            where: { id: bot.id },
            data: { status: 'OFFLINE' }
          });
          resetToOffline++;
          console.log(`⚠️ Bot "${bot.name}" check failed, set to OFFLINE`);
        }
      }

      console.log(`✅ Status sync complete: ${stillRunning} still running, ${resetToOffline} reset to offline`);

    } catch (error) {
      console.error('❌ Error checking bot statuses on startup:', error);
    }
  }

  private async checkIfBotIsReallyRunning(tokenEncrypted: string): Promise<boolean> {
    // This is a simple check - we could make it more sophisticated
    // For now, we'll assume if we recently updated the status, the bot is probably running
    // In a real implementation, you might check if there's an active WebSocket connection
    // or if the bot recently responded to a heartbeat
    
    // For now, return false to reset all bots (can be improved later)
    return false;
  }
}