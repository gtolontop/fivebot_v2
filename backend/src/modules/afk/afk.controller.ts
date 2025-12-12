import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AfkService } from './afk.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('afk')
@UseGuards(JwtAuthGuard)
export class AfkController {
  constructor(private readonly afkService: AfkService) {}

  @Get('config/:guildId')
  async getConfig(@Param('guildId') guildId: string, @Query('botId') botId: string) {
    return this.afkService.getConfig(guildId, botId);
  }

  @Put('config/:guildId')
  async updateConfig(
    @Param('guildId') guildId: string,
    @Query('botId') botId: string,
    @Body() dto: {
      enabled?: boolean;
      mentionResponse?: boolean;
      nicknamePrefix?: string;
      updateNickname?: boolean;
      ignoredChannels?: string[];
      ignoredRoles?: string[];
    }
  ) {
    return this.afkService.updateConfig(guildId, botId, dto);
  }

  @Post('users/:guildId/:userId')
  async setAfk(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Body() dto: { reason?: string; originalNickname?: string }
  ) {
    return this.afkService.setAfk(guildId, userId, dto.reason, dto.originalNickname);
  }

  @Delete('users/:guildId/:userId')
  async removeAfk(@Param('guildId') guildId: string, @Param('userId') userId: string) {
    return this.afkService.removeAfk(guildId, userId);
  }

  @Get('users/:guildId/:userId')
  async getAfkUser(@Param('guildId') guildId: string, @Param('userId') userId: string) {
    return this.afkService.getAfkUser(guildId, userId);
  }

  @Get('users/:guildId')
  async getAfkUsers(@Param('guildId') guildId: string) {
    return this.afkService.getAfkUsers(guildId);
  }
}
