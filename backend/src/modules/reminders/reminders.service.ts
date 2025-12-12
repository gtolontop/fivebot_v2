import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  Reminder,
  ReminderStatus,
  ScheduledMessage,
  ScheduledMessageStatus,
} from '@prisma/client';
import {
  CreateReminderDto,
  UpdateReminderDto,
  CreateScheduledMessageDto,
  UpdateScheduledMessageDto,
} from './dto';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new reminder
   */
  async createReminder(
    botId: string,
    userId: string,
    content: string,
    remindAt: Date,
    guildId?: string,
    channelId?: string,
    isRecurring?: boolean,
    interval?: number,
    repeatCount?: number,
    messageUrl?: string,
  ): Promise<Reminder> {
    try {
      // Validate that remindAt is in the future
      if (new Date(remindAt) <= new Date()) {
        throw new BadRequestException('Reminder time must be in the future');
      }

      // If recurring, validate interval
      if (isRecurring && !interval) {
        throw new BadRequestException(
          'Interval is required for recurring reminders',
        );
      }

      const reminder = await this.prisma.reminder.create({
        data: {
          botId,
          userId,
          content,
          remindAt: new Date(remindAt),
          guildId,
          channelId,
          isRecurring: isRecurring || false,
          interval,
          repeatCount,
          messageUrl,
          status: ReminderStatus.PENDING,
          timesTriggered: 0,
        },
      });

      this.logger.log(
        `Created reminder ${reminder.id} for user ${userId} at ${remindAt}`,
      );
      return reminder;
    } catch (error) {
      this.logger.error(
        `Failed to create reminder for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get a specific reminder by ID
   */
  async getReminder(reminderId: string): Promise<Reminder> {
    const reminder = await this.prisma.reminder.findUnique({
      where: { id: reminderId },
    });

    if (!reminder) {
      throw new NotFoundException(`Reminder ${reminderId} not found`);
    }

    return reminder;
  }

  /**
   * Get user reminders with pagination
   */
  async getUserReminders(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    reminders: Reminder[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [reminders, total] = await Promise.all([
      this.prisma.reminder.findMany({
        where: { userId },
        orderBy: { remindAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.reminder.count({
        where: { userId },
      }),
    ]);

    return {
      reminders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update a reminder
   */
  async updateReminder(
    reminderId: string,
    userId: string,
    data: UpdateReminderDto,
  ): Promise<Reminder> {
    // Check if reminder exists and belongs to user
    const existing = await this.getReminder(reminderId);
    if (existing.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this reminder',
      );
    }

    // Validate remindAt if being updated
    if (data.remindAt && new Date(data.remindAt) <= new Date()) {
      throw new BadRequestException('Reminder time must be in the future');
    }

    const updateData: any = {};
    if (data.content !== undefined) updateData.content = data.content;
    if (data.remindAt !== undefined)
      updateData.remindAt = new Date(data.remindAt);
    if (data.channelId !== undefined) updateData.channelId = data.channelId;
    if (data.isRecurring !== undefined)
      updateData.isRecurring = data.isRecurring;
    if (data.interval !== undefined) updateData.interval = data.interval;
    if (data.repeatCount !== undefined)
      updateData.repeatCount = data.repeatCount;
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await this.prisma.reminder.update({
      where: { id: reminderId },
      data: updateData,
    });

    this.logger.log(`Updated reminder ${reminderId} for user ${userId}`);
    return updated;
  }

  /**
   * Delete a reminder
   */
  async deleteReminder(reminderId: string, userId: string): Promise<void> {
    // Check if reminder exists and belongs to user
    const existing = await this.getReminder(reminderId);
    if (existing.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this reminder',
      );
    }

    await this.prisma.reminder.delete({
      where: { id: reminderId },
    });

    this.logger.log(`Deleted reminder ${reminderId} for user ${userId}`);
  }

  /**
   * Snooze a reminder for X minutes
   */
  async snoozeReminder(
    reminderId: string,
    userId: string,
    durationMinutes: number,
  ): Promise<Reminder> {
    // Check if reminder exists and belongs to user
    const existing = await this.getReminder(reminderId);
    if (existing.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to snooze this reminder',
      );
    }

    if (existing.status !== ReminderStatus.PENDING) {
      throw new BadRequestException('Can only snooze pending reminders');
    }

    // Calculate new remind time
    const newRemindAt = new Date(
      existing.remindAt.getTime() + durationMinutes * 60 * 1000,
    );

    const updated = await this.prisma.reminder.update({
      where: { id: reminderId },
      data: { remindAt: newRemindAt },
    });

    this.logger.log(
      `Snoozed reminder ${reminderId} for ${durationMinutes} minutes`,
    );
    return updated;
  }

  /**
   * Get pending reminders for a bot (for cron job processing)
   */
  async getPendingReminders(botId: string): Promise<Reminder[]> {
    const now = new Date();

    const reminders = await this.prisma.reminder.findMany({
      where: {
        botId,
        status: ReminderStatus.PENDING,
        remindAt: {
          lte: now,
        },
      },
      orderBy: { remindAt: 'asc' },
    });

    return reminders;
  }

  /**
   * Process a reminder (mark as sent or handle recurring)
   */
  async processReminder(reminderId: string): Promise<Reminder> {
    const reminder = await this.getReminder(reminderId);

    if (reminder.isRecurring && reminder.interval) {
      // Increment times triggered
      const timesTriggered = reminder.timesTriggered + 1;

      // Check if we've reached the repeat count
      if (reminder.repeatCount && timesTriggered >= reminder.repeatCount) {
        // Mark as sent (completed)
        const updated = await this.prisma.reminder.update({
          where: { id: reminderId },
          data: {
            status: ReminderStatus.SENT,
            completedAt: new Date(),
            timesTriggered,
          },
        });

        this.logger.log(
          `Completed recurring reminder ${reminderId} after ${timesTriggered} triggers`,
        );
        return updated;
      } else {
        // Schedule next occurrence
        const nextRemindAt = new Date(
          reminder.remindAt.getTime() + reminder.interval * 1000,
        );

        const updated = await this.prisma.reminder.update({
          where: { id: reminderId },
          data: {
            remindAt: nextRemindAt,
            timesTriggered,
          },
        });

        this.logger.log(
          `Processed recurring reminder ${reminderId}, next at ${nextRemindAt}`,
        );
        return updated;
      }
    } else {
      // One-time reminder, mark as sent
      const updated = await this.prisma.reminder.update({
        where: { id: reminderId },
        data: {
          status: ReminderStatus.SENT,
          completedAt: new Date(),
          timesTriggered: reminder.timesTriggered + 1,
        },
      });

      this.logger.log(`Marked reminder ${reminderId} as sent`);
      return updated;
    }
  }

  /**
   * Cancel a reminder
   */
  async cancelReminder(reminderId: string, userId: string): Promise<Reminder> {
    // Check if reminder exists and belongs to user
    const existing = await this.getReminder(reminderId);
    if (existing.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to cancel this reminder',
      );
    }

    const updated = await this.prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: ReminderStatus.CANCELLED,
        completedAt: new Date(),
      },
    });

    this.logger.log(`Cancelled reminder ${reminderId} for user ${userId}`);
    return updated;
  }

  /**
   * Get upcoming reminders for a user
   */
  async getUpcomingReminders(
    userId: string,
    limit: number = 5,
  ): Promise<Reminder[]> {
    const reminders = await this.prisma.reminder.findMany({
      where: {
        userId,
        status: ReminderStatus.PENDING,
        remindAt: {
          gt: new Date(),
        },
      },
      orderBy: { remindAt: 'asc' },
      take: limit,
    });

    return reminders;
  }

  // ==================== SCHEDULED MESSAGES ====================

  /**
   * Create a scheduled message
   */
  async createScheduledMessage(
    guildId: string,
    botId: string,
    channelId: string,
    creatorId: string,
    data: CreateScheduledMessageDto,
  ): Promise<ScheduledMessage> {
    try {
      // Validate that either sendAt or cronExpression is provided
      if (!data.sendAt && !data.cronExpression) {
        throw new BadRequestException(
          'Either sendAt or cronExpression must be provided',
        );
      }

      // Validate sendAt is in the future if provided
      if (data.sendAt && new Date(data.sendAt) <= new Date()) {
        throw new BadRequestException('Send time must be in the future');
      }

      // Validate that at least content or embedJson is provided
      if (!data.content && !data.embedJson) {
        throw new BadRequestException(
          'Either content or embedJson must be provided',
        );
      }

      // Determine next run time
      let nextRunAt: Date | null = null;
      if (data.sendAt) {
        nextRunAt = new Date(data.sendAt);
      } else if (data.cronExpression) {
        // For cron expressions, you would use a library like 'cron-parser'
        // to calculate the next run time. For now, we'll set it to null
        // and let the cron processor handle it
        nextRunAt = new Date(); // Placeholder
      }

      const scheduledMessage = await this.prisma.scheduledMessage.create({
        data: {
          guildId,
          botId,
          channelId,
          creatorId,
          content: data.content,
          embedJson: data.embedJson,
          sendAt: data.sendAt ? new Date(data.sendAt) : null,
          cronExpression: data.cronExpression,
          timezone: data.timezone || 'UTC',
          isRecurring: data.isRecurring || !!data.cronExpression,
          maxRuns: data.maxRuns,
          nextRunAt,
          status: ScheduledMessageStatus.SCHEDULED,
        },
      });

      this.logger.log(
        `Created scheduled message ${scheduledMessage.id} for guild ${guildId}`,
      );
      return scheduledMessage;
    } catch (error) {
      this.logger.error(
        `Failed to create scheduled message: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get scheduled messages for a guild with pagination
   */
  async getScheduledMessages(
    guildId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    messages: ScheduledMessage[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.scheduledMessage.findMany({
        where: { guildId },
        orderBy: { nextRunAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.scheduledMessage.count({
        where: { guildId },
      }),
    ]);

    return {
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a specific scheduled message by ID
   */
  async getScheduledMessage(messageId: string): Promise<ScheduledMessage> {
    const message = await this.prisma.scheduledMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(`Scheduled message ${messageId} not found`);
    }

    return message;
  }

  /**
   * Update a scheduled message
   */
  async updateScheduledMessage(
    messageId: string,
    data: UpdateScheduledMessageDto,
  ): Promise<ScheduledMessage> {
    // Check if message exists
    await this.getScheduledMessage(messageId);

    // Validate sendAt if being updated
    if (data.sendAt && new Date(data.sendAt) <= new Date()) {
      throw new BadRequestException('Send time must be in the future');
    }

    const updateData: any = {};
    if (data.channelId !== undefined) updateData.channelId = data.channelId;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.embedJson !== undefined) updateData.embedJson = data.embedJson;
    if (data.sendAt !== undefined) {
      updateData.sendAt = new Date(data.sendAt);
      updateData.nextRunAt = new Date(data.sendAt);
    }
    if (data.cronExpression !== undefined)
      updateData.cronExpression = data.cronExpression;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.isRecurring !== undefined)
      updateData.isRecurring = data.isRecurring;
    if (data.maxRuns !== undefined) updateData.maxRuns = data.maxRuns;
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await this.prisma.scheduledMessage.update({
      where: { id: messageId },
      data: updateData,
    });

    this.logger.log(`Updated scheduled message ${messageId}`);
    return updated;
  }

  /**
   * Delete a scheduled message
   */
  async deleteScheduledMessage(messageId: string): Promise<void> {
    // Check if message exists
    await this.getScheduledMessage(messageId);

    await this.prisma.scheduledMessage.delete({
      where: { id: messageId },
    });

    this.logger.log(`Deleted scheduled message ${messageId}`);
  }

  /**
   * Process scheduled messages (for cron job)
   */
  async processScheduledMessages(): Promise<ScheduledMessage[]> {
    const now = new Date();

    // Get all scheduled messages that are due
    const dueMessages = await this.prisma.scheduledMessage.findMany({
      where: {
        status: ScheduledMessageStatus.SCHEDULED,
        nextRunAt: {
          lte: now,
        },
      },
      orderBy: { nextRunAt: 'asc' },
    });

    return dueMessages;
  }

  /**
   * Mark a scheduled message as processed
   */
  async markScheduledMessageProcessed(
    messageId: string,
    success: boolean = true,
    error?: string,
  ): Promise<ScheduledMessage> {
    const message = await this.getScheduledMessage(messageId);

    const runCount = message.runCount + 1;

    // Determine new status
    let status = message.status;
    let nextRunAt = message.nextRunAt;

    if (!success) {
      status = ScheduledMessageStatus.FAILED;
    } else if (message.isRecurring) {
      // For recurring messages with maxRuns, check if we've reached the limit
      if (message.maxRuns && runCount >= message.maxRuns) {
        status = ScheduledMessageStatus.COMPLETED;
        nextRunAt = null;
      } else {
        // Calculate next run time based on cron expression
        // This would require a cron parser library
        // For now, we'll keep the status as SCHEDULED
        status = ScheduledMessageStatus.SCHEDULED;
        // nextRunAt should be calculated by cron parser
      }
    } else {
      // One-time message
      status = ScheduledMessageStatus.COMPLETED;
      nextRunAt = null;
    }

    const updated = await this.prisma.scheduledMessage.update({
      where: { id: messageId },
      data: {
        status,
        lastRunAt: new Date(),
        runCount,
        nextRunAt,
        lastError: error || null,
      },
    });

    this.logger.log(
      `Processed scheduled message ${messageId}, runCount: ${runCount}`,
    );
    return updated;
  }

  /**
   * Pause a scheduled message
   */
  async pauseScheduledMessage(messageId: string): Promise<ScheduledMessage> {
    const updated = await this.prisma.scheduledMessage.update({
      where: { id: messageId },
      data: {
        status: ScheduledMessageStatus.PAUSED,
      },
    });

    this.logger.log(`Paused scheduled message ${messageId}`);
    return updated;
  }

  /**
   * Resume a scheduled message
   */
  async resumeScheduledMessage(messageId: string): Promise<ScheduledMessage> {
    const updated = await this.prisma.scheduledMessage.update({
      where: { id: messageId },
      data: {
        status: ScheduledMessageStatus.SCHEDULED,
      },
    });

    this.logger.log(`Resumed scheduled message ${messageId}`);
    return updated;
  }
}
