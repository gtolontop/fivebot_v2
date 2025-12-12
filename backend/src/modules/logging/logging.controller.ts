import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { LoggingService, LogEventType } from './logging.service';
import { UpdateLoggingConfigDto, SetChannelDto } from './dto';

@Controller('bots/:botId/logging')
@UseGuards(JwtAuthGuard)
export class LoggingController {
  constructor(private readonly loggingService: LoggingService) {}

  // ==================== CONFIG ====================

  @Get('config')
  async getConfig(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.loggingService.getOrCreateConfig(guildId, botId);
  }

  @Put('config')
  async updateConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() updateDto: UpdateLoggingConfigDto,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.loggingService.updateConfig(guildId, botId, updateDto);
  }

  // ==================== EVENT CHANNELS ====================

  @Put('channels/:eventType')
  async setEventChannel(
    @Param('botId') botId: string,
    @Param('eventType') eventType: string,
    @Query('guildId') guildId: string,
    @Body() setChannelDto: SetChannelDto,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }

    // Validate event type
    if (!Object.values(LogEventType).includes(eventType as LogEventType)) {
      return { error: `Invalid event type: ${eventType}` };
    }

    return this.loggingService.setEventChannel(
      guildId,
      eventType as LogEventType,
      setChannelDto.channelId,
    );
  }

  @Get('channels/:eventType')
  async getEventChannel(
    @Param('botId') botId: string,
    @Param('eventType') eventType: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }

    // Validate event type
    if (!Object.values(LogEventType).includes(eventType as LogEventType)) {
      return { error: `Invalid event type: ${eventType}` };
    }

    const channelId = await this.loggingService.getEventChannel(
      guildId,
      eventType as LogEventType,
    );

    return { eventType, channelId };
  }

  // ==================== IGNORED ====================

  @Get('ignored')
  async getIgnored(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }

    const [channels, roles] = await Promise.all([
      this.loggingService.getIgnoredChannels(guildId),
      this.loggingService.getIgnoredRoles(guildId),
    ]);

    return {
      channels,
      roles,
    };
  }

  // ==================== IGNORED CHANNELS ====================

  @Post('ignored/channels')
  @HttpCode(HttpStatus.OK)
  async addIgnoredChannel(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() body: { channelId: string },
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }

    if (!body.channelId) {
      return { error: 'channelId is required in request body' };
    }

    return this.loggingService.addIgnoredChannel(guildId, body.channelId);
  }

  @Delete('ignored/channels/:channelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeIgnoredChannel(
    @Param('botId') botId: string,
    @Param('channelId') channelId: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }

    await this.loggingService.removeIgnoredChannel(guildId, channelId);
  }

  // ==================== IGNORED ROLES ====================

  @Post('ignored/roles')
  @HttpCode(HttpStatus.OK)
  async addIgnoredRole(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() body: { roleId: string },
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }

    if (!body.roleId) {
      return { error: 'roleId is required in request body' };
    }

    return this.loggingService.addIgnoredRole(guildId, body.roleId);
  }

  @Delete('ignored/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeIgnoredRole(
    @Param('botId') botId: string,
    @Param('roleId') roleId: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }

    await this.loggingService.removeIgnoredRole(guildId, roleId);
  }

  // ==================== UTILITY ====================

  @Get('should-log')
  async shouldLog(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('channelId') channelId?: string,
    @Query('userId') userId?: string,
    @Query('roleIds') roleIds?: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }

    // Parse roleIds if provided (comma-separated)
    const roleIdArray = roleIds ? roleIds.split(',') : undefined;

    const shouldLog = await this.loggingService.shouldLog(
      guildId,
      channelId,
      userId,
      roleIdArray,
    );

    return { shouldLog };
  }
}
