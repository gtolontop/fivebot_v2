import { Injectable } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';

export interface ProcessMetrics {
  cpuUsage: number; // Percentage 0-100
  memoryUsage: number; // Percentage 0-100
  memoryMB: number; // Memory in MB
  uptime: number; // Seconds
  guildsCount: number;
  usersCount: number;
  networkDownload: number; // KB/s
  networkUpload: number; // KB/s
}

@Injectable()
export class BotProcessMetricsService {
  constructor(private redisService: RedisService) {}

  /**
   * Store process metrics for a bot in Redis (short-lived cache)
   */
  async storeProcessMetrics(botId: string, metrics: ProcessMetrics): Promise<void> {
    try {
      await this.redisService.getClient().setex(
        `bot:metrics:${botId}`,
        120, // Expire after 2 minutes (if bot stops sending, metrics disappear)
        JSON.stringify({
          ...metrics,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error(`Failed to store metrics for bot ${botId}:`, error);
    }
  }

  /**
   * Get latest process metrics for a bot
   */
  async getProcessMetrics(botId: string): Promise<ProcessMetrics | null> {
    try {
      const data = await this.redisService.getClient().get(`bot:metrics:${botId}`);

      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data);

      // Return metrics without timestamp
      return {
        cpuUsage: parsed.cpuUsage || 0,
        memoryUsage: parsed.memoryUsage || 0,
        memoryMB: parsed.memoryMB || 0,
        uptime: parsed.uptime || 0,
        guildsCount: parsed.guildsCount || 0,
        usersCount: parsed.usersCount || 0,
        networkDownload: parsed.networkDownload || 0,
        networkUpload: parsed.networkUpload || 0,
      };
    } catch (error) {
      console.error(`Failed to get metrics for bot ${botId}:`, error);
      return null;
    }
  }

  /**
   * Delete metrics for a bot (when bot stops)
   */
  async deleteProcessMetrics(botId: string): Promise<void> {
    try {
      await this.redisService.getClient().del(`bot:metrics:${botId}`);
    } catch (error) {
      console.error(`Failed to delete metrics for bot ${botId}:`, error);
    }
  }

  /**
   * Get all bots with active metrics
   */
  async getAllActiveMetrics(): Promise<Map<string, ProcessMetrics>> {
    try {
      const client = this.redisService.getClient();
      const keys = await client.keys('bot:metrics:*');
      const metricsMap = new Map<string, ProcessMetrics>();

      for (const key of keys) {
        const botId = key.replace('bot:metrics:', '');
        const data = await client.get(key);

        if (data) {
          const parsed = JSON.parse(data);
          metricsMap.set(botId, {
            cpuUsage: parsed.cpuUsage || 0,
            memoryUsage: parsed.memoryUsage || 0,
            memoryMB: parsed.memoryMB || 0,
            uptime: parsed.uptime || 0,
            guildsCount: parsed.guildsCount || 0,
            usersCount: parsed.usersCount || 0,
            networkDownload: parsed.networkDownload || 0,
            networkUpload: parsed.networkUpload || 0,
          });
        }
      }

      return metricsMap;
    } catch (error) {
      console.error('Failed to get all active metrics:', error);
      return new Map();
    }
  }
}
