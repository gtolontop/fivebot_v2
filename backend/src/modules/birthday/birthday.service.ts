import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BirthdayConfig, Birthday } from '@prisma/client';
import { UpdateConfigDto, SetBirthdayDto } from './dto';

@Injectable()
export class BirthdayService {
  private readonly logger = new Logger(BirthdayService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get birthday configuration for a guild
   */
  async getConfig(guildId: string): Promise<BirthdayConfig | null> {
    const config = await this.prisma.birthdayConfig.findUnique({
      where: { guildId },
    });

    return config;
  }

  /**
   * Get or create birthday configuration for a guild
   */
  async getOrCreateConfig(
    guildId: string,
    botId: string,
  ): Promise<BirthdayConfig> {
    let config = await this.getConfig(guildId);

    if (!config) {
      config = await this.prisma.birthdayConfig.create({
        data: {
          guildId,
          botId,
          enabled: true,
          announceTime: '00:00',
          timezone: 'UTC',
          showAge: false,
          allowUserSet: true,
          removeRoleAfterHours: 24,
        },
      });
      this.logger.log(`Created birthday config for guild ${guildId}`);
    }

    return config;
  }

  /**
   * Update birthday configuration
   */
  async updateConfig(
    guildId: string,
    botId: string,
    data: UpdateConfigDto,
  ): Promise<BirthdayConfig> {
    // Validate announceTime format if provided
    if (data.announceTime && !/^\d{2}:\d{2}$/.test(data.announceTime)) {
      throw new BadRequestException(
        'announceTime must be in HH:MM format (e.g., 00:00, 14:30)',
      );
    }

    // Get or create config first
    const existingConfig = await this.getOrCreateConfig(guildId, botId);

    // Build update data
    const updateData: any = {};
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.channelId !== undefined) updateData.channelId = data.channelId;
    if (data.roleId !== undefined) updateData.roleId = data.roleId;
    if (data.removeRoleAfterHours !== undefined)
      updateData.removeRoleAfterHours = data.removeRoleAfterHours;
    if (data.message !== undefined) updateData.message = data.message;
    if (data.embedJson !== undefined) updateData.embedJson = data.embedJson;
    if (data.announceTime !== undefined)
      updateData.announceTime = data.announceTime;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.showAge !== undefined) updateData.showAge = data.showAge;
    if (data.allowUserSet !== undefined)
      updateData.allowUserSet = data.allowUserSet;

    const updated = await this.prisma.birthdayConfig.update({
      where: { id: existingConfig.id },
      data: updateData,
    });

