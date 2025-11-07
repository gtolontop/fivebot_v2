/**
 * Redis Service
 * Provides a singleton Redis client for the bot
 */

import Redis from 'ioredis';

let redisClient: Redis | null = null;

/**
 * Get or create a Redis client instance
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    // Get Redis URL from environment or use default
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
        return targetErrors.some(targetError => err.message.includes(targetError));
      },
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err);
    });

    redisClient.on('close', () => {
      console.log('⚠️ Redis connection closed');
    });
  }

  return redisClient;
}

/**
 * Close the Redis connection
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('✅ Redis connection closed gracefully');
  }
}
