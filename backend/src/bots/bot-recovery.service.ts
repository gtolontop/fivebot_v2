import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { RedisService } from '../common/redis/redis.service';
import { BotStatus } from '@prisma/client';
import { BotLogsService } from './bot-logs.service';

@Injectable()
export class BotRecoveryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BotRecoveryService.name);
  private recoveryInProgress = false;

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private redisService: RedisService,
    private botLogsService: BotLogsService,
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
      let recovered = 0;
      let skipped = 0;
      let failed = 0;

      // PHASE 1: Get all bots that were ONLINE in the database
      const botsMarkedOnline = await this.prisma.bot.findMany({
        where: {
          status: BotStatus.ONLINE,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          status: true,
          ownerId: true,
          owner: { select: { username: true } }
        }
      });

      this.logger.log(`📊 Found ${botsMarkedOnline.length} bots marked as ONLINE in database`);

      // PHASE 2: Get all saved bot states from Redis
      const botStates = await this.redisService.getAllBotStates();
      this.logger.log(`📊 Found ${botStates.size} bot states in Redis`);

      // Create a set of all bot IDs that need recovery consideration
      const botsToConsider = new Set<string>();

      // Add bots that were ONLINE in DB
      for (const bot of botsMarkedOnline) {
        botsToConsider.add(bot.id);
      }

      // Add bots from Redis that might have crashed
      for (const [botId, state] of botStates.entries()) {
        if (state.userAction === 'crash' || (state.userAction === 'start' && state.status === 'ONLINE')) {
          botsToConsider.add(botId);
        }
      }

      this.logger.log(`🔍 Considering ${botsToConsider.size} bots for recovery`);

      // PHASE 3: Process bots in parallel batches
      const BATCH_SIZE = 25; // Process 25 bots at a time
      const BATCH_DELAY = 2000; // 2s delay between batches
      const botIdsArray = Array.from(botsToConsider);

      for (let i = 0; i < botIdsArray.length; i += BATCH_SIZE) {
        const batch = botIdsArray.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(botIdsArray.length / BATCH_SIZE);

        this.logger.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} bots)`);

        // Process all bots in this batch in parallel
        const results = await Promise.allSettled(
          batch.map(botId => this.processBotRecovery(botId, botStates))
        );

        // Count results
        for (const result of results) {
          if (result.status === 'fulfilled') {
            if (result.value === 'recovered') recovered++;
            else if (result.value === 'skipped') skipped++;
            else if (result.value === 'failed') failed++;
          } else {
            failed++;
            this.logger.error('❌ Batch processing error:', result.reason);
          }
        }

        // Delay between batches (except for the last batch)
        if (i + BATCH_SIZE < botIdsArray.length) {
          this.logger.log(`⏳ Waiting ${BATCH_DELAY}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      }

      this.logger.log(`✅ Recovery complete: ${recovered} recovered, ${skipped} skipped, ${failed} failed`);

    } catch (error) {
      this.logger.error('❌ Recovery process failed:', error);
    } finally {
      this.recoveryInProgress = false;
    }
  }

  private async processBotRecovery(
    botId: string,
    botStates: Map<string, any>
  ): Promise<'recovered' | 'skipped' | 'failed'> {
    try {
      // Get bot from database
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        select: {
          id: true,
          name: true,
          status: true,
          isActive: true,
          owner: { select: { username: true } }
        }
      });

      if (!bot) {
        this.logger.warn(`⚠️ Bot ${botId} not found in database, cleaning up Redis state`);
        await this.redisService.deleteBotState(botId);
        return 'skipped';
      }

      if (!bot.isActive) {
        this.logger.log(`⏸️ Bot "${bot.name}" is suspended, skipping recovery`);
        await this.redisService.deleteBotState(botId);
        // Mark as offline
        await this.prisma.bot.update({
          where: { id: botId },
          data: { status: BotStatus.OFFLINE }
        });
        return 'skipped';
      }

      // Get Redis state if exists
      const redisState = botStates.get(botId);

      // Decide if we should recover
      const shouldRecover = this.shouldRecoverBotOnBootstrap(bot, redisState);

      if (shouldRecover) {
        this.logger.log(`🔁 Recovering bot "${bot.name}" (owner: ${bot.owner.username}) - Status: ${bot.status}`);

        // Ensure bot is marked as OFFLINE first
        await this.prisma.bot.update({
          where: { id: botId },
          data: { status: BotStatus.OFFLINE }
        });

        // Log system event for startup
        await this.botLogsService.logSystemEvent(botId, 'START');

        // Queue start job
        await this.queueService.addJob('start-bot', { botId });

        // Update state to indicate recovery attempt
        await this.redisService.saveBotState(botId, {
          status: 'ONLINE',
          userAction: 'system',
          timestamp: new Date(),
          metadata: { recovered: true, recoveredFromBootstrap: true }
        });

        this.logger.log(`✅ Bot "${bot.name}" queued for recovery`);
        return 'recovered';
      } else {
        this.logger.log(`⏭️ Skipping recovery for bot "${bot.name}" - Not eligible for auto-recovery`);

        // Mark as offline if it was online but shouldn't be recovered
        if (bot.status === BotStatus.ONLINE) {
          await this.prisma.bot.update({
            where: { id: botId },
            data: { status: BotStatus.OFFLINE }
          });
        }

        // Clean up Redis state
        if (redisState?.userAction === 'stop') {
          await this.redisService.deleteBotState(botId);
        }

        return 'skipped';
      }

    } catch (error) {
      this.logger.error(`❌ Failed to recover bot ${botId}:`, error);
      return 'failed';
    }
  }

  private shouldRecoverBotOnBootstrap(
    bot: { status: BotStatus },
    redisState?: {
      status: 'ONLINE' | 'OFFLINE';
      userAction: 'start' | 'stop' | 'crash' | 'system';
      timestamp: Date;
      metadata?: any;
    }
  ): boolean {
    // If bot was ONLINE in DB, recover it (backend restart scenario)
    if (bot.status === BotStatus.ONLINE) {
      // Check Redis state to see if it was intentionally stopped
      if (redisState?.userAction === 'stop') {
        return false; // User stopped it, don't recover
      }
      return true; // Recover
    }

    // If Redis says it crashed, check crash count
    if (redisState?.userAction === 'crash') {
      const crashCount = redisState.metadata?.crashCount || 0;
      const lastCrashTime = redisState.metadata?.lastCrashTime
        ? new Date(redisState.metadata.lastCrashTime).getTime()
        : 0;
      const timeSinceLastCrash = Date.now() - lastCrashTime;
      const oneHourMs = 60 * 60 * 1000;

      // Reset crash count if last crash was more than 1 hour ago
      if (timeSinceLastCrash > oneHourMs) {
        this.logger.log(`🔄 Crash was more than 1 hour ago, resetting crash count`);
        return true;
      }

      // Don't recover if crashed 2+ times recently
      if (crashCount >= 2) {
        this.logger.warn(`🚫 Bot has crashed ${crashCount} times recently, not recovering`);
        return false;
      }

      return true; // Recover on first crash
    }

    // If Redis says it was started and ONLINE, recover it
    if (redisState?.userAction === 'start' && redisState.status === 'ONLINE') {
      return true;
    }

    return false;
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