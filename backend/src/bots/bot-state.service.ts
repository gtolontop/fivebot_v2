import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { BotStatus } from '@prisma/client';
import { Subject, Observable } from 'rxjs';

/**
 * Canonical bot states - these are the ONLY valid states
 */
export enum BotState {
  OFFLINE = 'OFFLINE',
  STARTING = 'STARTING',
  ONLINE = 'ONLINE',
  STOPPING = 'STOPPING',
  RESTARTING = 'RESTARTING',
  ERROR = 'ERROR',
}

/**
 * State transition events
 */
export interface BotStateEvent {
  botId: string;
  previousState: BotState;
  newState: BotState;
  timestamp: Date;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Bot state info with metadata
 */
export interface BotStateInfo {
  botId: string;
  state: BotState;
  pid?: number;
  startedAt?: Date;
  lastHeartbeat?: Date;
  errorMessage?: string;
  workerId?: string;
}

/**
 * Valid state transitions - enforces state machine rules
 */
const VALID_TRANSITIONS: Record<BotState, BotState[]> = {
  [BotState.OFFLINE]: [BotState.STARTING],
  [BotState.STARTING]: [BotState.ONLINE, BotState.ERROR, BotState.OFFLINE],
  [BotState.ONLINE]: [BotState.STOPPING, BotState.RESTARTING, BotState.ERROR, BotState.OFFLINE],
  [BotState.STOPPING]: [BotState.OFFLINE, BotState.ERROR],
  [BotState.RESTARTING]: [BotState.STARTING, BotState.OFFLINE, BotState.ERROR],
  [BotState.ERROR]: [BotState.OFFLINE, BotState.STARTING],
};

/**
 * BotStateService - Single source of truth for bot states
 *
 * This service manages all bot state transitions and ensures consistency
 * across the database, Redis, and in-memory state.
 */
@Injectable()
export class BotStateService implements OnModuleInit {
  // In-memory cache of bot states for fast access
  private stateCache = new Map<string, BotStateInfo>();

  // Event emitter for state changes
  private stateSubject = new Subject<BotStateEvent>();

  // Heartbeat tracking
  private heartbeatInterval: NodeJS.Timeout;
  private readonly HEARTBEAT_INTERVAL_MS = 10000; // 10 seconds
  private readonly HEARTBEAT_TIMEOUT_MS = 30000; // 30 seconds without heartbeat = dead

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async onModuleInit() {
    // Load initial state from database
    await this.syncFromDatabase();

    // Start heartbeat checker
    this.startHeartbeatChecker();
  }

  /**
   * Get state change events as observable
   */
  getStateStream(): Observable<BotStateEvent> {
    return this.stateSubject.asObservable();
  }

  /**
   * Get current state of a bot
   */
  async getState(botId: string): Promise<BotStateInfo | null> {
    // Check cache first
    let stateInfo = this.stateCache.get(botId);

    if (!stateInfo) {
      // Load from Redis
      stateInfo = await this.loadStateFromRedis(botId);

      if (!stateInfo) {
        // Load from database
        const bot = await this.prisma.bot.findUnique({
          where: { id: botId },
          select: { id: true, status: true, startedAt: true },
        });

        if (bot) {
          stateInfo = {
            botId: bot.id,
            state: bot.status as BotState,
            startedAt: bot.startedAt || undefined,
          };
        }
      }

      if (stateInfo) {
        this.stateCache.set(botId, stateInfo);
      }
    }

    return stateInfo || null;
  }

