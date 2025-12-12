import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ModerationConfig, AutoModType, Prisma } from '@prisma/client';
import { UpdateConfigDto } from './dto';

interface Message {
  id: string;
  content: string;
  authorId: string;
  channelId: string;
  mentions?: string[];
  timestamp: Date;
}

interface ViolationResult {
  violated: boolean;
  type?: AutoModType;
  reason?: string;
  metadata?: any;
}

interface SpamTracker {
  count: number;
  firstMessageTime: number;
  messages: string[];
}

interface RaidTracker {
  count: number;
  firstJoinTime: number;
  userIds: string[];
}

@Injectable()
export class AutoModService {
  private readonly logger = new Logger(AutoModService.name);
  private readonly spamTrackers = new Map<string, SpamTracker>();
  private readonly raidTrackers = new Map<string, RaidTracker>();
  private readonly urlRegex = /https?:\/\/[^\s]+/gi;
  private readonly inviteRegex = /discord(?:\.gg|app\.com\/invite)\/[a-zA-Z0-9-]+/gi;

  constructor(private readonly prisma: PrismaService) {
    // Clean up old trackers every 5 minutes
    setInterval(() => this.cleanupTrackers(), 5 * 60 * 1000);
  }

  /**
   * Check a message for auto-moderation violations
   */
  async checkMessage(
    guildId: string,
    botId: string,
    message: Message,
    config?: ModerationConfig,
  ): Promise<ViolationResult> {
    try {
      // Get config if not provided
      if (!config) {
        config = await this.getConfig(guildId);
      }

      // If auto-mod is disabled, skip all checks
      if (!config || !config.autoModEnabled) {
        return { violated: false };
      }

      // Check spam
      if (config.antiSpamEnabled) {
        const spamResult = await this.checkSpam(
          guildId,
          message.authorId,
          config,
        );
        if (spamResult.violated) {
          await this.logAutoModAction(guildId, botId, message, spamResult);
          return spamResult;
        }
      }

      // Check links
      if (config.antiLinkEnabled) {
        const linkResult = this.checkLinks(message, config);
        if (linkResult.violated) {
          await this.logAutoModAction(guildId, botId, message, linkResult);
          return linkResult;
        }
      }

      // Check invites
      if (config.antiInviteEnabled) {
        const inviteResult = this.checkInvites(message);
        if (inviteResult.violated) {
          await this.logAutoModAction(guildId, botId, message, inviteResult);
          return inviteResult;
        }
      }

      // Check mass mentions
      if (config.antiMassmentionEnabled) {
        const mentionResult = this.checkMassMention(message, config);
        if (mentionResult.violated) {
          await this.logAutoModAction(guildId, botId, message, mentionResult);
          return mentionResult;
        }
      }

      // Check caps
      if (config.antiCapsEnabled) {
        const capsResult = this.checkCaps(message, config);
        if (capsResult.violated) {
          await this.logAutoModAction(guildId, botId, message, capsResult);
          return capsResult;
        }
      }

      // Check word filter
      if (config.wordFilterEnabled) {
        const wordResult = this.checkWordFilter(message, config);
        if (wordResult.violated) {
          await this.logAutoModAction(guildId, botId, message, wordResult);
          return wordResult;
        }
      }

      return { violated: false };
    } catch (error) {
      this.logger.error(
        `Error checking message: ${error.message}`,
        error.stack,
      );
      // Don't throw error, just return no violation to avoid blocking messages
      return { violated: false };
    }
  }

  /**
   * Check if user is spam
   */
  async checkSpam(
    guildId: string,
    userId: string,
    config: ModerationConfig,
  ): Promise<ViolationResult> {
    const trackerId = `${guildId}:${userId}`;
    const now = Date.now();

    let tracker = this.spamTrackers.get(trackerId);

    if (!tracker) {
      tracker = {
        count: 1,
        firstMessageTime: now,
        messages: [],
      };
      this.spamTrackers.set(trackerId, tracker);
      return { violated: false };
    }

    // Check if we're still within the spam interval
    const timeDiff = now - tracker.firstMessageTime;

    if (timeDiff > config.antiSpamInterval) {
      // Reset tracker
      tracker.count = 1;
      tracker.firstMessageTime = now;
      tracker.messages = [];
      return { violated: false };
    }

    // Increment count
    tracker.count++;

    // Check if threshold is exceeded
    if (tracker.count >= config.antiSpamThreshold) {
      this.logger.warn(
        `Spam detected for user ${userId} in guild ${guildId}: ${tracker.count} messages in ${timeDiff}ms`,
      );
      return {
        violated: true,
        type: AutoModType.SPAM,
        reason: `Sending too many messages (${tracker.count} in ${timeDiff}ms)`,
        metadata: { count: tracker.count, interval: timeDiff },
      };
    }

    return { violated: false };
  }

