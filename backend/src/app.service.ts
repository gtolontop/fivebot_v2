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

  private async checkIfBotIsReallyRunning(tokenEncrypted: string): Promise<boolean> {
    // This is a simple check - we could make it more sophisticated
    // For now, we'll assume if we recently updated the status, the bot is probably running
    // In a real implementation, you might check if there's an active WebSocket connection
    // or if the bot recently responded to a heartbeat
    
    // For now, return false to reset all bots (can be improved later)
    return false;
  }
}