  /**
   * Transition bot to a new state with validation
   */
  async transition(
    botId: string,
    newState: BotState,
    options: {
      reason?: string;
      pid?: number;
      workerId?: string;
      errorMessage?: string;
      force?: boolean; // Bypass state machine validation (emergency only)
    } = {}
  ): Promise<boolean> {
    const currentInfo = await this.getState(botId);
    const currentState = currentInfo?.state || BotState.OFFLINE;

    // Validate transition unless forced
    if (!options.force && !this.isValidTransition(currentState, newState)) {
      console.warn(
        `⚠️ Invalid state transition for bot ${botId}: ${currentState} -> ${newState}`
      );
      return false;
    }

    console.log(`📊 Bot ${botId}: ${currentState} -> ${newState} (${options.reason || 'no reason'})`);

    // Build new state info
    const newStateInfo: BotStateInfo = {
      botId,
      state: newState,
      pid: options.pid || currentInfo?.pid,
      workerId: options.workerId || currentInfo?.workerId,
      startedAt: newState === BotState.ONLINE ? new Date() : currentInfo?.startedAt,
      lastHeartbeat: newState === BotState.ONLINE ? new Date() : undefined,
      errorMessage: options.errorMessage,
    };

    // Clear certain fields on specific transitions
    if (newState === BotState.OFFLINE || newState === BotState.ERROR) {
      newStateInfo.pid = undefined;
      newStateInfo.startedAt = undefined;
    }

    // Update all storage layers atomically
    try {
      await Promise.all([
        this.updateDatabase(botId, newState, newStateInfo),
        this.updateRedis(botId, newStateInfo),
      ]);

      // Update local cache
      this.stateCache.set(botId, newStateInfo);

      // Emit state change event
      this.stateSubject.next({
        botId,
        previousState: currentState,
        newState,
        timestamp: new Date(),
        reason: options.reason,
        metadata: {
          pid: newStateInfo.pid,
          workerId: newStateInfo.workerId,
        },
      });

      return true;
    } catch (error) {
      console.error(`❌ Failed to transition bot ${botId} to ${newState}:`, error);
      return false;
    }
  }

  /**
   * Record heartbeat from a running bot
   */
  async heartbeat(botId: string, pid?: number): Promise<void> {
    const stateInfo = this.stateCache.get(botId);

    if (stateInfo && stateInfo.state === BotState.ONLINE) {
      stateInfo.lastHeartbeat = new Date();
      if (pid) stateInfo.pid = pid;

      // Update Redis with new heartbeat
      const client = this.redisService.getClient();
      if (client) {
        try {
          await client.hset(
            `fivebot:state:${botId}`,
            'lastHeartbeat',
            stateInfo.lastHeartbeat.toISOString()
          );
        } catch (error) {
          console.error(`❌ Failed to update heartbeat in Redis for bot ${botId}:`, error);
        }
      }
    }
  }

  /**
   * Check if a bot is running (ONLINE or STARTING)
   */
  async isRunning(botId: string): Promise<boolean> {
    const state = await this.getState(botId);
    return state?.state === BotState.ONLINE || state?.state === BotState.STARTING;
  }

  /**
   * Get all bots in a specific state
   */
  async getBotsInState(state: BotState): Promise<string[]> {
    const bots = await this.prisma.bot.findMany({
      where: { status: state },
      select: { id: true },
    });
    return bots.map(b => b.id);
  }

  /**
   * Get all running bot IDs
   */
  async getRunningBotIds(): Promise<string[]> {
    const onlineBots = await this.getBotsInState(BotState.ONLINE);
    const startingBots = await this.getBotsInState(BotState.STARTING);
    return [...onlineBots, ...startingBots];
  }

  /**
   * Force sync all bots from database (recovery scenario)
   */
  async syncFromDatabase(): Promise<void> {
    console.log('🔄 Syncing bot states from database...');

    const bots = await this.prisma.bot.findMany({
      select: { id: true, status: true, startedAt: true },
    });

    for (const bot of bots) {
      const stateInfo: BotStateInfo = {
        botId: bot.id,
        state: bot.status as BotState,
        startedAt: bot.startedAt || undefined,
      };

      this.stateCache.set(bot.id, stateInfo);
      await this.updateRedis(bot.id, stateInfo);
    }

    console.log(`✅ Synced ${bots.length} bot states`);
  }

  /**
   * Emergency reset - force a bot to OFFLINE state
   */
  async forceOffline(botId: string, reason: string = 'Forced offline'): Promise<void> {
    await this.transition(botId, BotState.OFFLINE, {
      reason,
      force: true,
    });
  }

  /**
   * Cleanup stale states (bots stuck in transient states)
   */
  async cleanupStaleStates(): Promise<number> {
    let cleanedCount = 0;
    const now = Date.now();

    // Find bots stuck in STARTING for more than 2 minutes
    const startingBots = await this.prisma.bot.findMany({
      where: {
        status: BotStatus.STARTING,
        updatedAt: {
          lt: new Date(now - 2 * 60 * 1000),
        },
      },
    });

    for (const bot of startingBots) {
      console.log(`🧹 Cleaning up stuck STARTING bot: ${bot.id}`);
      await this.transition(bot.id, BotState.ERROR, {
        reason: 'Stuck in STARTING state',
        force: true,
        errorMessage: 'Bot failed to start within timeout',
      });
      cleanedCount++;
    }

    // Find bots stuck in STOPPING for more than 1 minute
    const stoppingBots = await this.prisma.bot.findMany({
      where: {
        status: BotStatus.STOPPING,
        updatedAt: {
          lt: new Date(now - 60 * 1000),
        },
      },
    });

    for (const bot of stoppingBots) {
      console.log(`🧹 Cleaning up stuck STOPPING bot: ${bot.id}`);
      await this.transition(bot.id, BotState.OFFLINE, {
        reason: 'Stuck in STOPPING state',
        force: true,
      });
      cleanedCount++;
    }

    return cleanedCount;
  }

