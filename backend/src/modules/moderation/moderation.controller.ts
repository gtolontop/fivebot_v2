import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ModerationService } from './moderation.service';
import { AutoModService } from './auto-mod.service';
import {
  CreateWarnDto,
  CreateMuteDto,
  CreateKickDto,
  CreateBanDto,
  UpdateConfigDto,
  AppealCaseDto,
  ReviewAppealDto,
  EditCaseDto,
  RemovePunishmentDto,
} from './dto';
import { ModerationType } from '@prisma/client';

@ApiTags('Moderation')
@Controller('bots/:botId/moderation')
// @UseGuards(JwtAuthGuard) // Uncomment when you have authentication set up
@ApiBearerAuth()
export class ModerationController {
  private readonly logger = new Logger(ModerationController.name);

  constructor(
    private readonly moderationService: ModerationService,
    private readonly autoModService: AutoModService,
  ) {}

  // ==================== CONFIG ENDPOINTS ====================

  @Get('config')
  @ApiOperation({ summary: 'Get moderation configuration' })
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
    this.logger.log(
      `GET /bots/${botId}/moderation/config - Guild: ${guildId}`,
    );

    const config = await this.autoModService.getConfigWithArrays(guildId);

    return {
      success: true,
      data: config,
    };
  }

  @Put('config')
  @ApiOperation({ summary: 'Update moderation configuration' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Configuration updated successfully',
  })
  async updateConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() dto: UpdateConfigDto,
  ) {
    this.logger.log(
      `PUT /bots/${botId}/moderation/config - Guild: ${guildId}`,
    );

    const config = await this.autoModService.updateConfig(guildId, botId, dto);

    return {
      success: true,
      message: 'Configuration updated successfully',
      data: config,
    };
  }

  // ==================== CASE ENDPOINTS ====================

  @Get('cases')
  @ApiOperation({ summary: 'Get moderation cases with pagination' })
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
    name: 'targetId',
    description: 'Filter by target user ID',
    required: false,
  })
  @ApiQuery({
    name: 'moderatorId',
    description: 'Filter by moderator ID',
    required: false,
  })
  @ApiQuery({
    name: 'type',
    description: 'Filter by case type',
    required: false,
    enum: ModerationType,
  })
  @ApiQuery({
    name: 'active',
    description: 'Filter by active status',
    required: false,
    type: Boolean,
  })
  @ApiResponse({ status: 200, description: 'Cases retrieved successfully' })
  async getCases(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('targetId') targetId?: string,
    @Query('moderatorId') moderatorId?: string,
    @Query('type') type?: ModerationType,
    @Query('active') active?: boolean,
  ) {
    this.logger.log(`GET /bots/${botId}/moderation/cases - Guild: ${guildId}`);

    const result = await this.moderationService.getCases(guildId, {
      page,
      limit,
      targetId,
      moderatorId,
      type,
      active,
    });

    return {
      success: true,
      data: result.cases,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get('cases/:caseNumber')
  @ApiOperation({ summary: 'Get a specific moderation case' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'caseNumber', description: 'Case number' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Case retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async getCase(
    @Param('botId') botId: string,
    @Param('caseNumber', ParseIntPipe) caseNumber: number,
    @Query('guildId') guildId: string,
  ) {
    this.logger.log(
      `GET /bots/${botId}/moderation/cases/${caseNumber} - Guild: ${guildId}`,
    );

    const moderationCase = await this.moderationService.getCase(
      guildId,
      caseNumber,
    );

    return {
      success: true,
      data: moderationCase,
    };
  }

  @Put('cases/:caseNumber')
  @ApiOperation({ summary: 'Edit a moderation case' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'caseNumber', description: 'Case number' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Case updated successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async editCase(
    @Param('botId') botId: string,
    @Param('caseNumber', ParseIntPipe) caseNumber: number,
    @Query('guildId') guildId: string,
    @Body() dto: EditCaseDto,
  ) {
    this.logger.log(
      `PUT /bots/${botId}/moderation/cases/${caseNumber} - Guild: ${guildId}`,
    );

    const moderationCase = await this.moderationService.editCase(
      guildId,
      caseNumber,
      dto,
    );

    return {
      success: true,
      message: 'Case updated successfully',
      data: moderationCase,
    };
  }

  @Delete('cases/:caseNumber')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a moderation case' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'caseNumber', description: 'Case number' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 204, description: 'Case deleted successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async deleteCase(
    @Param('botId') botId: string,
    @Param('caseNumber', ParseIntPipe) caseNumber: number,
    @Query('guildId') guildId: string,
  ) {
    this.logger.log(
      `DELETE /bots/${botId}/moderation/cases/${caseNumber} - Guild: ${guildId}`,
    );

    await this.moderationService.deleteCase(guildId, caseNumber);
  }

  // ==================== PUNISHMENT ENDPOINTS ====================

  @Post('warn')
  @ApiOperation({ summary: 'Create a warning' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiResponse({ status: 201, description: 'Warning created successfully' })
  async createWarn(
    @Param('botId') botId: string,
    @Body() dto: CreateWarnDto,
  ) {
    this.logger.log(
      `POST /bots/${botId}/moderation/warn - Target: ${dto.targetId}`,
    );

    const moderationCase = await this.moderationService.createWarn(botId, dto);

    return {
      success: true,
      message: 'Warning created successfully',
      data: moderationCase,
    };
  }

  @Post('mute')
  @ApiOperation({ summary: 'Create a mute' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiResponse({ status: 201, description: 'Mute created successfully' })
  @ApiResponse({
    status: 400,
    description: 'User already has an active mute',
  })
  async createMute(
    @Param('botId') botId: string,
    @Body() dto: CreateMuteDto,
  ) {
    this.logger.log(
      `POST /bots/${botId}/moderation/mute - Target: ${dto.targetId}`,
    );

    const moderationCase = await this.moderationService.createMute(botId, dto);

    return {
      success: true,
      message: 'Mute created successfully',
      data: moderationCase,
    };
  }

  @Delete('mute')
  @ApiOperation({ summary: 'Remove a mute' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiQuery({ name: 'targetId', description: 'Target user ID', required: true })
  @ApiResponse({ status: 200, description: 'Mute removed successfully' })
  @ApiResponse({ status: 404, description: 'No active mute found' })
  async removeMute(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('targetId') targetId: string,
    @Body() dto: RemovePunishmentDto,
  ) {
    this.logger.log(
      `DELETE /bots/${botId}/moderation/mute - Target: ${targetId}`,
    );

    const moderationCase = await this.moderationService.removeMute(
      botId,
      guildId,
      targetId,
      dto,
    );

    return {
      success: true,
      message: 'Mute removed successfully',
      data: moderationCase,
    };
  }

  @Post('kick')
  @ApiOperation({ summary: 'Create a kick' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiResponse({ status: 201, description: 'Kick created successfully' })
  async createKick(
    @Param('botId') botId: string,
    @Body() dto: CreateKickDto,
  ) {
    this.logger.log(
      `POST /bots/${botId}/moderation/kick - Target: ${dto.targetId}`,
    );

    const moderationCase = await this.moderationService.createKick(botId, dto);

    return {
      success: true,
      message: 'Kick created successfully',
      data: moderationCase,
    };
  }

  @Post('ban')
  @ApiOperation({ summary: 'Create a ban' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiResponse({ status: 201, description: 'Ban created successfully' })
  @ApiResponse({
    status: 400,
    description: 'User already has an active ban',
  })
  async createBan(@Param('botId') botId: string, @Body() dto: CreateBanDto) {
    this.logger.log(
      `POST /bots/${botId}/moderation/ban - Target: ${dto.targetId}`,
    );

    const moderationCase = await this.moderationService.createBan(botId, dto);

    return {
      success: true,
      message: 'Ban created successfully',
      data: moderationCase,
    };
  }

  @Delete('ban')
  @ApiOperation({ summary: 'Remove a ban' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiQuery({ name: 'targetId', description: 'Target user ID', required: true })
  @ApiResponse({ status: 200, description: 'Ban removed successfully' })
  @ApiResponse({ status: 404, description: 'No active ban found' })
  async removeBan(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('targetId') targetId: string,
    @Body() dto: RemovePunishmentDto,
  ) {
    this.logger.log(
      `DELETE /bots/${botId}/moderation/ban - Target: ${targetId}`,
    );

    const moderationCase = await this.moderationService.removeBan(
      botId,
      guildId,
      targetId,
      dto,
    );

    return {
      success: true,
      message: 'Ban removed successfully',
      data: moderationCase,
    };
  }

  // ==================== USER ENDPOINTS ====================

  @Get('user/:userId/history')
  @ApiOperation({ summary: 'Get user moderation history' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  async getUserHistory(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
  ) {
    this.logger.log(
      `GET /bots/${botId}/moderation/user/${userId}/history - Guild: ${guildId}`,
    );

    const [cases, activePunishments] = await Promise.all([
      this.moderationService.getUserCases(guildId, userId),
      this.moderationService.getActivePunishments(guildId, userId),
    ]);

    return {
      success: true,
      data: {
        cases,
        activePunishments,
        totalCases: cases.length,
        activePunishmentsCount: activePunishments.length,
      },
    };
  }

  @Get('user/:userId/active')
  @ApiOperation({ summary: 'Get active punishments for a user' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Active punishments retrieved successfully',
  })
  async getActivePunishments(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
  ) {
    this.logger.log(
      `GET /bots/${botId}/moderation/user/${userId}/active - Guild: ${guildId}`,
    );

    const activePunishments =
      await this.moderationService.getActivePunishments(guildId, userId);

    return {
      success: true,
      data: activePunishments,
    };
  }

  // ==================== APPEAL ENDPOINTS ====================

  @Post('cases/:caseNumber/appeal')
  @ApiOperation({ summary: 'Appeal a moderation case' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'caseNumber', description: 'Case number' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Appeal submitted successfully' })
  @ApiResponse({ status: 400, description: 'Case already appealed' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async appealCase(
    @Param('botId') botId: string,
    @Param('caseNumber', ParseIntPipe) caseNumber: number,
    @Query('guildId') guildId: string,
    @Body() dto: AppealCaseDto,
  ) {
    this.logger.log(
      `POST /bots/${botId}/moderation/cases/${caseNumber}/appeal - Guild: ${guildId}`,
    );

    const moderationCase = await this.moderationService.appealCase(
      guildId,
      caseNumber,
      dto,
    );

    return {
      success: true,
      message: 'Appeal submitted successfully',
      data: moderationCase,
    };
  }

  @Put('cases/:caseNumber/appeal/review')
  @ApiOperation({ summary: 'Review an appeal' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'caseNumber', description: 'Case number' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Appeal reviewed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid appeal status' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async reviewAppeal(
    @Param('botId') botId: string,
    @Param('caseNumber', ParseIntPipe) caseNumber: number,
    @Query('guildId') guildId: string,
    @Body() dto: ReviewAppealDto,
  ) {
    this.logger.log(
      `PUT /bots/${botId}/moderation/cases/${caseNumber}/appeal/review - Guild: ${guildId}`,
    );

    const moderationCase = await this.moderationService.reviewAppeal(
      guildId,
      caseNumber,
      dto,
    );

    return {
      success: true,
      message: `Appeal ${dto.approved ? 'approved' : 'denied'} successfully`,
      data: moderationCase,
    };
  }

  // ==================== STATISTICS ENDPOINTS ====================

  @Get('statistics')
  @ApiOperation({ summary: 'Get moderation statistics' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiQuery({
    name: 'days',
    description: 'Number of days to include',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    this.logger.log(
      `GET /bots/${botId}/moderation/statistics - Guild: ${guildId}`,
    );

    const [autoModStats, caseCount] = await Promise.all([
      this.autoModService.getStatistics(guildId, days),
      this.moderationService.getCaseCount(guildId),
    ]);

    return {
      success: true,
      data: {
        ...autoModStats,
        totalCases: caseCount,
      },
    };
  }

  @Get('statistics/automod')
  @ApiOperation({ summary: 'Get auto-moderation statistics' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiQuery({
    name: 'days',
    description: 'Number of days to include',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Auto-mod statistics retrieved successfully',
  })
  async getAutoModStatistics(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    this.logger.log(
      `GET /bots/${botId}/moderation/statistics/automod - Guild: ${guildId}`,
    );

    const stats = await this.autoModService.getStatistics(guildId, days);

    return {
      success: true,
      data: stats,
    };
  }

  // ==================== UTILITY ENDPOINTS ====================

  @Post('expire-punishments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger punishment expiration check' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiResponse({
    status: 200,
    description: 'Expiration check completed',
  })
  async expirePunishments(@Param('botId') botId: string) {
    this.logger.log(`POST /bots/${botId}/moderation/expire-punishments`);

    const count = await this.moderationService.expireOldPunishments();

    return {
      success: true,
      message: `Expired ${count} old punishments`,
      data: { count },
    };
  }
}