    this.logger.log(`Updated birthday config for guild ${guildId}`);
    return updated;
  }

  /**
   * Set a user's birthday
   */
  async setBirthday(
    guildId: string,
    userId: string,
    data: { day: number; month: number; year?: number },
  ): Promise<Birthday> {
    // Validate date
    this.validateBirthdate(data.day, data.month, data.year);

    // Get config to ensure it exists
    const config = await this.prisma.birthdayConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      throw new NotFoundException(
        `Birthday config not found for guild ${guildId}. Please configure the birthday system first.`,
      );
    }

    // Check if birthday already exists
    const existing = await this.prisma.birthday.findFirst({
      where: {
        guildId,
        userId,
      },
    });

    let birthday: Birthday;

    if (existing) {
      // Update existing birthday
      birthday = await this.prisma.birthday.update({
        where: { id: existing.id },
        data: {
          day: data.day,
          month: data.month,
          year: data.year || null,
        },
      });
      this.logger.log(`Updated birthday for user ${userId} in guild ${guildId}`);
    } else {
      // Create new birthday
      birthday = await this.prisma.birthday.create({
        data: {
          configId: config.id,
          guildId,
          userId,
          day: data.day,
          month: data.month,
          year: data.year || null,
        },
      });
      this.logger.log(`Created birthday for user ${userId} in guild ${guildId}`);
    }

    return birthday;
  }

  /**
   * Remove a user's birthday
   */
  async removeBirthday(guildId: string, userId: string): Promise<void> {
    const birthday = await this.prisma.birthday.findFirst({
      where: {
        guildId,
        userId,
      },
    });

    if (!birthday) {
      throw new NotFoundException(
        `Birthday not found for user ${userId} in guild ${guildId}`,
      );
    }

    await this.prisma.birthday.delete({
      where: { id: birthday.id },
    });

    this.logger.log(`Removed birthday for user ${userId} in guild ${guildId}`);
  }

  /**
   * Get a specific user's birthday
   */
  async getBirthday(guildId: string, userId: string): Promise<Birthday | null> {
    const birthday = await this.prisma.birthday.findFirst({
      where: {
        guildId,
        userId,
      },
    });

    return birthday;
  }

  /**
   * Get upcoming birthdays within the next X days
   */
  async getUpcomingBirthdays(
    guildId: string,
    days: number = 30,
  ): Promise<Birthday[]> {
    // Get all birthdays for the guild
    const allBirthdays = await this.prisma.birthday.findMany({
      where: { guildId },
    });

    // Filter birthdays that occur within the next X days
    const today = new Date();
    const currentDayOfYear = this.getDayOfYear(
      today.getDate(),
      today.getMonth() + 1,
    );

    const upcomingBirthdays = allBirthdays.filter((birthday) => {
      const birthdayDayOfYear = this.getDayOfYear(birthday.day, birthday.month);
      let daysUntil = birthdayDayOfYear - currentDayOfYear;

      // Handle year wrap-around
      if (daysUntil < 0) {
        daysUntil += 365; // Simplified, doesn't account for leap years
      }

      return daysUntil >= 0 && daysUntil <= days;
    });

    // Sort by proximity
    upcomingBirthdays.sort((a, b) => {
      const aDayOfYear = this.getDayOfYear(a.day, a.month);
      const bDayOfYear = this.getDayOfYear(b.day, b.month);

      let aDaysUntil = aDayOfYear - currentDayOfYear;
      let bDaysUntil = bDayOfYear - currentDayOfYear;

      if (aDaysUntil < 0) aDaysUntil += 365;
      if (bDaysUntil < 0) bDaysUntil += 365;

      return aDaysUntil - bDaysUntil;
    });

    return upcomingBirthdays;
  }

  /**
   * Get today's birthdays for a guild (timezone-aware)
   */
  async getTodaysBirthdays(
    guildId: string,
    timezone: string = 'UTC',
  ): Promise<Birthday[]> {
    const now = this.getDateInTimezone(timezone);
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;

    const birthdays = await this.prisma.birthday.findMany({
      where: {
        guildId,
        day: currentDay,
        month: currentMonth,
      },
    });

    return birthdays;
  }

  /**
   * Check and announce birthdays for all guilds (called by scheduler)
   */
  async checkAndAnnounceBirthdays(): Promise<void> {
    this.logger.debug('Checking for birthdays to announce...');

    try {
      // Get all enabled birthday configs
      const configs = await this.prisma.birthdayConfig.findMany({
        where: { enabled: true },
      });

      for (const config of configs) {
        try {
          await this.processBirthdaysForGuild(config);
        } catch (error) {
          this.logger.error(
            `Error processing birthdays for guild ${config.guildId}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.debug('Birthday check completed');
    } catch (error) {
      this.logger.error(
        `Error in checkAndAnnounceBirthdays: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Process birthdays for a specific guild
   */
  private async processBirthdaysForGuild(
    config: BirthdayConfig,
  ): Promise<void> {
    // Get current time in guild's timezone
    const now = this.getDateInTimezone(config.timezone);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Parse announce time
    const [announceHour, announceMinute] = config.announceTime
      .split(':')
      .map((n) => parseInt(n, 10));

    // Check if it's time to announce (within 5-minute window)
    if (
      currentHour !== announceHour ||
      Math.abs(currentMinute - announceMinute) > 5
    ) {
      return; // Not time to announce yet
    }

    // Get today's birthdays
    const birthdays = await this.getTodaysBirthdays(
      config.guildId,
      config.timezone,
    );

    // Filter out birthdays already announced today
    const birthdaysToAnnounce = birthdays.filter((birthday) => {
      if (!birthday.lastAnnounced) return true;

      const lastAnnouncedDate = new Date(birthday.lastAnnounced);
      const today = this.getDateInTimezone(config.timezone);

      return (
        lastAnnouncedDate.getDate() !== today.getDate() ||
        lastAnnouncedDate.getMonth() !== today.getMonth() ||
        lastAnnouncedDate.getFullYear() !== today.getFullYear()
      );
    });

    // Announce each birthday
    for (const birthday of birthdaysToAnnounce) {
      try {
        await this.announceBirthday(config.guildId, birthday.userId, config);

        // Update last announced
        await this.prisma.birthday.update({
          where: { id: birthday.id },
          data: { lastAnnounced: new Date() },
        });
      } catch (error) {
        this.logger.error(
          `Error announcing birthday for user ${birthday.userId}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * Announce a birthday (to be implemented by Discord bot)
   * This method serves as a hook that the bot can override or listen to
   */
  async announceBirthday(
    guildId: string,
    userId: string,
    config: BirthdayConfig,
  ): Promise<void> {
    const birthday = await this.getBirthday(guildId, userId);
    if (!birthday) {
      throw new NotFoundException(
        `Birthday not found for user ${userId} in guild ${guildId}`,
      );
    }

    // Calculate age if year is available and showAge is enabled
    let age: number | null = null;
    if (config.showAge && birthday.year) {
      age = this.getAge(birthday);
    }

    this.logger.log(
      `Announcing birthday for user ${userId} in guild ${guildId}${age ? ` (age ${age})` : ''}`,
    );

    // Apply birthday role if configured
    if (config.roleId) {
      try {
        await this.applyBirthdayRole(guildId, userId, config.roleId);
      } catch (error) {
        this.logger.error(
          `Failed to apply birthday role: ${error.message}`,
          error.stack,
        );
      }
    }

    // Note: Actual Discord announcement would be handled by the bot
    // This could emit an event that the Discord bot listens to
  }

  /**
   * Apply birthday role to a user (to be implemented by Discord bot)
   */
  async applyBirthdayRole(
    guildId: string,
    userId: string,
    roleId: string,
  ): Promise<void> {
    this.logger.log(
      `Applying birthday role ${roleId} to user ${userId} in guild ${guildId}`,
    );

    // Note: Actual Discord role application would be handled by the bot
    // This method serves as a hook for the bot to implement
    // You would typically emit an event or call a Discord service here
  }

  /**
   * Remove birthday role from a user (to be implemented by Discord bot)
   */
  async removeBirthdayRole(
    guildId: string,
    userId: string,
    roleId: string,
  ): Promise<void> {
    this.logger.log(
      `Removing birthday role ${roleId} from user ${userId} in guild ${guildId}`,
    );

    // Note: Actual Discord role removal would be handled by the bot
    // This method serves as a hook for the bot to implement
  }

  /**
   * Calculate age from birth date
   */
  getAge(birthday: Birthday): number | null {
    if (!birthday.year) return null;

    const today = new Date();
    let age = today.getFullYear() - birthday.year;

    // Check if birthday hasn't occurred yet this year
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    if (
      currentMonth < birthday.month ||
      (currentMonth === birthday.month && currentDay < birthday.day)
    ) {
      age--;
    }

    return age;
  }

  /**
   * Get all birthdays for a guild with pagination
   */
  async getAllBirthdays(
    guildId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    birthdays: Birthday[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [birthdays, total] = await Promise.all([
      this.prisma.birthday.findMany({
        where: { guildId },
        orderBy: [{ month: 'asc' }, { day: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.birthday.count({
        where: { guildId },
      }),
    ]);

    return {
      birthdays,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Validate a birth date
   */
  private validateBirthdate(day: number, month: number, year?: number): void {
    // Check month range
    if (month < 1 || month > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }

    // Check day range based on month
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const maxDays = daysInMonth[month - 1];

    if (day < 1 || day > maxDays) {
      throw new BadRequestException(
        `Day must be between 1 and ${maxDays} for month ${month}`,
      );
    }

    // Special validation for February 29th if year is provided
    if (month === 2 && day === 29 && year) {
      if (!this.isLeapYear(year)) {
        throw new BadRequestException(
          `February 29th is not valid for year ${year} (not a leap year)`,
        );
      }
    }

    // Validate year if provided
    if (year) {
      const currentYear = new Date().getFullYear();
      if (year < 1900 || year > currentYear) {
        throw new BadRequestException(
          `Year must be between 1900 and ${currentYear}`,
        );
      }
    }
  }

  /**
   * Check if a year is a leap year
   */
  private isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /**
   * Get day of year (1-365)
   */
  private getDayOfYear(day: number, month: number): number {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let dayOfYear = day;

    for (let i = 0; i < month - 1; i++) {
      dayOfYear += daysInMonth[i];
    }

    return dayOfYear;
  }

  /**
   * Get current date in a specific timezone
   */
  private getDateInTimezone(timezone: string): Date {
    // Get current UTC time
    const now = new Date();

    // Convert to specified timezone using Intl API
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const getValue = (type: string) =>
      parts.find((part) => part.type === type)?.value;

    const year = parseInt(getValue('year') || '0', 10);
    const month = parseInt(getValue('month') || '0', 10) - 1; // 0-indexed
    const day = parseInt(getValue('day') || '0', 10);
    const hour = parseInt(getValue('hour') || '0', 10);
    const minute = parseInt(getValue('minute') || '0', 10);
    const second = parseInt(getValue('second') || '0', 10);

    return new Date(year, month, day, hour, minute, second);
  }
}
