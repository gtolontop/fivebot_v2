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

      // Only create one system log instead of individual bot logs
      if (result.count > 0) {
        console.log(`📝 Created system startup log for ${result.count} bots reset`);
        // You could create a single system log entry here if needed
        // instead of spamming individual logs for each bot
      }

    } catch (error) {
      console.error('❌ Error resetting bot statuses on startup:', error);
    }
  }
}