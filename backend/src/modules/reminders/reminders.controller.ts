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
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RemindersService } from './reminders.service';
import {
  CreateReminderDto,
  UpdateReminderDto,
  SnoozeReminderDto,
  CreateScheduledMessageDto,
  UpdateScheduledMessageDto,
  QueryRemindersDto,
} from './dto';

@ApiTags('Reminders')
@Controller('bots/:botId/reminders')
export class RemindersController {
  private readonly logger = new Logger(RemindersController.name);

  constructor(private readonly remindersService: RemindersService) {}

  // ==================== REMINDERS ENDPOINTS ====================

  @Get()
  @ApiOperation({ summary: 'Get user reminders' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'userId', description: 'User ID', required: true })
  @ApiQuery({ name: 'page', description: 'Page number', required: false })
  @ApiQuery({ name: 'limit', description: 'Items per page', required: false })
  @ApiResponse({ status: 200, description: 'Reminders retrieved successfully' })
  async getUserReminders(
    @Param('botId') botId: string,
    @Query('userId') userId: string,
    @Query() query: QueryRemindersDto,
  ) {
    this.logger.log(
      `Getting reminders for user ${userId}, page: ${query.page}, limit: ${query.limit}`,
    );
    return this.remindersService.getUserReminders(
      userId,
      query.page,
      query.limit,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new reminder' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiResponse({
    status: 201,
    description: 'Reminder created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createReminder(
    @Param('botId') botId: string,
    @Body() createReminderDto: CreateReminderDto,
  ) {
    this.logger.log(
      `Creating reminder for user ${createReminderDto.userId} at ${createReminderDto.remindAt}`,
    );
    return this.remindersService.createReminder(
      botId,
      createReminderDto.userId,
      createReminderDto.content,
      new Date(createReminderDto.remindAt),
      createReminderDto.guildId,
      createReminderDto.channelId,
      createReminderDto.isRecurring,
      createReminderDto.interval,
      createReminderDto.repeatCount,
      createReminderDto.messageUrl,
    );
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming reminders for a user' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'userId', description: 'User ID', required: true })
  @ApiQuery({
    name: 'limit',
    description: 'Number of reminders to retrieve',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Upcoming reminders retrieved successfully',
  })
  async getUpcomingReminders(
    @Param('botId') botId: string,
    @Query('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    this.logger.log(
      `Getting upcoming reminders for user ${userId}, limit: ${limit || 5}`,
    );
    return this.remindersService.getUpcomingReminders(
      userId,
      limit ? parseInt(limit.toString()) : 5,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific reminder' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiResponse({ status: 200, description: 'Reminder retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  async getReminder(
    @Param('botId') botId: string,
    @Param('id') id: string,
  ) {
    this.logger.log(`Getting reminder ${id}`);
    return this.remindersService.getReminder(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a reminder' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiQuery({ name: 'userId', description: 'User ID', required: true })
  @ApiResponse({ status: 200, description: 'Reminder updated successfully' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateReminder(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body() updateReminderDto: UpdateReminderDto,
  ) {
    this.logger.log(`Updating reminder ${id} for user ${userId}`);
    return this.remindersService.updateReminder(id, userId, updateReminderDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a reminder' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiQuery({ name: 'userId', description: 'User ID', required: true })
  @ApiResponse({ status: 204, description: 'Reminder deleted successfully' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteReminder(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    this.logger.log(`Deleting reminder ${id} for user ${userId}`);
    await this.remindersService.deleteReminder(id, userId);
  }

  @Post(':id/snooze')
  @ApiOperation({ summary: 'Snooze a reminder' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiQuery({ name: 'userId', description: 'User ID', required: true })
  @ApiResponse({ status: 200, description: 'Reminder snoozed successfully' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async snoozeReminder(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body() snoozeDto: SnoozeReminderDto,
  ) {
    this.logger.log(
      `Snoozing reminder ${id} for ${snoozeDto.durationMinutes} minutes`,
    );
    return this.remindersService.snoozeReminder(
      id,
      userId,
      snoozeDto.durationMinutes,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a reminder' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiQuery({ name: 'userId', description: 'User ID', required: true })
  @ApiResponse({ status: 200, description: 'Reminder cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async cancelReminder(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    this.logger.log(`Cancelling reminder ${id} for user ${userId}`);
    return this.remindersService.cancelReminder(id, userId);
  }

  // ==================== SCHEDULED MESSAGES ENDPOINTS ====================

  @Get('scheduled-messages')
  @ApiOperation({ summary: 'Get scheduled messages for a guild' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'guildId', description: 'Guild ID', required: true })
  @ApiQuery({ name: 'page', description: 'Page number', required: false })
  @ApiQuery({ name: 'limit', description: 'Items per page', required: false })
  @ApiResponse({
    status: 200,
    description: 'Scheduled messages retrieved successfully',
  })
  async getScheduledMessages(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query() query: QueryRemindersDto,
  ) {
    this.logger.log(
      `Getting scheduled messages for guild ${guildId}, page: ${query.page}, limit: ${query.limit}`,
    );
    return this.remindersService.getScheduledMessages(
      guildId,
      query.page,
      query.limit,
    );
  }

  @Post('scheduled-messages')
  @ApiOperation({ summary: 'Create a scheduled message' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiResponse({
    status: 201,
    description: 'Scheduled message created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createScheduledMessage(
    @Param('botId') botId: string,
    @Body() createDto: CreateScheduledMessageDto,
  ) {
    this.logger.log(
      `Creating scheduled message for guild ${createDto.guildId}, channel ${createDto.channelId}`,
    );
    return this.remindersService.createScheduledMessage(
      createDto.guildId,
      botId,
      createDto.channelId,
      createDto.creatorId,
      createDto,
    );
  }

  @Get('scheduled-messages/:id')
  @ApiOperation({ summary: 'Get a specific scheduled message' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'id', description: 'Scheduled message ID' })
  @ApiResponse({
    status: 200,
    description: 'Scheduled message retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Scheduled message not found' })
  async getScheduledMessage(
    @Param('botId') botId: string,
    @Param('id') id: string,
  ) {
    this.logger.log(`Getting scheduled message ${id}`);
    return this.remindersService.getScheduledMessage(id);
  }

  @Put('scheduled-messages/:id')
  @ApiOperation({ summary: 'Update a scheduled message' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'id', description: 'Scheduled message ID' })
  @ApiResponse({
    status: 200,
    description: 'Scheduled message updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Scheduled message not found' })
  async updateScheduledMessage(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateScheduledMessageDto,
  ) {
    this.logger.log(`Updating scheduled message ${id}`);
    return this.remindersService.updateScheduledMessage(id, updateDto);
  }

  @Delete('scheduled-messages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a scheduled message' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'id', description: 'Scheduled message ID' })
  @ApiResponse({
    status: 204,
    description: 'Scheduled message deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Scheduled message not found' })
  async deleteScheduledMessage(
    @Param('botId') botId: string,
    @Param('id') id: string,
  ) {
    this.logger.log(`Deleting scheduled message ${id}`);
    await this.remindersService.deleteScheduledMessage(id);
  }

  @Post('scheduled-messages/:id/pause')
  @ApiOperation({ summary: 'Pause a scheduled message' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'id', description: 'Scheduled message ID' })
  @ApiResponse({
    status: 200,
    description: 'Scheduled message paused successfully',
  })
  @ApiResponse({ status: 404, description: 'Scheduled message not found' })
  async pauseScheduledMessage(
    @Param('botId') botId: string,
    @Param('id') id: string,
  ) {
    this.logger.log(`Pausing scheduled message ${id}`);
    return this.remindersService.pauseScheduledMessage(id);
  }

  @Post('scheduled-messages/:id/resume')
  @ApiOperation({ summary: 'Resume a scheduled message' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'id', description: 'Scheduled message ID' })
  @ApiResponse({
    status: 200,
    description: 'Scheduled message resumed successfully',
  })
  @ApiResponse({ status: 404, description: 'Scheduled message not found' })
  async resumeScheduledMessage(
    @Param('botId') botId: string,
    @Param('id') id: string,
  ) {
    this.logger.log(`Resuming scheduled message ${id}`);
    return this.remindersService.resumeScheduledMessage(id);
  }
}
