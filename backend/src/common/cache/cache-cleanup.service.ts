import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from './cache.service';

@Injectable()
export class CacheCleanupService {
  constructor(private cacheService: CacheService) {}

  // Run cleanup every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredEntries() {
    console.log('Running cache cleanup...');
    
    const statsBefore = this.cacheService.getStats();
    this.cacheService.cleanup();
    const statsAfter = this.cacheService.getStats();
    
    const cleanedEntries = statsBefore.totalEntries - statsAfter.totalEntries;
    if (cleanedEntries > 0) {
      console.log(`Cleaned up ${cleanedEntries} expired cache entries`);
    }
  }

  // Run more thorough cleanup every hour
  @Cron(CronExpression.EVERY_HOUR)
  async logCacheStats() {
    const stats = this.cacheService.getStats();
    console.log('Cache stats:', {
      totalEntries: stats.totalEntries,
      activeEntries: stats.activeEntries,
      expiredEntries: stats.expiredEntries,
      rateLimitEntries: stats.rateLimitEntries
    });
  }
}