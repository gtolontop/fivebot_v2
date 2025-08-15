import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { BotStatus } from '@prisma/client';

@Injectable()
export class BotRecoveryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BotRecoveryService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('🔄 Starting bot recovery process...');
    
    try {
      // Find all bots that should be running but are not
      const botsToRecover = await this.prisma.bot.findMany({
        where: {
          isActive: true,
          OR: [
            { status: BotStatus.ONLINE },
            { status: BotStatus.STARTING },
            // Also recover bots that were in error state but should be running
            { status: BotStatus.ERROR, shouldAutoRestart: true },
          ],
        },
        include: {
          config: true,
          owner: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      if (botsToRecover.length === 0) {
        this.logger.log('✅ No bots need recovery');
        return;
      }

      this.logger.log(`🔍 Found ${botsToRecover.length} bots to recover`);

      // Set all bots to OFFLINE first to avoid conflicts
      await this.prisma.bot.updateMany({
        where: {
          id: {
            in: botsToRecover.map(bot => bot.id),
          },
        },
        data: {
          status: BotStatus.OFFLINE,
          containerId: null,
        },
      });

      // Update host statuses to DOWN
      await this.prisma.host.updateMany({
        where: {
          botId: {
            in: botsToRecover.map(bot => bot.id),
          },
          status: {
            not: 'DOWN',
          },
        },
        data: {
          status: 'DOWN',
          stoppedAt: new Date(),
        },
      });

      // Queue start jobs for each bot with a delay to avoid overwhelming the system
      for (let i = 0; i < botsToRecover.length; i++) {
        const bot = botsToRecover[i];
        
        try {
          // Add job with delay (stagger bot starts by 3 seconds each)
          await this.queueService.addJob('start-bot', 
            { botId: bot.id },
            {
              delay: i * 3000, // 3 seconds between each bot start
            }
          );

          this.logger.log(`📋 Queued recovery for bot: ${bot.name} (${bot.id}) - Owner: ${bot.owner.username}`);

          // Create audit log for recovery
          await this.prisma.auditLog.create({
            data: {
              userId: bot.ownerId,
              botId: bot.id,
              action: 'BOT_AUTO_RECOVERED',
              resource: 'bot',
              metadata: {
                reason: 'System restart auto-recovery',
                originalStatus: bot.status,
                recoveryDelay: i * 3000,
              },
            },
          });

        } catch (error) {
          this.logger.error(`❌ Failed to queue recovery for bot ${bot.id}:`, error.message);
          
          // Mark as error if we can't even queue the recovery
          await this.prisma.bot.update({
            where: { id: bot.id },
            data: { status: BotStatus.ERROR },
          });
        }
      }

      this.logger.log(`✅ Queued ${botsToRecover.length} bots for auto-recovery`);

    } catch (error) {
      this.logger.error('❌ Bot recovery process failed:', error);
    }
  }

  /**
   * Mark a bot for auto-restart on system recovery
   */
  async enableAutoRestart(botId: string): Promise<void> {
    await this.prisma.bot.update({
      where: { id: botId },
      data: { shouldAutoRestart: true },
    });
  }

  /**
   * Disable auto-restart for a bot
   */
  async disableAutoRestart(botId: string): Promise<void> {
    await this.prisma.bot.update({
      where: { id: botId },
      data: { shouldAutoRestart: false },
    });
  }

  /**
   * Manual recovery trigger (useful for testing or admin purposes)
   */
  async triggerManualRecovery(): Promise<{ recovered: number; failed: number }> {
    const result = { recovered: 0, failed: 0 };

    try {
      const botsToRecover = await this.prisma.bot.findMany({
        where: {
          isActive: true,
          status: {
            in: [BotStatus.OFFLINE, BotStatus.ERROR],
          },
          shouldAutoRestart: true,
        },
      });

      for (const bot of botsToRecover) {
        try {
          await this.queueService.addJob('start-bot', { botId: bot.id });
          result.recovered++;
        } catch (error) {
          this.logger.error(`Failed to recover bot ${bot.id}:`, error);
          result.failed++;
        }
      }

      this.logger.log(`Manual recovery completed: ${result.recovered} recovered, ${result.failed} failed`);

    } catch (error) {
      this.logger.error('Manual recovery failed:', error);
      throw error;
    }

    return result;
  }
}