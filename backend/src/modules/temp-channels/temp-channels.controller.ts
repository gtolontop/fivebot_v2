import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TempChannelsService } from './temp-channels.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import {
  SetChannelNameDto,
  SetChannelLimitDto,
  LockChannelDto,
  UnlockChannelDto,
  PermitUserDto,
  RejectUserDto,
  ClaimChannelDto,
  TransferOwnershipDto,
} from './dto/channel-action.dto';

@ApiTags('Temp Channels')
@Controller('bots/:botId/temp-channels')
export class TempChannelsController {
  constructor(private readonly tempChannelsService: TempChannelsService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get temp channels configuration' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Configuration retrieved' })
  async getConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.tempChannelsService.getConfig(guildId);
  }

  @Put('config')
  @ApiOperation({ summary: 'Update temp channels configuration' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() updateConfigDto: UpdateConfigDto,
  ) {
    return this.tempChannelsService.updateConfig(guildId, updateConfigDto);
  }

  @Get('channels')
  @ApiOperation({ summary: 'Get all temp channels for a guild' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Temp channels retrieved' })
  async getTempChannels(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.tempChannelsService.getTempChannels(guildId);
  }

  @Get('channels/:channelId')
  @ApiOperation({ summary: 'Get a specific temp channel' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Temp channel retrieved' })
  async getTempChannel(
    @Param('botId') botId: string,
    @Param('channelId') channelId: string,
  ) {
    return this.tempChannelsService.getTempChannel(channelId);
  }

  @Post('voice/join')
  @ApiOperation({ summary: 'Handle voice channel join event' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiQuery({ name: 'userId', description: 'User ID', required: true })
  @ApiQuery({ name: 'channelId', description: 'Channel ID', required: true })
  @ApiResponse({ status: 200, description: 'Voice join handled' })
  @HttpCode(HttpStatus.OK)
  async handleVoiceJoin(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('userId') userId: string,
    @Query('channelId') channelId: string,
  ) {
    return this.tempChannelsService.handleVoiceJoin(
      guildId,
      userId,
      channelId,
    );
  }

  @Post('voice/leave')
  @ApiOperation({ summary: 'Handle voice channel leave event' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiQuery({ name: 'userId', description: 'User ID', required: true })
  @ApiQuery({ name: 'channelId', description: 'Channel ID', required: true })
  @ApiResponse({ status: 200, description: 'Voice leave handled' })
  @HttpCode(HttpStatus.OK)
  async handleVoiceLeave(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('userId') userId: string,
    @Query('channelId') channelId: string,
  ) {
    return this.tempChannelsService.handleVoiceLeave(
      guildId,
      userId,
      channelId,
    );
  }

  @Post('channels/:channelId/name')
  @ApiOperation({ summary: 'Set channel name' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Channel name updated' })
  async setChannelName(
    @Param('botId') botId: string,
    @Param('channelId') channelId: string,
    @Body() dto: SetChannelNameDto,
  ) {
    return this.tempChannelsService.setChannelName(
      channelId,
      dto.ownerId,
      dto.name,
    );
  }

  @Post('channels/:channelId/limit')
  @ApiOperation({ summary: 'Set channel user limit' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Channel limit updated' })
  async setChannelLimit(
    @Param('botId') botId: string,
    @Param('channelId') channelId: string,
    @Body() dto: SetChannelLimitDto,
  ) {
    return this.tempChannelsService.setChannelLimit(
      channelId,
      dto.ownerId,
      dto.limit,
    );
  }

  @Post('channels/:channelId/lock')
  @ApiOperation({ summary: 'Lock channel' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Channel locked' })
  async lockChannel(
    @Param('botId') botId: string,
    @Param('channelId') channelId: string,
    @Body() dto: LockChannelDto,
  ) {
    return this.tempChannelsService.lockChannel(channelId, dto.ownerId);
  }

  @Post('channels/:channelId/unlock')
  @ApiOperation({ summary: 'Unlock channel' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Channel unlocked' })
  async unlockChannel(
    @Param('botId') botId: string,
    @Param('channelId') channelId: string,
    @Body() dto: UnlockChannelDto,
  ) {
    return this.tempChannelsService.unlockChannel(channelId, dto.ownerId);
  }

  @Post('channels/:channelId/permit')
  @ApiOperation({ summary: 'Permit user to join channel' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'User permitted' })
  async permitUser(
    @Param('botId') botId: string,
    @Param('channelId') channelId: string,
    @Body() dto: PermitUserDto,
  ) {
    return this.tempChannelsService.permitUser(
      channelId,
      dto.ownerId,
      dto.userId,
    );
  }

  @Post('channels/:channelId/reject')
  @ApiOperation({ summary: 'Reject user from channel' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'User rejected' })
  async rejectUser(
    @Param('botId') botId: string,
    @Param('channelId') channelId: string,
    @Body() dto: RejectUserDto,
  ) {
    return this.tempChannelsService.rejectUser(
      channelId,
      dto.ownerId,
      dto.userId,
    );
  }

  @Post('channels/:channelId/claim')
  @ApiOperation({ summary: 'Claim channel ownership' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Channel claimed' })
  async claimChannel(
    @Param('botId') botId: string,
    @Param('channelId') channelId: string,
    @Body() dto: ClaimChannelDto,
  ) {
    return this.tempChannelsService.claimChannel(channelId, dto.newOwnerId);
  }

  @Post('channels/:channelId/transfer')
  @ApiOperation({ summary: 'Transfer channel ownership' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Ownership transferred' })
  async transferOwnership(
    @Param('botId') botId: string,
    @Param('channelId') channelId: string,
    @Body() dto: TransferOwnershipDto,
  ) {
    return this.tempChannelsService.transferOwnership(
      channelId,
      dto.ownerId,
      dto.newOwnerId,
    );
  }

  @Delete('channels/:channelId')
  @ApiOperation({ summary: 'Delete temp channel' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Channel deleted' })
  async deleteTempChannel(
    @Param('botId') botId: string,
    @Param('channelId') channelId: string,
  ) {
    return this.tempChannelsService.deleteTempChannel(channelId);
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Manually trigger cleanup of empty channels' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiResponse({ status: 200, description: 'Cleanup triggered' })
  @HttpCode(HttpStatus.OK)
  async cleanupEmptyChannels(@Param('botId') botId: string) {
    await this.tempChannelsService.cleanupEmptyChannels();
    return { success: true, message: 'Cleanup completed' };
  }
}