  /**
   * Check if there's a raid (many users joining quickly)
   */
  async checkRaid(
    guildId: string,
    userId: string,
    config?: ModerationConfig,
  ): Promise<ViolationResult> {
    try {
      if (!config) {
        config = await this.getConfig(guildId);
      }

      if (!config || !config.antiRaidEnabled) {
        return { violated: false };
      }

      const now = Date.now();
      let tracker = this.raidTrackers.get(guildId);

      if (!tracker) {
        tracker = {
          count: 1,
          firstJoinTime: now,
          userIds: [userId],
        };
        this.raidTrackers.set(guildId, tracker);
        return { violated: false };
      }

      // Check if we're still within the raid interval
      const timeDiff = now - tracker.firstJoinTime;

      if (timeDiff > config.antiRaidInterval) {
        // Reset tracker
        tracker.count = 1;
        tracker.firstJoinTime = now;
        tracker.userIds = [userId];
        return { violated: false };
      }

      // Add user if not already tracked
      if (!tracker.userIds.includes(userId)) {
        tracker.count++;
        tracker.userIds.push(userId);
      }

      // Check if threshold is exceeded
      if (tracker.count >= config.antiRaidThreshold) {
        this.logger.warn(
          `Raid detected in guild ${guildId}: ${tracker.count} joins in ${timeDiff}ms`,
        );
        return {
          violated: true,
          type: AutoModType.RAID,
          reason: `Potential raid detected (${tracker.count} joins in ${timeDiff}ms)`,
          metadata: { count: tracker.count, interval: timeDiff },
        };
      }

      return { violated: false };
    } catch (error) {
      this.logger.error(`Error checking raid: ${error.message}`, error.stack);
      return { violated: false };
    }
  }

  /**
   * Check if message contains unauthorized links
   */
  private checkLinks(
    message: Message,
    config: ModerationConfig,
  ): ViolationResult {
    const urls = message.content.match(this.urlRegex);

    if (!urls || urls.length === 0) {
      return { violated: false };
    }

    // If there are allowed domains, check them
    if (config.allowedDomains) {
      const allowedDomains = config.allowedDomains
        .split(',')
        .map((d) => d.trim().toLowerCase());

      for (const url of urls) {
        const isAllowed = allowedDomains.some((domain) =>
          url.toLowerCase().includes(domain),
        );

        if (!isAllowed) {
          return {
            violated: true,
            type: AutoModType.LINK,
            reason: 'Unauthorized link detected',
            metadata: { url },
          };
        }
      }
    } else {
      // No allowed domains means all links are blocked
      return {
        violated: true,
        type: AutoModType.LINK,
        reason: 'Links are not allowed',
        metadata: { urls },
      };
    }

    return { violated: false };
  }

  /**
   * Check if message contains Discord invites
   */
  private checkInvites(message: Message): ViolationResult {
    const invites = message.content.match(this.inviteRegex);

    if (invites && invites.length > 0) {
      return {
        violated: true,
        type: AutoModType.INVITE,
        reason: 'Discord invite link detected',
        metadata: { invites },
      };
    }

    return { violated: false };
  }

  /**
   * Check if message has too many mentions
   */
  private checkMassMention(
    message: Message,
    config: ModerationConfig,
  ): ViolationResult {
    const mentionCount = message.mentions?.length || 0;

    if (mentionCount >= config.massMentionThreshold) {
      return {
        violated: true,
        type: AutoModType.MASSMENTION,
        reason: `Too many mentions (${mentionCount})`,
        metadata: { count: mentionCount },
      };
    }

    return { violated: false };
  }

