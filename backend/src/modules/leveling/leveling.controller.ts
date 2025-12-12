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
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { LevelingService } from './leveling.service';
import { LevelingConfigService } from './leveling-config.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import { UpdateUserLevelDto } from './dto/update-user-level.dto';
import { CreateRewardDto } from './dto/create-reward.dto';

@ApiTags('Leveling')
@Controller('bots/:botId/leveling')
export class LevelingController {
  constructor(
    private readonly levelingService: LevelingService,
    private readonly configService: LevelingConfigService,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Get leveling configuration' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Configuration retrieved' })
  async getConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.configService.getConfig(guildId);
  }

  @Put('config')
  @ApiOperation({ summary: 'Update leveling configuration' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() updateConfigDto: UpdateConfigDto,
  ) {
    return this.configService.updateConfig(guildId, updateConfigDto);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get guild leaderboard' })
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
    name: 'type',
    description: 'Leaderboard type (all, weekly, monthly)',
    required: false,
    enum: ['all', 'weekly', 'monthly'],
  })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved' })
  async getLeaderboard(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    if (type === 'weekly') {
      return this.levelingService.getWeeklyLeaderboard(guildId);
    }

    if (type === 'monthly') {
      return this.levelingService.getMonthlyLeaderboard(guildId);
    }

    return this.levelingService.getLeaderboard(guildId, pageNum, limitNum);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user level data' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'User level data retrieved' })
  async getUserLevel(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.levelingService.getUserLevel(guildId, userId);
  }

  @Put('user/:userId')
  @ApiOperation({ summary: 'Update user level data' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'User level data updated' })
  async updateUserLevel(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
    @Body() updateUserLevelDto: UpdateUserLevelDto,
  ) {
    if (updateUserLevelDto.xp !== undefined) {
      return this.levelingService.setXp(
        guildId,
        botId,
        userId,
        updateUserLevelDto.xp,
      );
    }

    if (updateUserLevelDto.level !== undefined) {
      return this.levelingService.setLevel(
        guildId,
        botId,
        userId,
        updateUserLevelDto.level,
      );
    }

    throw new Error('Either xp or level must be provided');
  }

  @Get('rewards')
  @ApiOperation({ summary: 'Get level rewards' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Rewards retrieved' })
  async getRewards(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.configService.getRewards(guildId);
  }

  @Post('rewards')
  @ApiOperation({ summary: 'Add level reward' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 201, description: 'Reward created' })
  @HttpCode(HttpStatus.CREATED)
  async addReward(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() createRewardDto: CreateRewardDto,
  ) {
    return this.configService.addReward(
      guildId,
      createRewardDto.level,
      createRewardDto.type,
      createRewardDto,
    );
  }

  @Delete('rewards/:rewardId')
  @ApiOperation({ summary: 'Remove level reward' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'rewardId', description: 'Reward ID' })
  @ApiResponse({ status: 200, description: 'Reward removed' })
  async removeReward(
    @Param('botId') botId: string,
    @Param('rewardId') rewardId: string,
  ) {
    return this.configService.removeReward(rewardId);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset leveling data' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiQuery({
    name: 'userId',
    description: 'User ID (optional, resets specific user)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Data reset' })
  async reset(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('userId') userId?: string,
  ) {
    if (userId) {
      return this.levelingService.resetUser(guildId, userId);
    }

    return this.levelingService.resetGuild(guildId);
  }

  @Get('user/:userId/rank')
  @ApiOperation({ summary: 'Get user rank in guild' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'User rank retrieved' })
  async getUserRank(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
  ) {
    const rank = await this.levelingService.getGuildRank(guildId, userId);
    return { rank };
  }
}
