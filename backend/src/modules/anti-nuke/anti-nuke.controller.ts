import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AntiNukeService } from './anti-nuke.service';
import { UpdateAntiNukeConfigDto } from './dto/update-config.dto';

@ApiTags('Anti-Nuke')
@Controller('bots/:botId/anti-nuke')
// @UseGuards(JwtAuthGuard) // Uncomment when you have authentication set up
@ApiBearerAuth()
export class AntiNukeController {
  private readonly logger = new Logger(AntiNukeController.name);

  constructor(private readonly antiNukeService: AntiNukeService) {}

  // ==================== CONFIG ENDPOINTS ====================

  @Get('config')
  @ApiOperation({ summary: 'Get anti-nuke configuration' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Configuration retrieved successfully',
  })
  async getConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    this.logger.log(`GET /bots/${botId}/anti-nuke/config - Guild: ${guildId}`);

    const config = await this.antiNukeService.getConfig(guildId, botId);

    // Parse JSON strings to arrays for response
    const parsedConfig = {
      ...config,
      whitelistedUsers: config.whitelistedUsers
        ? JSON.parse(config.whitelistedUsers)
        : [],
      whitelistedRoles: config.whitelistedRoles
        ? JSON.parse(config.whitelistedRoles)
        : [],
      allowedBots: config.allowedBots ? JSON.parse(config.allowedBots) : [],
    };

