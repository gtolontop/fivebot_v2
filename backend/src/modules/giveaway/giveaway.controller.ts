import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GiveawayService } from './giveaway.service';
import { CreateGiveawayDto } from './dto/create-giveaway.dto';
import { UpdateGiveawayDto } from './dto/update-giveaway.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { RerollGiveawayDto } from './dto/reroll-giveaway.dto';

@ApiTags('Giveaways')
@Controller('bots/:botId/giveaways')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class GiveawayController {
  constructor(private readonly giveawayService: GiveawayService) {}

  // ==================== CONFIG ====================

  @Get('config')
  @ApiOperation({ summary: 'Get giveaway configuration for a guild' })
  @ApiResponse({ status: 200, description: 'Giveaway configuration retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async getConfig(@Query('guildId') guildId: string) {
    return this.giveawayService.getConfig(guildId);
  }

  @Put('config')
  @ApiOperation({ summary: 'Update giveaway configuration for a guild' })
  @ApiResponse({ status: 200, description: 'Configuration updated successfully' })
  async updateConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() updateConfigDto: UpdateConfigDto,
  ) {
    return this.giveawayService.updateConfig(guildId, botId, updateConfigDto);
  }

  // ==================== GIVEAWAY CRUD ====================

  @Get()
  @ApiOperation({ summary: 'Get all giveaways for a guild' })
  @ApiResponse({ status: 200, description: 'Giveaways retrieved successfully' })
  async getGiveaways(
    @Query('guildId') guildId: string,
    @Query('status') status?: 'active' | 'ended',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (status === 'ended') {
      const pageNum = page ? parseInt(page) : 1;
      const limitNum = limit ? parseInt(limit) : 20;
      return this.giveawayService.getEndedGiveaways(guildId, pageNum, limitNum);
    }

    // Default to active giveaways
    return this.giveawayService.getActiveGiveaways(guildId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new giveaway' })
  @ApiResponse({ status: 201, description: 'Giveaway created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @HttpCode(HttpStatus.CREATED)
  async createGiveaway(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() createGiveawayDto: CreateGiveawayDto,
  ) {
    return this.giveawayService.createGiveaway(guildId, botId, createGiveawayDto);
  }

  @Get(':giveawayId')
  @ApiOperation({ summary: 'Get a specific giveaway by ID' })
  @ApiResponse({ status: 200, description: 'Giveaway retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Giveaway not found' })
  async getGiveaway(@Param('giveawayId') giveawayId: string) {
    return this.giveawayService.getGiveaway(giveawayId);
  }

  @Put(':giveawayId')
  @ApiOperation({ summary: 'Update a giveaway' })
  @ApiResponse({ status: 200, description: 'Giveaway updated successfully' })
  @ApiResponse({ status: 404, description: 'Giveaway not found' })
  async updateGiveaway(
    @Param('giveawayId') giveawayId: string,
    @Body() updateGiveawayDto: UpdateGiveawayDto,
  ) {
    return this.giveawayService.updateGiveaway(giveawayId, updateGiveawayDto);
  }

  @Delete(':giveawayId')
  @ApiOperation({ summary: 'Cancel a giveaway' })
  @ApiResponse({ status: 200, description: 'Giveaway cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Giveaway not found' })
  async cancelGiveaway(@Param('giveawayId') giveawayId: string) {
    return this.giveawayService.cancelGiveaway(giveawayId);
  }

  // ==================== GIVEAWAY ACTIONS ====================

  @Post(':giveawayId/end')
  @ApiOperation({ summary: 'End a giveaway and pick winners' })
  @ApiResponse({ status: 200, description: 'Giveaway ended successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Giveaway not found' })
  async endGiveaway(@Param('giveawayId') giveawayId: string) {
    return this.giveawayService.endGiveaway(giveawayId);
  }

  @Post(':giveawayId/pause')
  @ApiOperation({ summary: 'Pause an active giveaway' })
  @ApiResponse({ status: 200, description: 'Giveaway paused successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async pauseGiveaway(@Param('giveawayId') giveawayId: string) {
    return this.giveawayService.pauseGiveaway(giveawayId);
  }

  @Post(':giveawayId/resume')
  @ApiOperation({ summary: 'Resume a paused giveaway' })
  @ApiResponse({ status: 200, description: 'Giveaway resumed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async resumeGiveaway(@Param('giveawayId') giveawayId: string) {
    return this.giveawayService.resumeGiveaway(giveawayId);
  }

  @Post(':giveawayId/reroll')
  @ApiOperation({ summary: 'Reroll a giveaway to pick new winners' })
  @ApiResponse({ status: 200, description: 'Giveaway rerolled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Giveaway not found' })
  async rerollGiveaway(
    @Param('giveawayId') giveawayId: string,
    @Body() rerollDto: RerollGiveawayDto,
  ) {
    return this.giveawayService.rerollGiveaway(giveawayId, rerollDto.winnersCount);
  }

  // ==================== ENTRIES ====================

  @Get(':giveawayId/entries')
  @ApiOperation({ summary: 'Get all entries for a giveaway' })
  @ApiResponse({ status: 200, description: 'Entries retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Giveaway not found' })
  async getEntries(@Param('giveawayId') giveawayId: string) {
    return this.giveawayService.getGiveawayEntries(giveawayId);
  }

  @Post(':giveawayId/enter')
  @ApiOperation({ summary: 'Enter a user into a giveaway' })
  @ApiResponse({ status: 201, description: 'Entered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Giveaway not found' })
  @ApiResponse({ status: 409, description: 'Already entered' })
  @HttpCode(HttpStatus.CREATED)
  async enterGiveaway(
    @Param('giveawayId') giveawayId: string,
    @Body('userId') userId: string,
  ) {
    return this.giveawayService.enterGiveaway(giveawayId, userId);
  }

  @Post(':giveawayId/leave')
  @ApiOperation({ summary: 'Remove a user from a giveaway' })
  @ApiResponse({ status: 200, description: 'Left successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async leaveGiveaway(
    @Param('giveawayId') giveawayId: string,
    @Body('userId') userId: string,
  ) {
    return this.giveawayService.leaveGiveaway(giveawayId, userId);
  }

  @Post(':giveawayId/check-requirements')
  @ApiOperation({ summary: 'Check if a user meets giveaway requirements' })
  @ApiResponse({ status: 200, description: 'Requirements checked successfully' })
  @ApiResponse({ status: 404, description: 'Giveaway not found' })
  async checkRequirements(
    @Param('giveawayId') giveawayId: string,
    @Body('userId') userId: string,
    @Body('userRoles') userRoles?: string[],
    @Body('userLevel') userLevel?: number,
    @Body('userMessages') userMessages?: number,
  ) {
    return this.giveawayService.checkRequirements(
      giveawayId,
      userId,
      userRoles,
      userLevel,
      userMessages,
    );
  }
}
