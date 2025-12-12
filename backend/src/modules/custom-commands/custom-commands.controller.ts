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
} from '@nestjs/common';
import { CustomCommandsService } from './custom-commands.service';
import { CreateCommandDto, UpdateCommandDto, UpdateConfigDto } from './dto';

@Controller('bots/:botId')
export class CustomCommandsController {
  constructor(private readonly customCommandsService: CustomCommandsService) {}

  // ==================== CONFIGURATION ====================

  /**
   * Get custom commands configuration
   */
  @Get('custom-commands/config')
  async getConfig(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    return this.customCommandsService.getConfig(guildId);
  }

  /**
   * Update custom commands configuration
   */
  @Put('custom-commands/config')
  async updateConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() dto: UpdateConfigDto,
  ) {
    return this.customCommandsService.updateConfig(guildId, botId, dto);
  }

  // ==================== STATISTICS ====================

  /**
   * Get custom commands statistics
   */
  @Get('custom-commands/statistics')
  async getStatistics(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    return this.customCommandsService.getStatistics(guildId);
  }

  // ==================== COMMANDS ====================

  /**
   * Get all custom commands for a guild
   */
  @Get('custom-commands')
  async listCommands(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('includeDisabled') includeDisabled?: string,
  ) {
    const include = includeDisabled === 'true';
    return this.customCommandsService.listCommands(guildId, include);
  }

  /**
   * Create a new custom command
   */
  @Post('custom-commands')
  @HttpCode(HttpStatus.CREATED)
  async createCommand(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('userId') userId: string,
    @Body() dto: CreateCommandDto,
  ) {
    return this.customCommandsService.createCommand(guildId, botId, userId, dto);
  }

  /**
   * Get a specific custom command by ID
   */
  @Get('custom-commands/:id')
  async getCommandById(@Param('botId') botId: string, @Param('id') id: string) {
    return this.customCommandsService.listCommands('', true).then((commands) =>
      commands.find((cmd) => cmd.id === id),
    );
  }

  /**
   * Update a custom command
   */
  @Put('custom-commands/:id')
  async updateCommand(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCommandDto,
  ) {
    return this.customCommandsService.updateCommand(id, dto);
  }

  /**
   * Delete a custom command
   */
  @Delete('custom-commands/:id')
  @HttpCode(HttpStatus.OK)
  async deleteCommand(@Param('botId') botId: string, @Param('id') id: string) {
    return this.customCommandsService.deleteCommand(id);
  }

  /**
   * Duplicate a custom command
   */
  @Post('custom-commands/:id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicateCommand(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body('newName') newName: string,
  ) {
    return this.customCommandsService.duplicateCommand(id, newName, userId);
  }

  // ==================== IMPORT/EXPORT ====================

  /**
   * Export all commands for a guild
   */
  @Get('custom-commands/export')
  async exportCommands(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    return this.customCommandsService.exportCommands(guildId);
  }

  /**
   * Import commands for a guild
   */
  @Post('custom-commands/import')
  @HttpCode(HttpStatus.OK)
  async importCommands(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('userId') userId: string,
    @Body('commands') commands: CreateCommandDto[],
  ) {
    return this.customCommandsService.importCommands(guildId, botId, userId, commands);
  }

  // ==================== EXECUTION ====================

  /**
   * Execute a command (for testing purposes)
   */
  @Post('custom-commands/execute')
  @HttpCode(HttpStatus.OK)
  async executeCommand(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body('trigger') trigger: string,
    @Body('context') context: any,
  ) {
    return this.customCommandsService.executeCommand(guildId, trigger, context);
  }
}