  // ============ Private Methods ============

  private isValidTransition(from: BotState, to: BotState): boolean {
    // Same state is always valid (no-op)
    if (from === to) return true;

    const validTargets = VALID_TRANSITIONS[from];
    return validTargets?.includes(to) || false;
  }

  private async updateDatabase(
    botId: string,
    state: BotState,
    info: BotStateInfo
  ): Promise<void> {
    const updateData: any = {
      status: state,
      updatedAt: new Date(),
    };

    if (state === BotState.ONLINE && info.startedAt) {
      updateData.startedAt = info.startedAt;
    } else if (state === BotState.OFFLINE) {
      updateData.startedAt = null;
    }

    await this.prisma.bot.update({
      where: { id: botId },
      data: updateData,
    });
  }

  private async updateRedis(botId: string, info: BotStateInfo): Promise<void> {
    const client = this.redisService.getClient();
    if (!client) {
      console.warn(`⚠️ Redis not available, skipping state update for bot ${botId}`);
      return;
    }

    const key = `fivebot:state:${botId}`;
    const data: Record<string, string> = {
      state: info.state,
      updatedAt: new Date().toISOString(),
    };

    if (info.pid) data.pid = info.pid.toString();
    if (info.startedAt) data.startedAt = info.startedAt.toISOString();
    if (info.lastHeartbeat) data.lastHeartbeat = info.lastHeartbeat.toISOString();
    if (info.workerId) data.workerId = info.workerId;
    if (info.errorMessage) data.errorMessage = info.errorMessage;

    try {
      await client.hset(key, data);

      // Set expiry for offline bots (cleanup)
      if (info.state === BotState.OFFLINE) {
        await client.expire(key, 3600); // 1 hour
      } else {
        await client.persist(key);
      }

      // Update running bots set
      if (info.state === BotState.ONLINE) {
        await this.redisService.addRunningBot(botId);
      } else {
        await this.redisService.removeRunningBot(botId);
      }
    } catch (error) {
      console.error(`❌ Failed to update Redis for bot ${botId}:`, error);
    }
  }

  private async loadStateFromRedis(botId: string): Promise<BotStateInfo | null> {
    const client = this.redisService.getClient();
    if (!client) {
      return null;
    }

    try {
      const key = `fivebot:state:${botId}`;
      const data = await client.hgetall(key);

      if (!data || !data.state) {
        return null;
      }

      return {
        botId,
        state: data.state as BotState,
        pid: data.pid ? parseInt(data.pid) : undefined,
        startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
        lastHeartbeat: data.lastHeartbeat ? new Date(data.lastHeartbeat) : undefined,
        workerId: data.workerId,
        errorMessage: data.errorMessage,
      };
    } catch (error) {
      console.error(`❌ Failed to load state from Redis for bot ${botId}:`, error);
      return null;
    }
  }

  private startHeartbeatChecker(): void {
    this.heartbeatInterval = setInterval(async () => {
      await this.checkHeartbeats();
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  private async checkHeartbeats(): Promise<void> {
    const now = Date.now();

    for (const [botId, info] of this.stateCache.entries()) {
      if (info.state !== BotState.ONLINE) continue;

      // Check if heartbeat is stale
      if (info.lastHeartbeat) {
        const timeSinceHeartbeat = now - info.lastHeartbeat.getTime();

        if (timeSinceHeartbeat > this.HEARTBEAT_TIMEOUT_MS) {
          console.warn(`💀 Bot ${botId} heartbeat timeout (${timeSinceHeartbeat}ms)`);

          // Transition to ERROR state
          await this.transition(botId, BotState.ERROR, {
            reason: 'Heartbeat timeout',
            errorMessage: `No heartbeat for ${Math.round(timeSinceHeartbeat / 1000)}s`,
          });
        }
      }
    }
  }

  onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }
}
