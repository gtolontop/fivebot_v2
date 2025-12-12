import {
  Controller,
  Get,
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
import { StarboardService } from './starboard.service';
import { UpdateConfigDto } from './dto/update-config.dto';

@ApiTags('Starboard')
@Controller('bots/:botId/starboard')
export class StarboardController {
  constructor(private readonly starboardService: StarboardService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get starboard configuration' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Configuration retrieved' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async getConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.starboardService.getConfig(guildId);
  }

  @Put('config')
  @ApiOperation({ summary: 'Update starboard configuration' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() updateConfigDto: UpdateConfigDto,
  ) {
    return this.starboardService.updateConfig(guildId, botId, updateConfigDto);
  }

  @Get('entries')
  @ApiOperation({ summary: 'Get paginated starboard entries' })
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
  @ApiResponse({ status: 200, description: 'Entries retrieved' })
  async getEntries(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.starboardService.getEntries(guildId, pageNum, limitNum);
  }

  @Get('top')
  @ApiOperation({ summary: 'Get top starred messages' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiQuery({
    name: 'limit',
    description: 'Number of entries to return',
    required: false,
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Top entries retrieved' })
  async getTopEntries(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.starboardService.getTopEntries(guildId, limitNum);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: "Get user's top starred messages" })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiQuery({
    name: 'limit',
    description: 'Number of entries to return',
    required: false,
    type: Number,
  })
  @ApiResponse({ status: 200, description: "User's top entries retrieved" })
  async getUserTopEntries(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.starboardService.getUserTopEntries(guildId, userId, limitNum);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get leaderboard of users with most starred messages' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiQuery({
    name: 'limit',
    description: 'Number of users to return',
    required: false,
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved' })
  async getLeaderboard(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.starboardService.getLeaderboard(guildId, limitNum);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get starboard statistics for a guild' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStatistics(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.starboardService.getStatistics(guildId);
  }

  @Delete('entries/:entryId')
  @ApiOperation({ summary: 'Delete a starboard entry' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'entryId', description: 'Entry ID' })
  @ApiResponse({ status: 200, description: 'Entry deleted' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  @HttpCode(HttpStatus.OK)
  async deleteEntry(
    @Param('botId') botId: string,
    @Param('entryId') entryId: string,
  ) {
    return this.starboardService.deleteEntry(entryId);
  }
}