  /**
   * Check if message has too many caps
   */
  private checkCaps(
    message: Message,
    config: ModerationConfig,
  ): ViolationResult {
    const content = message.content;

    // Ignore short messages
    if (content.length < 10) {
      return { violated: false };
    }

    const letters = content.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) {
      return { violated: false };
    }

    const caps = content.replace(/[^A-Z]/g, '');
    const capsPercentage = (caps.length / letters.length) * 100;

    if (capsPercentage >= config.capsThreshold) {
      return {
        violated: true,
        type: AutoModType.CAPS,
        reason: `Excessive caps usage (${Math.round(capsPercentage)}%)`,
        metadata: { percentage: capsPercentage },
      };
    }

    return { violated: false };
  }

  /**
   * Check if message contains filtered words or matches regex
   */
  private checkWordFilter(
    message: Message,
    config: ModerationConfig,
  ): ViolationResult {
    const content = message.content.toLowerCase();

    // Check filtered words
    if (config.filteredWords) {
      const words = config.filteredWords
        .split(',')
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w.length > 0);

      for (const word of words) {
        if (content.includes(word)) {
          return {
            violated: true,
            type: AutoModType.WORD_FILTER,
            reason: 'Message contains filtered word',
            metadata: { word },
          };
        }
      }
    }

    // Check regex filter
    if (config.filteredRegex) {
      try {
        const regex = new RegExp(config.filteredRegex, 'i');
        if (regex.test(message.content)) {
          return {
            violated: true,
            type: AutoModType.REGEX_FILTER,
            reason: 'Message matches filtered pattern',
          };
        }
      } catch (error) {
        this.logger.error(
          `Invalid regex pattern: ${config.filteredRegex}`,
          error.stack,
        );
      }
    }

    return { violated: false };
  }

  /**
   * Handle a violation by taking appropriate action
   */
  async handleViolation(
    guildId: string,
    botId: string,
    userId: string,
    violation: ViolationResult,
  ): Promise<{ action: string; severity: string }> {
    try {
      this.logger.log(
        `Handling ${violation.type} violation for user ${userId} in guild ${guildId}`,
      );

      // For now, return the recommended action
      // The actual enforcement (mute, kick, ban) should be done by the bot itself
      const severity = this.getViolationSeverity(violation.type);
      const action = this.getRecommendedAction(violation.type);

      return { action, severity };
    } catch (error) {
      this.logger.error(
        `Error handling violation: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to handle violation');
    }
  }

  /**
   * Get moderation config for a guild
   */
  async getConfig(guildId: string): Promise<ModerationConfig | null> {
    try {
      const config = await this.prisma.moderationConfig.findUnique({
        where: { guildId },
      });

      return config;
    } catch (error) {
      this.logger.error(
        `Error fetching config for guild ${guildId}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Update moderation config for a guild
   */
  async updateConfig(
    guildId: string,
    botId: string,
    dto: UpdateConfigDto,
  ): Promise<ModerationConfig> {
    try {
      this.logger.log(`Updating moderation config for guild ${guildId}`);

      // Prepare update data
      const updateData: Prisma.ModerationConfigUpdateInput = {
        ...dto,
      };

      // Handle array fields
      if (dto.immuneRoles) {
        updateData.immuneRoles = dto.immuneRoles.join(',');
      }

      if (dto.exemptChannels) {
        updateData.exemptChannels = dto.exemptChannels.join(',');
      }

      const config = await this.prisma.moderationConfig.upsert({
        where: { guildId },
        update: updateData,
        create: {
          guildId,
          botId,
          ...dto,
          immuneRoles: dto.immuneRoles?.join(','),
          exemptChannels: dto.exemptChannels?.join(','),
        },
      });

      this.logger.log(
        `Moderation config updated successfully for guild ${guildId}`,
      );

      return config;
    } catch (error) {
      this.logger.error(
        `Failed to update config: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to update config');
    }
  }

  /**
   * Get config with parsed array fields
   */
  async getConfigWithArrays(guildId: string): Promise<any> {
    const config = await this.getConfig(guildId);

    if (!config) {
      return null;
    }

    return {
      ...config,
      immuneRoles: config.immuneRoles
        ? config.immuneRoles.split(',').filter((r) => r.length > 0)
        : [],
      exemptChannels: config.exemptChannels
        ? config.exemptChannels.split(',').filter((c) => c.length > 0)
        : [],
      allowedDomains: config.allowedDomains
        ? config.allowedDomains.split(',').filter((d) => d.length > 0)
        : [],
      filteredWords: config.filteredWords
        ? config.filteredWords.split(',').filter((w) => w.length > 0)
        : [],
    };
  }

  /**
   * Log an auto-mod action to the database
   */
  private async logAutoModAction(
    guildId: string,
    botId: string,
    message: Message,
    violation: ViolationResult,
  ): Promise<void> {
    try {
      await this.prisma.autoModAction.create({
        data: {
          guildId,
          botId,
          userId: message.authorId,
          type: violation.type,
          content: message.content,
          channelId: message.channelId,
          messageId: message.id,
          action: 'delete', // Default action
          reason: violation.reason,
          metadata: violation.metadata
            ? JSON.stringify(violation.metadata)
            : null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log auto-mod action: ${error.message}`,
        error.stack,
      );
      // Don't throw, logging failure shouldn't prevent moderation
    }
  }

  /**
   * Get violation severity
   */
  private getViolationSeverity(type: AutoModType): string {
    const severityMap = {
      [AutoModType.SPAM]: 'medium',
      [AutoModType.RAID]: 'high',
      [AutoModType.LINK]: 'low',
      [AutoModType.INVITE]: 'medium',
      [AutoModType.MASSMENTION]: 'medium',
      [AutoModType.CAPS]: 'low',
      [AutoModType.WORD_FILTER]: 'high',
      [AutoModType.REGEX_FILTER]: 'high',
      [AutoModType.DUPLICATE]: 'low',
      [AutoModType.EMOJI_SPAM]: 'low',
      [AutoModType.NEWLINE_SPAM]: 'low',
    };

    return severityMap[type] || 'low';
  }

  /**
   * Get recommended action for violation type
   */
  private getRecommendedAction(type: AutoModType): string {
    const actionMap = {
      [AutoModType.SPAM]: 'warn',
      [AutoModType.RAID]: 'kick',
      [AutoModType.LINK]: 'delete',
      [AutoModType.INVITE]: 'delete',
      [AutoModType.MASSMENTION]: 'warn',
      [AutoModType.CAPS]: 'delete',
      [AutoModType.WORD_FILTER]: 'warn',
      [AutoModType.REGEX_FILTER]: 'warn',
      [AutoModType.DUPLICATE]: 'delete',
      [AutoModType.EMOJI_SPAM]: 'delete',
      [AutoModType.NEWLINE_SPAM]: 'delete',
    };

    return actionMap[type] || 'delete';
  }

  /**
   * Clean up old trackers
   */
  private cleanupTrackers(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    // Clean spam trackers
    for (const [key, tracker] of this.spamTrackers.entries()) {
      if (now - tracker.firstMessageTime > maxAge) {
        this.spamTrackers.delete(key);
      }
    }

    // Clean raid trackers
    for (const [key, tracker] of this.raidTrackers.entries()) {
      if (now - tracker.firstJoinTime > maxAge) {
        this.raidTrackers.delete(key);
      }
    }

    this.logger.debug(
      `Cleaned up trackers. Spam trackers: ${this.spamTrackers.size}, Raid trackers: ${this.raidTrackers.size}`,
    );
  }

  /**
   * Get auto-mod statistics for a guild
   */
  async getStatistics(
    guildId: string,
    days: number = 7,
  ): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    topOffenders: Array<{ userId: string; count: number }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const actions = await this.prisma.autoModAction.findMany({
        where: {
          guildId,
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          type: true,
          userId: true,
        },
      });

      // Count actions by type
      const actionsByType: Record<string, number> = {};
      const userCounts: Record<string, number> = {};

      for (const action of actions) {
        actionsByType[action.type] = (actionsByType[action.type] || 0) + 1;
        userCounts[action.userId] = (userCounts[action.userId] || 0) + 1;
      }

      // Get top offenders
      const topOffenders = Object.entries(userCounts)
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalActions: actions.length,
        actionsByType,
        topOffenders,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get statistics: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to get statistics');
    }
  }
}
