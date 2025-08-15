import { Controller, Delete, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CacheService } from './cache.service';
import { DiscordService } from '../discord/discord.service';

@Controller('cache')
@UseGuards(AuthGuard('jwt'))
export class CacheController {
  constructor(
    private cacheService: CacheService,
    private discordService: DiscordService
  ) {}

  @Get('stats')
  getCacheStats() {
    return {
      success: true,
      data: this.cacheService.getStats()
    };
  }

  @Delete('clear')
  clearCache() {
    this.cacheService.clear();
    return {
      success: true,
      message: 'Cache cleared successfully'
    };
  }

  @Delete('cleanup')
  cleanupCache() {
    const statsBefore = this.cacheService.getStats();
    this.cacheService.cleanup();
    const statsAfter = this.cacheService.getStats();
    
    return {
      success: true,
      message: `Cleaned up ${statsBefore.totalEntries - statsAfter.totalEntries} expired entries`,
      stats: statsAfter
    };
  }
}