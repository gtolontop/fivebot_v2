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
import { AutoRespondersService } from './auto-responders.service';
import { TagsService } from './tags.service';
import {
  CreateAutoResponderDto,
  UpdateAutoResponderDto,
  UpdateAutoResponderConfigDto,
  ToggleAutoResponderDto,
  CreateTagDto,
  UpdateTagDto,
  UpdateTagConfigDto,
  SearchTagDto,
} from './dto';

@Controller('bots/:botId')
export class AutoRespondersController {
  constructor(
    private readonly autoRespondersService: AutoRespondersService,
    private readonly tagsService: TagsService,
  ) {}

  // ==================== AUTO-RESPONDERS ====================

  /**
   * Get auto-responder configuration
   */
  @Get('auto-responders/config')
  async getAutoResponderConfig(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    return this.autoRespondersService.getConfig(guildId);
  }

  /**
   * Update auto-responder configuration
   */
  @Put('auto-responders/config')
  async updateAutoResponderConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() dto: UpdateAutoResponderConfigDto,
  ) {
    return this.autoRespondersService.updateConfig(guildId, botId, dto);
  }

  /**
   * Get auto-responder statistics
   */
  @Get('auto-responders/statistics')
  async getAutoResponderStatistics(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    return this.autoRespondersService.getStatistics(guildId);
  }

  /**
   * Get all auto-responders
   */
  @Get('auto-responders')
  async getAutoResponders(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    return this.autoRespondersService.getResponders(guildId);
  }

  /**
   * Create a new auto-responder
   */
  @Post('auto-responders')
  @HttpCode(HttpStatus.CREATED)
  async createAutoResponder(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() dto: CreateAutoResponderDto,
  ) {
    return this.autoRespondersService.createResponder(guildId, botId, dto);
  }

  /**
   * Get a specific auto-responder
   */
  @Get('auto-responders/:id')
  async getAutoResponder(@Param('botId') botId: string, @Param('id') id: string) {
    return this.autoRespondersService.getResponder(id);
  }

  /**
   * Update an auto-responder
   */
  @Put('auto-responders/:id')
  async updateAutoResponder(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAutoResponderDto,
  ) {
    return this.autoRespondersService.updateResponder(id, dto);
  }

  /**
   * Delete an auto-responder
   */
  @Delete('auto-responders/:id')
  @HttpCode(HttpStatus.OK)
  async deleteAutoResponder(@Param('botId') botId: string, @Param('id') id: string) {
    return this.autoRespondersService.deleteResponder(id);
  }

  /**
   * Toggle auto-responder active status
   */
  @Post('auto-responders/:id/toggle')
  async toggleAutoResponder(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Body() dto: ToggleAutoResponderDto,
  ) {
    return this.autoRespondersService.toggleResponder(id, dto.isActive);
  }

  // ==================== TAGS ====================

  /**
   * Get tag configuration
   */
  @Get('tags/config')
  async getTagConfig(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    return this.tagsService.getConfig(guildId);
  }

  /**
   * Update tag configuration
   */
  @Put('tags/config')
  async updateTagConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() dto: UpdateTagConfigDto,
  ) {
    return this.tagsService.updateConfig(guildId, botId, dto);
  }

  /**
   * Search tags
   */
  @Get('tags/search')
  async searchTags(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('q') query: string,
  ) {
    return this.tagsService.searchTags(guildId, query);
  }

  /**
   * Get tag statistics
   */
  @Get('tags/statistics')
  async getTagStatistics(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    return this.tagsService.getStatistics(guildId);
  }

  /**
   * Get tag by alias
   */
  @Get('tags/alias/:alias')
  async getTagByAlias(
    @Param('botId') botId: string,
    @Param('alias') alias: string,
    @Query('guildId') guildId: string,
  ) {
    return this.tagsService.getTagByAlias(guildId, alias);
  }

  /**
   * Get user's tags
   */
  @Get('tags/user/:userId')
  async getUserTags(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Query('guildId') guildId: string,
  ) {
    return this.tagsService.getUserTags(guildId, userId);
  }

  /**
   * Get all tags
   */
  @Get('tags')
  async getTags(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    return this.tagsService.getTags(guildId);
  }

  /**
   * Create a new tag
   */
  @Post('tags')
  @HttpCode(HttpStatus.CREATED)
  async createTag(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('userId') userId: string,
    @Body() dto: CreateTagDto,
  ) {
    return this.tagsService.createTag(guildId, botId, userId, dto);
  }

  /**
   * Get a specific tag by name
   */
  @Get('tags/:name')
  async getTag(
    @Param('botId') botId: string,
    @Param('name') name: string,
    @Query('guildId') guildId: string,
  ) {
    return this.tagsService.getTag(guildId, name);
  }

  /**
   * Update a tag
   */
  @Put('tags/:id')
  async updateTag(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.tagsService.updateTag(id, dto);
  }

  /**
   * Delete a tag
   */
  @Delete('tags/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTag(@Param('botId') botId: string, @Param('id') id: string) {
    return this.tagsService.deleteTag(id);
  }
}
