import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ServerStatsService } from './server-stats.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('server-stats')
@UseGuards(JwtAuthGuard)
export class ServerStatsController {
  constructor(private readonly serverStatsService: ServerStatsService) {}

  @Get('config/:guildId')
  async getConfig(@Param('guildId') guildId: string, @Query('botId') botId: string) {
    return this.serverStatsService.getConfig(guildId, botId);
  }

  @Put('config/:guildId')
  async updateConfig(
    @Param('guildId') guildId: string,
    @Query('botId') botId: string,
    @Body() dto: { enabled?: boolean; updateInterval?: number }
  ) {
    return this.serverStatsService.updateConfig(guildId, botId, dto);
  }

  @Post('counters/:guildId')
  async createCounter(
    @Param('guildId') guildId: string,
    @Query('botId') botId: string,
    @Body() dto: { channelId: string; counterType: string; template: string; targetRoleId?: string; channelTypes?: string[]; customValue?: number }
  ) {
    return this.serverStatsService.createCounter(guildId, botId, dto);
  }

  @Put('counters/:counterId')
  async updateCounter(
    @Param('counterId') counterId: string,
    @Body() dto: { template?: string; counterType?: string; targetRoleId?: string; channelTypes?: string[]; customValue?: number }
  ) {
    return this.serverStatsService.updateCounter(counterId, dto);
  }

  @Delete('counters/:counterId')
  async deleteCounter(@Param('counterId') counterId: string) {
    return this.serverStatsService.deleteCounter(counterId);
  }
}