    return {
      success: true,
      data: parsedConfig,
    };
  }

  @Put('config')
  @ApiOperation({ summary: 'Update anti-nuke configuration' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Configuration updated successfully',
  })
  async updateConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() dto: UpdateAntiNukeConfigDto,
  ) {
    this.logger.log(`PUT /bots/${botId}/anti-nuke/config - Guild: ${guildId}`);

    const config = await this.antiNukeService.updateConfig(
      guildId,
      botId,
      dto,
    );

    // Parse JSON strings to arrays for response
    const parsedConfig = {
      ...config,
      whitelistedUsers: config.whitelistedUsers
        ? JSON.parse(config.whitelistedUsers)
        : [],
      whitelistedRoles: config.whitelistedRoles
        ? JSON.parse(config.whitelistedRoles)
        : [],
      allowedBots: config.allowedBots ? JSON.parse(config.allowedBots) : [],
    };

    return {
      success: true,
      message: 'Anti-nuke configuration updated successfully',
      data: parsedConfig,
    };
  }

  // ==================== ACTION HANDLERS ====================

  @Post('check/channel-create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if channel creation should be punished' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Check completed',
  })
  async checkChannelCreate(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body()
    body: { userId: string; channelId: string; userRoles?: string[] },
  ) {
    this.logger.log(
      `POST /bots/${botId}/anti-nuke/check/channel-create - Guild: ${guildId}, User: ${body.userId}`,
    );

    const result = await this.antiNukeService.handleChannelCreate(
      guildId,
      body.userId,
      body.channelId,
      body.userRoles,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('check/channel-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if channel deletion should be punished' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Check completed',
  })
  async checkChannelDelete(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body()
    body: { userId: string; channelId: string; userRoles?: string[] },
  ) {
    this.logger.log(
      `POST /bots/${botId}/anti-nuke/check/channel-delete - Guild: ${guildId}, User: ${body.userId}`,
    );

    const result = await this.antiNukeService.handleChannelDelete(
      guildId,
      body.userId,
      body.channelId,
      body.userRoles,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('check/channel-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if channel update should be punished' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Check completed',
  })
  async checkChannelUpdate(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body()
    body: { userId: string; channelId: string; userRoles?: string[] },
  ) {
    this.logger.log(
      `POST /bots/${botId}/anti-nuke/check/channel-update - Guild: ${guildId}, User: ${body.userId}`,
    );

    const result = await this.antiNukeService.handleChannelUpdate(
      guildId,
      body.userId,
      body.channelId,
      body.userRoles,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('check/role-create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if role creation should be punished' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Check completed',
  })
  async checkRoleCreate(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() body: { userId: string; roleId: string; userRoles?: string[] },
  ) {
    this.logger.log(
      `POST /bots/${botId}/anti-nuke/check/role-create - Guild: ${guildId}, User: ${body.userId}`,
    );

    const result = await this.antiNukeService.handleRoleCreate(
      guildId,
      body.userId,
      body.roleId,
      body.userRoles,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('check/role-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if role deletion should be punished' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Check completed',
  })
  async checkRoleDelete(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() body: { userId: string; roleId: string; userRoles?: string[] },
  ) {
    this.logger.log(
      `POST /bots/${botId}/anti-nuke/check/role-delete - Guild: ${guildId}, User: ${body.userId}`,
    );

    const result = await this.antiNukeService.handleRoleDelete(
      guildId,
      body.userId,
      body.roleId,
      body.userRoles,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('check/role-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if role update should be punished' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Check completed',
  })
  async checkRoleUpdate(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() body: { userId: string; roleId: string; userRoles?: string[] },
  ) {
    this.logger.log(
      `POST /bots/${botId}/anti-nuke/check/role-update - Guild: ${guildId}, User: ${body.userId}`,
    );

    const result = await this.antiNukeService.handleRoleUpdate(
      guildId,
      body.userId,
      body.roleId,
      body.userRoles,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('check/kick')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if kick action should be punished' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Check completed',
  })
  async checkKick(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() body: { userId: string; targetId: string; userRoles?: string[] },
  ) {
    this.logger.log(
      `POST /bots/${botId}/anti-nuke/check/kick - Guild: ${guildId}, User: ${body.userId}`,
    );

    const result = await this.antiNukeService.handleKick(
      guildId,
      body.userId,
      body.targetId,
      body.userRoles,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('check/ban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if ban action should be punished' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Check completed',
  })
  async checkBan(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() body: { userId: string; targetId: string; userRoles?: string[] },
  ) {
    this.logger.log(
      `POST /bots/${botId}/anti-nuke/check/ban - Guild: ${guildId}, User: ${body.userId}`,
    );

    const result = await this.antiNukeService.handleBan(
      guildId,
      body.userId,
      body.targetId,
      body.userRoles,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('check/bot-add')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if bot addition should be punished' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Check completed',
  })
  async checkBotAdd(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body()
    body: { userId: string; addedBotId: string; userRoles?: string[] },
  ) {
    this.logger.log(
      `POST /bots/${botId}/anti-nuke/check/bot-add - Guild: ${guildId}, User: ${body.userId}`,
    );

    const result = await this.antiNukeService.handleBotAdd(
      guildId,
      body.userId,
      body.addedBotId,
      body.userRoles,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('check/webhook-create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if webhook creation should be punished' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Check completed',
  })
  async checkWebhookCreate(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() body: { userId: string; webhookId?: string; userRoles?: string[] },
  ) {
    this.logger.log(
      `POST /bots/${botId}/anti-nuke/check/webhook-create - Guild: ${guildId}, User: ${body.userId}`,
    );

    const result = await this.antiNukeService.handleWebhookCreate(
      guildId,
      body.userId,
      body.webhookId,
      body.userRoles,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('check/whitelist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if a user is whitelisted' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Check completed',
  })
  async checkWhitelist(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() body: { userId: string; userRoles?: string[] },
  ) {
    this.logger.log(
      `POST /bots/${botId}/anti-nuke/check/whitelist - Guild: ${guildId}, User: ${body.userId}`,
    );

    const isWhitelisted = await this.antiNukeService.isWhitelisted(
      guildId,
      body.userId,
      body.userRoles,
    );

    return {
      success: true,
      data: { isWhitelisted },
    };
  }

  // ==================== LOGS ENDPOINTS ====================

  @Get('logs')
  @ApiOperation({ summary: 'Get anti-nuke action logs' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiQuery({
    name: 'page',
    description: 'Page number',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Items per page',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'userId',
    description: 'Filter by user ID',
    required: false,
  })
  @ApiQuery({
    name: 'actionType',
    description: 'Filter by action type',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Logs retrieved successfully',
  })
  async getLogs(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('userId') userId?: string,
    @Query('actionType') actionType?: string,
  ) {
    this.logger.log(
      `GET /bots/${botId}/anti-nuke/logs - Guild: ${guildId}, Page: ${page}, Limit: ${limit}`,
    );

    const result = await this.antiNukeService.getLogs(guildId, {
      page,
      limit,
      userId,
      actionType,
    });

    return {
      success: true,
      data: result.logs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Post('logs/cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete old anti-nuke logs' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({
    name: 'daysToKeep',
    description: 'Number of days to keep logs',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Old logs deleted successfully',
  })
  async cleanupLogs(
    @Param('botId') botId: string,
    @Query('daysToKeep', new DefaultValuePipe(30), ParseIntPipe)
    daysToKeep: number,
  ) {
    this.logger.log(
      `POST /bots/${botId}/anti-nuke/logs/cleanup - Days to keep: ${daysToKeep}`,
    );

    const deletedCount =
      await this.antiNukeService.deleteOldLogs(daysToKeep);

    return {
      success: true,
      message: `Deleted ${deletedCount} old anti-nuke logs`,
      data: { deletedCount },
    };
  }
}
