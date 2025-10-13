import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { RedisService } from '../common/redis/redis.service';
import { BotStatus } from '@prisma/client';

@Injectable()
export class BotRecoveryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BotRecoveryService.name);
  private recoveryInProgress = false;

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private redisService: RedisService,
  ) {}

  async onApplicationBootstrap() {
    // Wait a bit for the application to fully initialize
    setTimeout(() => {
      this.performRecovery().catch((error) => {
        this.logger.error('❌ Recovery failed during bootstrap', error);
      });
    }, 5000); // 5 seconds delay
  }

  private async performRecovery(): Promise<void> {
    if (this.recoveryInProgress) {
      this.logger.warn('⚠️ Recovery already in progress, skipping');
      return;
    }

    this.recoveryInProgress = true;
    this.logger.log('🔄 Starting bot recovery process...');

    try {
      // Get all saved bot states from Redis
      const botStates = await this.redisService.getAllBotStates();
      this.logger.log(`📊 Found ${botStates.size} bot states in Redis`);

      let recovered = 0;
      let skipped = 0;
      let failed = 0;

      for (const [botId, state] of botStates.entries()) {
        try {
          // Get bot from database
          const bot = await this.prisma.bot.findUnique({
            where: { id: botId },
            select: { id: true, name: true, status: true, isActive: true }
          });

          if (!bot) {
            this.logger.warn(`⚠️ Bot ${botId} not found in database, cleaning up Redis state`);
            await this.redisService.deleteBotState(botId);
            skipped++;
            continue;
          }

          if (!bot.isActive) {
            this.logger.log(`⏸️ Bot ${bot.name} is suspended, skipping recovery`);
            await this.redisService.deleteBotState(botId);
            skipped++;
            continue;
          }

          // Decision logic based on saved state
          const shouldRecover = this.shouldRecoverBot(state);

          if (shouldRecover) {
            this.logger.log(`🔁 Recovering bot ${bot.name} (${botId}) - Last action: ${state.userAction}`);

            // Ensure bot is marked as OFFLINE first
            await this.prisma.bot.update({
              where: { id: botId },
              data: { status: BotStatus.OFFLINE }
            });

            // Wait a bit to ensure clean state
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Queue start job
            await this.queueService.addJob('start-bot', { botId });

            // Update state to indicate recovery attempt
            await this.redisService.saveBotState(botId, {
              status: 'ONLINE',
              userAction: 'system',
              timestamp: new Date(),
              metadata: { recovered: true, previousAction: state.userAction }
            });

            recovered++;
            this.logger.log(`✅ Bot ${bot.name} queued for recovery`);
          } else {
            this.logger.log(`⏭️ Skipping recovery for bot ${bot.name} - Last action: ${state.userAction}`);

            // Clean up state for intentionally stopped bots
            if (state.userAction === 'stop') {
              await this.redisService.deleteBotState(botId);
            }

            skipped++;
          }

        } catch (error) {
          this.logger.error(`❌ Failed to recover bot ${botId}:`, error);
          failed++;
        }

        // Small delay between recoveries to avoid overload
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      this.logger.log(`✅ Recovery complete: ${recovered} recovered, ${skipped} skipped, ${failed} failed`);

    } catch (error) {
      this.logger.error('❌ Recovery process failed:', error);
    } finally {
      this.recoveryInProgress = false;
    }
  }

  private shouldRecoverBot(state: {
    status: 'ONLINE' | 'OFFLINE';
    userAction: 'start' | 'stop' | 'crash' | 'system';
    timestamp: Date;
    metadata?: any;
  }): boolean {
    // Don't recover if user explicitly stopped the bot
    if (state.userAction === 'stop') {
      return false;
    }

    // Recover if bot crashed
    if (state.userAction === 'crash') {
      return true;
    }

    // Recover if bot was started by user and was ONLINE
    if (state.userAction === 'start' && state.status === 'ONLINE') {
      return true;
    }

    // Recover if bot was managed by system and was ONLINE
    if (state.userAction === 'system' && state.status === 'ONLINE') {
      return true;
    }

    // Check if state is recent (within last 24 hours) - avoid recovering very old states
    const timeSinceLastState = Date.now() - new Date(state.timestamp).getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    if (timeSinceLastState > twentyFourHoursMs) {
      this.logger.log(`⏰ State is older than 24 hours, skipping recovery`);
      return false;
    }

    // Check metadata for explicit shouldRecover flag
    if (state.metadata?.shouldRecover === false) {
      this.logger.log(`🚫 Bot explicitly marked as non-recoverable`);
      return false;
    }

    return false;
  }

  async enableAutoRestart(botId: string): Promise<void> {
    await this.redisService.saveBotState(botId, {
      status: 'ONLINE',
      userAction: 'start',
      timestamp: new Date(),
      metadata: { autoRestart: true }
    });
    this.logger.log(`✅ Auto-restart enabled for bot ${botId}`);
  }

  async disableAutoRestart(botId: string): Promise<void> {
    await this.redisService.deleteBotState(botId);
    this.logger.log(`✅ Auto-restart disabled for bot ${botId}`);
  }

  async triggerManualRecovery(): Promise<{ recovered: number; failed: number }> {
    this.logger.log('🔄 Manual recovery triggered');
    await this.performRecovery();
    return { recovered: 0, failed: 0 }; // Placeholder
  }
}