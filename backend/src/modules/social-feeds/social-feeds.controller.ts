import {
  Controller,
  Get,
  Post,
  Put,
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
import { SocialFeedsService } from './social-feeds.service';
import {
  CreateFeedDto,
  UpdateFeedDto,
  UpdateConfigDto,
  ToggleFeedDto,
} from './dto';

@ApiTags('Social Feeds')
@Controller('bots/:botId/social-feeds')
export class SocialFeedsController {
  constructor(private readonly socialFeedsService: SocialFeedsService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get social feeds configuration' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Configuration retrieved' })
  async getConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.socialFeedsService.getConfig(guildId);
  }

  @Put('config')
  @ApiOperation({ summary: 'Update social feeds configuration' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() updateConfigDto: UpdateConfigDto,
  ) {
    return this.socialFeedsService.updateConfig(
      guildId,
      botId,
      updateConfigDto.enabled,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all social feeds for a guild' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Feeds retrieved' })
  async getFeeds(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.socialFeedsService.getFeeds(guildId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new social feed' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 201, description: 'Feed created' })
  @HttpCode(HttpStatus.CREATED)
  async createFeed(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() createFeedDto: CreateFeedDto,
  ) {
    return this.socialFeedsService.createFeed(guildId, botId, createFeedDto);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get social feeds statistics for a guild' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStatistics(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.socialFeedsService.getStatistics(guildId);
  }

  @Get(':feedId')
  @ApiOperation({ summary: 'Get a specific social feed' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'feedId', description: 'Feed ID' })
  @ApiResponse({ status: 200, description: 'Feed retrieved' })
  async getFeed(
    @Param('botId') botId: string,
    @Param('feedId') feedId: string,
  ) {
    return this.socialFeedsService.getFeed(feedId);
  }

  @Put(':feedId')
  @ApiOperation({ summary: 'Update a social feed' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'feedId', description: 'Feed ID' })
  @ApiResponse({ status: 200, description: 'Feed updated' })
  async updateFeed(
    @Param('botId') botId: string,
    @Param('feedId') feedId: string,
    @Body() updateFeedDto: UpdateFeedDto,
  ) {
    return this.socialFeedsService.updateFeed(feedId, updateFeedDto);
  }

  @Delete(':feedId')
  @ApiOperation({ summary: 'Delete a social feed' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'feedId', description: 'Feed ID' })
  @ApiResponse({ status: 200, description: 'Feed deleted' })
  async deleteFeed(
    @Param('botId') botId: string,
    @Param('feedId') feedId: string,
  ) {
    return this.socialFeedsService.deleteFeed(feedId);
  }

  @Post(':feedId/test')
  @ApiOperation({ summary: 'Test a social feed notification' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'feedId', description: 'Feed ID' })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  async testFeed(
    @Param('botId') botId: string,
    @Param('feedId') feedId: string,
  ) {
    return this.socialFeedsService.testFeed(feedId);
  }

  @Post(':feedId/check')
  @ApiOperation({ summary: 'Check a feed for new content' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'feedId', description: 'Feed ID' })
  @ApiResponse({ status: 200, description: 'Feed checked' })
  async checkFeed(
    @Param('botId') botId: string,
    @Param('feedId') feedId: string,
  ) {
    return this.socialFeedsService.checkFeed(feedId);
  }

  @Post(':feedId/toggle')
  @ApiOperation({ summary: 'Toggle a feed active status' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'feedId', description: 'Feed ID' })
  @ApiResponse({ status: 200, description: 'Feed toggled' })
  async toggleFeed(
    @Param('botId') botId: string,
    @Param('feedId') feedId: string,
    @Body() toggleFeedDto: ToggleFeedDto,
  ) {
    return this.socialFeedsService.toggleFeed(feedId, toggleFeedDto.isActive);
  }
}
