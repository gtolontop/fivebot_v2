import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly RUNNING_BOTS_KEY = 'fivebot:running_bots';

  async onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    await this.client.ping();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // Running bots management
  async addRunningBot(botId: string): Promise<void> {
    await this.client.sadd(this.RUNNING_BOTS_KEY, botId);
  }

  async removeRunningBot(botId: string): Promise<void> {
    await this.client.srem(this.RUNNING_BOTS_KEY, botId);
  }

  async isRunningBot(botId: string): Promise<boolean> {
    const result = await this.client.sismember(this.RUNNING_BOTS_KEY, botId);
    return result === 1;
  }

  async getRunningBots(): Promise<string[]> {
    return await this.client.smembers(this.RUNNING_BOTS_KEY);
  }

  async clearRunningBots(): Promise<void> {
    await this.client.del(this.RUNNING_BOTS_KEY);
  }

  // Generic Redis operations
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // Bot process metadata (PID, etc.)
  async setBotMetadata(botId: string, metadata: { pid?: number; startedAt: Date }): Promise<void> {
    await this.client.hset(
      `fivebot:bot:${botId}`,
      'pid', metadata.pid?.toString() || '',
      'startedAt', metadata.startedAt.toISOString()
    );
  }

  async getBotMetadata(botId: string): Promise<{ pid?: number; startedAt?: Date } | null> {
    const data = await this.client.hgetall(`fivebot:bot:${botId}`);
    if (!data || Object.keys(data).length === 0) {
      return null;
    }
    return {
      pid: data.pid ? parseInt(data.pid) : undefined,
      startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
    };
  }

  async deleteBotMetadata(botId: string): Promise<void> {
    await this.client.del(`fivebot:bot:${botId}`);
  }

  // Distributed lock for preventing race conditions
  async acquireLock(lockKey: string, ttlMs: number = 30000): Promise<boolean> {
    try {
      // SET with NX (only set if not exists) and PX (expire in milliseconds)
      // Returns 'OK' if lock acquired, null if lock already exists
      const result = await this.client.set(lockKey, '1', 'PX', ttlMs, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error(`Failed to acquire lock ${lockKey}:`, error);
      return false;
    }
  }

  async releaseLock(lockKey: string): Promise<void> {
    try {
      await this.client.del(lockKey);
    } catch (error) {
      console.error(`Failed to release lock ${lockKey}:`, error);
    }
  }

  // Bot state persistence for crash recovery
  async saveBotState(botId: string, state: {
    status: 'ONLINE' | 'OFFLINE' | 'STARTING' | 'RESTARTING';
    userAction: 'start' | 'stop' | 'restart' | 'crash' | 'system';
    timestamp: Date;
    metadata?: any;
  }): Promise<void> {
    const key = `fivebot:bot_state:${botId}`;
    await this.client.hset(
      key,
      'status', state.status,
      'userAction', state.userAction,
      'timestamp', state.timestamp.toISOString(),
      'metadata', JSON.stringify(state.metadata || {})
    );
    // Expire after 7 days to clean up old states
    await this.client.expire(key, 7 * 24 * 60 * 60);
  }

  async getBotState(botId: string): Promise<{
    status: 'ONLINE' | 'OFFLINE';
    userAction: 'start' | 'stop' | 'crash' | 'system';
    timestamp: Date;
    metadata?: any;
  } | null> {
    const key = `fivebot:bot_state:${botId}`;
    const data = await this.client.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return {
      status: data.status as 'ONLINE' | 'OFFLINE',
      userAction: data.userAction as 'start' | 'stop' | 'crash' | 'system',
      timestamp: new Date(data.timestamp),
      metadata: data.metadata ? JSON.parse(data.metadata) : undefined
    };
  }

  async deleteBotState(botId: string): Promise<void> {
    await this.client.del(`fivebot:bot_state:${botId}`);
  }

  async getAllBotStates(): Promise<Map<string, {
    status: 'ONLINE' | 'OFFLINE';
    userAction: 'start' | 'stop' | 'crash' | 'system';
    timestamp: Date;
    metadata?: any;
  }>> {
    const pattern = 'fivebot:bot_state:*';
    const keys = await this.client.keys(pattern);
    const states = new Map();

    for (const key of keys) {
      const botId = key.replace('fivebot:bot_state:', '');
      const state = await this.getBotState(botId);
      if (state) {
        states.set(botId, state);
      }
    }

    return states;
  }

  getClient(): Redis {
    return this.client;
  }
}
