import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { InviteTrackerService } from './invite-tracker.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import { AddBonusInvitesDto } from './dto/manage-invites.dto';

@Controller('bots/:botId/invite-tracker')
@UseGuards(JwtAuthGuard)
export class InviteTrackerController {
  constructor(private readonly inviteTrackerService: InviteTrackerService) {}

  @Get('config')
  async getConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.inviteTrackerService.getConfig(guildId);
  }

  @Put('config')
  async updateConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() dto: UpdateConfigDto,
  ) {
    return this.inviteTrackerService.updateConfig(guildId, dto);
  }

  @Get('leaderboard')
  async getLeaderboard(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('limit') limit: number = 10,
  ) {
    return this.inviteTrackerService.getLeaderboard(guildId, limit);
  }

  @Get('user/:userId/stats')
  async getUserStats(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.inviteTrackerService.getInviterStats(guildId, userId);
  }

  @Post('user/:userId/bonus')
  async addBonus(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
    @Body() dto: AddBonusInvitesDto,
  ) {
    return this.inviteTrackerService.addBonusInvites(guildId, userId, dto.amount);
  }

  @Delete('user/:userId/reset')
  async resetUser(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.inviteTrackerService.resetUserInvites(guildId, userId);
  }

  @Post('sync')
  async syncInvites(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() invites: Array<{
      code: string;
      inviterId?: string;
      channelId?: string;
      uses: number;
      maxUses?: number;
      expiresAt?: Date;
    }>,
  ) {
    return this.inviteTrackerService.syncGuildInvites(guildId, invites);
  }
}
