import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BirthdayService } from './birthday.service';

/**
 * Birthday Scheduler Service
 *
 * This service handles scheduled tasks for birthday announcements.
 * It runs every 5 minutes to check if it's time to announce birthdays
 * in any timezone. The actual timezone checking is done in the
 * BirthdayService to handle multiple timezones efficiently.
 *
 * The scheduler ensures birthdays are announced at the configured
 * time for each guild's timezone.
 */
@Injectable()
export class BirthdaySchedulerService {
  private readonly logger = new Logger(BirthdaySchedulerService.name);

  constructor(private readonly birthdayService: BirthdayService) {}

  /**
   * Check for birthdays to announce every 5 minutes
   *
   * This runs frequently to ensure we catch the announcement time
   * for guilds in different timezones. The BirthdayService will
   * handle the logic to determine if it's actually time to announce
   * based on each guild's timezone and configured announcement time.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkBirthdays() {
    this.logger.debug('Running birthday check task');

    try {
      await this.birthdayService.checkAndAnnounceBirthdays();
    } catch (error) {
      this.logger.error(
        `Error in birthday check task: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Cleanup old birthday role assignments every hour
   *
   * This cron job checks for users who should have their birthday
   * role removed based on the removeRoleAfterHours configuration.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupBirthdayRoles() {
    this.logger.debug('Running birthday role cleanup task');

    try {
      await this.performRoleCleanup();
    } catch (error) {
      this.logger.error(
        `Error in birthday role cleanup task: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Perform birthday role cleanup
   *
   * This checks all birthdays that were announced and removes
   * the birthday role if the configured time has passed.
   */
  private async performRoleCleanup(): Promise<void> {
    this.logger.debug('Birthday role cleanup not yet implemented');

    // TODO: Implement role cleanup logic
    // This would:
    // 1. Get all birthdays with lastAnnounced set
    // 2. Check if removeRoleAfterHours has passed
    // 3. Call removeBirthdayRole for eligible users
    // 4. Track which users have had roles applied/removed

    // Example implementation:
    // const configs = await this.prisma.birthdayConfig.findMany({
    //   where: {
    //     enabled: true,
    //     roleId: { not: null },
    //   },
    //   include: {
    //     birthdays: {
    //       where: {
    //         lastAnnounced: { not: null },
    //       },
    //     },
    //   },
    // });
    //
    // for (const config of configs) {
    //   const cutoffTime = new Date();
    //   cutoffTime.setHours(cutoffTime.getHours() - config.removeRoleAfterHours);
    //
    //   for (const birthday of config.birthdays) {
    //     if (birthday.lastAnnounced && birthday.lastAnnounced < cutoffTime) {
    //       await this.birthdayService.removeBirthdayRole(
    //         config.guildId,
    //         birthday.userId,
    //         config.roleId!,
    //       );
    //     }
    //   }
    // }
  }

  /**
   * Log birthday statistics every day at midnight UTC
   */
  @Cron('0 0 * * *')
  async logBirthdayStats() {
    this.logger.debug('Logging birthday statistics');

    try {
      // TODO: Implement statistics logging
      // This could log:
      // - Total number of birthdays in the system
      // - Number of birthdays announced today
      // - Number of active guilds with birthdays enabled
      // - etc.

      this.logger.debug('Birthday statistics logged');
    } catch (error) {
      this.logger.error(
        `Error logging birthday statistics: ${error.message}`,
        error.stack,
      );
    }
  }
}
