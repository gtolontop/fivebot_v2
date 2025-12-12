import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AntiNukeConfig, AntiNukeLog } from '@prisma/client';
import { UpdateAntiNukeConfigDto } from './dto/update-config.dto';

export enum AntiNukeActionType {
  CHANNEL_CREATE = 'CHANNEL_CREATE',
  CHANNEL_DELETE = 'CHANNEL_DELETE',
  CHANNEL_UPDATE = 'CHANNEL_UPDATE',
  ROLE_CREATE = 'ROLE_CREATE',
  ROLE_DELETE = 'ROLE_DELETE',
  ROLE_UPDATE = 'ROLE_UPDATE',
  MEMBER_KICK = 'MEMBER_KICK',
  MEMBER_BAN = 'MEMBER_BAN',
  BOT_ADD = 'BOT_ADD',
  WEBHOOK_CREATE = 'WEBHOOK_CREATE',
  SERVER_UPDATE = 'SERVER_UPDATE',
  EVERYONE_PING = 'EVERYONE_PING',
}

interface ActionTrackingData {
  userId: string;
  timestamp: number;
}

@Injectable()
export class AntiNukeService {
  private readonly logger = new Logger(AntiNukeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Get anti-nuke config for a guild
   */
  async getConfig(guildId: string, botId: string): Promise<AntiNukeConfig> {
    try {
      this.logger.log(`Fetching anti-nuke config for guild ${guildId}`);

      let config = await this.prisma.antiNukeConfig.findUnique({
        where: { guildId },
      });

      // Create default config if it doesn't exist
      if (!config) {
        this.logger.log(
          `No config found for guild ${guildId}, creating default config`,
        );
        config = await this.prisma.antiNukeConfig.create({
          data: {
            guildId,
            botId,
          },
        });
      }

      return config;
    } catch (error) {
      this.logger.error(
        `Failed to get anti-nuke config: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to get anti-nuke config',
      );
    }
  }

  /**
   * Update anti-nuke config for a guild
   */
  async updateConfig(
    guildId: string,
    botId: string,
    dto: UpdateAntiNukeConfigDto,
  ): Promise<AntiNukeConfig> {
    try {
      this.logger.log(`Updating anti-nuke config for guild ${guildId}`);

      // Prepare update data
      const updateData: any = { ...dto };

      // Convert arrays to JSON strings for storage
      if (dto.whitelistedUsers) {
        updateData.whitelistedUsers = JSON.stringify(dto.whitelistedUsers);
      }
      if (dto.whitelistedRoles) {
        updateData.whitelistedRoles = JSON.stringify(dto.whitelistedRoles);
      }
      if (dto.allowedBots) {
        updateData.allowedBots = JSON.stringify(dto.allowedBots);
      }

      const config = await this.prisma.antiNukeConfig.upsert({
        where: { guildId },
        update: updateData,
        create: {
          guildId,
          botId,
          ...updateData,
        },
      });

      this.logger.log(`Anti-nuke config updated for guild ${guildId}`);
      return config;
    } catch (error) {
      this.logger.error(
        `Failed to update anti-nuke config: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to update anti-nuke config',
      );
    }
  }

  /**
   * Check if a user is whitelisted
   */
  async isWhitelisted(
    guildId: string,
    userId: string,
    userRoles?: string[],
  ): Promise<boolean> {
    try {
      const config = await this.prisma.antiNukeConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        return false;
      }

      // Check if user is in whitelist
      const whitelistedUsers = config.whitelistedUsers
        ? JSON.parse(config.whitelistedUsers)
        : [];
      if (whitelistedUsers.includes(userId)) {
        return true;
      }

      // Check if any of user's roles are whitelisted
      if (userRoles && userRoles.length > 0) {
        const whitelistedRoles = config.whitelistedRoles
          ? JSON.parse(config.whitelistedRoles)
          : [];
        for (const roleId of userRoles) {
          if (whitelistedRoles.includes(roleId)) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Failed to check whitelist: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Track an action in Redis for rate limiting
   */
  async trackAction(
    guildId: string,
    userId: string,
    actionType: AntiNukeActionType,
  ): Promise<void> {
    try {
      const key = `antinuke:${guildId}:${userId}:${actionType}`;
      const now = Date.now();

      // Get existing actions
      const actionsJson = await this.redis.get(key);
      const actions: ActionTrackingData[] = actionsJson
        ? JSON.parse(actionsJson)
        : [];

      // Add new action
      actions.push({ userId, timestamp: now });

      // Store with appropriate TTL (we'll use max of 60 seconds to prevent memory leaks)
      await this.redis.set(key, JSON.stringify(actions), 60);

      this.logger.debug(
        `Tracked action ${actionType} for user ${userId} in guild ${guildId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to track action: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get recent actions within a time window
   */
  async getRecentActions(
    guildId: string,
    userId: string,
    actionType: AntiNukeActionType,
    timeWindow: number, // in seconds
  ): Promise<number> {
    try {
      const key = `antinuke:${guildId}:${userId}:${actionType}`;
      const actionsJson = await this.redis.get(key);

      if (!actionsJson) {
        return 0;
      }

      const actions: ActionTrackingData[] = JSON.parse(actionsJson);
      const now = Date.now();
      const windowMs = timeWindow * 1000;

      // Filter actions within time window
      const recentActions = actions.filter(
        (action) => now - action.timestamp <= windowMs,
      );

      return recentActions.length;
    } catch (error) {
      this.logger.error(
        `Failed to get recent actions: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Check if rate limit is exceeded
   */
  async checkRateLimit(
    guildId: string,
    userId: string,
    actionType: AntiNukeActionType,
    limit: number,
    timeWindow: number,
  ): Promise<boolean> {
    try {
      const recentActions = await this.getRecentActions(
        guildId,
        userId,
        actionType,
        timeWindow,
      );

      const exceeded = recentActions >= limit;

      if (exceeded) {
        this.logger.warn(
          `Rate limit exceeded for user ${userId} in guild ${guildId}: ${actionType} (${recentActions}/${limit})`,
        );
      }

      return exceeded;
    } catch (error) {
      this.logger.error(
        `Failed to check rate limit: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Punish a user for violating anti-nuke rules
   */
  async punishUser(
    guildId: string,
    userId: string,
    reason: string,
  ): Promise<{ success: boolean; punishment: string; message: string }> {
    try {
      const config = await this.prisma.antiNukeConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        throw new NotFoundException('Anti-nuke config not found');
      }

      this.logger.warn(
        `Punishing user ${userId} in guild ${guildId}: ${reason} (Punishment: ${config.punishment})`,
      );

      // The actual punishment implementation should be done by the Discord bot
      // This service just returns what punishment should be applied
      return {
        success: true,
        punishment: config.punishment,
        message: `User ${userId} should be punished with ${config.punishment} for: ${reason}`,
      };
    } catch (error) {
      this.logger.error(`Failed to punish user: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to punish user');
    }
  }

  /**
   * Handle channel create action
   */
  async handleChannelCreate(
    guildId: string,
    userId: string,
    channelId: string,
    userRoles?: string[],
  ): Promise<{
    shouldPunish: boolean;
    punishment?: string;
    reason?: string;
  }> {
    try {
      const config = await this.getConfig(guildId, '');

      if (!config.enabled || !config.antiChannelCreate) {
        return { shouldPunish: false };
      }

      // Check if user is whitelisted
      if (await this.isWhitelisted(guildId, userId, userRoles)) {
        return { shouldPunish: false };
      }

      // Track action
      await this.trackAction(guildId, userId, AntiNukeActionType.CHANNEL_CREATE);

      // Check rate limit
      const rateLimitExceeded = await this.checkRateLimit(
        guildId,
        userId,
        AntiNukeActionType.CHANNEL_CREATE,
        config.channelActionLimit,
        config.channelTimeWindow,
      );

      if (rateLimitExceeded) {
        const reason = `Exceeded channel creation limit (${config.channelActionLimit} in ${config.channelTimeWindow}s)`;

        await this.logAction({
          guildId,
          botId: config.botId,
          actionType: AntiNukeActionType.CHANNEL_CREATE,
          userId,
          targetId: channelId,
          targetType: 'CHANNEL',
          punishment: config.punishment,
          details: reason,
        });

        return {
          shouldPunish: true,
          punishment: config.punishment,
          reason,
        };
      }

      return { shouldPunish: false };
    } catch (error) {
      this.logger.error(
        `Failed to handle channel create: ${error.message}`,
        error.stack,
      );
      return { shouldPunish: false };
    }
  }

  /**
   * Handle channel delete action
   */
  async handleChannelDelete(
    guildId: string,
    userId: string,
    channelId: string,
    userRoles?: string[],
  ): Promise<{
    shouldPunish: boolean;
    punishment?: string;
    reason?: string;
  }> {
    try {
      const config = await this.getConfig(guildId, '');

      if (!config.enabled || !config.antiChannelDelete) {
        return { shouldPunish: false };
      }

      if (await this.isWhitelisted(guildId, userId, userRoles)) {
        return { shouldPunish: false };
      }

      await this.trackAction(guildId, userId, AntiNukeActionType.CHANNEL_DELETE);

      const rateLimitExceeded = await this.checkRateLimit(
        guildId,
        userId,
        AntiNukeActionType.CHANNEL_DELETE,
        config.channelActionLimit,
        config.channelTimeWindow,
      );

      if (rateLimitExceeded) {
        const reason = `Exceeded channel deletion limit (${config.channelActionLimit} in ${config.channelTimeWindow}s)`;

        await this.logAction({
          guildId,
          botId: config.botId,
          actionType: AntiNukeActionType.CHANNEL_DELETE,
          userId,
          targetId: channelId,
          targetType: 'CHANNEL',
          punishment: config.punishment,
          details: reason,
        });

        return {
          shouldPunish: true,
          punishment: config.punishment,
          reason,
        };
      }

      return { shouldPunish: false };
    } catch (error) {
      this.logger.error(
        `Failed to handle channel delete: ${error.message}`,
        error.stack,
      );
      return { shouldPunish: false };
    }
  }

  /**
   * Handle channel update action
   */
  async handleChannelUpdate(
    guildId: string,
    userId: string,
    channelId: string,
    userRoles?: string[],
  ): Promise<{
    shouldPunish: boolean;
    punishment?: string;
    reason?: string;
  }> {
    try {
      const config = await this.getConfig(guildId, '');

      if (!config.enabled || !config.antiChannelUpdate) {
        return { shouldPunish: false };
      }

      if (await this.isWhitelisted(guildId, userId, userRoles)) {
        return { shouldPunish: false };
      }

      await this.trackAction(guildId, userId, AntiNukeActionType.CHANNEL_UPDATE);

      const rateLimitExceeded = await this.checkRateLimit(
        guildId,
        userId,
        AntiNukeActionType.CHANNEL_UPDATE,
        config.channelActionLimit,
        config.channelTimeWindow,
      );

      if (rateLimitExceeded) {
        const reason = `Exceeded channel update limit (${config.channelActionLimit} in ${config.channelTimeWindow}s)`;

        await this.logAction({
          guildId,
          botId: config.botId,
          actionType: AntiNukeActionType.CHANNEL_UPDATE,
          userId,
          targetId: channelId,
          targetType: 'CHANNEL',
          punishment: config.punishment,
          details: reason,
        });

        return {
          shouldPunish: true,
          punishment: config.punishment,
          reason,
        };
      }

      return { shouldPunish: false };
    } catch (error) {
      this.logger.error(
        `Failed to handle channel update: ${error.message}`,
        error.stack,
      );
      return { shouldPunish: false };
    }
  }

  /**
   * Handle role create action
   */
  async handleRoleCreate(
    guildId: string,
    userId: string,
    roleId: string,
    userRoles?: string[],
  ): Promise<{
    shouldPunish: boolean;
    punishment?: string;
    reason?: string;
  }> {
    try {
      const config = await this.getConfig(guildId, '');

      if (!config.enabled || !config.antiRoleCreate) {
        return { shouldPunish: false };
      }

      if (await this.isWhitelisted(guildId, userId, userRoles)) {
        return { shouldPunish: false };
      }

      await this.trackAction(guildId, userId, AntiNukeActionType.ROLE_CREATE);

      const rateLimitExceeded = await this.checkRateLimit(
        guildId,
        userId,
        AntiNukeActionType.ROLE_CREATE,
        config.roleActionLimit,
        config.roleTimeWindow,
      );

      if (rateLimitExceeded) {
        const reason = `Exceeded role creation limit (${config.roleActionLimit} in ${config.roleTimeWindow}s)`;

        await this.logAction({
          guildId,
          botId: config.botId,
          actionType: AntiNukeActionType.ROLE_CREATE,
          userId,
          targetId: roleId,
          targetType: 'ROLE',
          punishment: config.punishment,
          details: reason,
        });

        return {
          shouldPunish: true,
          punishment: config.punishment,
          reason,
        };
      }

      return { shouldPunish: false };
    } catch (error) {
      this.logger.error(
        `Failed to handle role create: ${error.message}`,
        error.stack,
      );
      return { shouldPunish: false };
    }
  }

  /**
   * Handle role delete action
   */
  async handleRoleDelete(
    guildId: string,
    userId: string,
    roleId: string,
    userRoles?: string[],
  ): Promise<{
    shouldPunish: boolean;
    punishment?: string;
    reason?: string;
  }> {
    try {
      const config = await this.getConfig(guildId, '');

      if (!config.enabled || !config.antiRoleDelete) {
        return { shouldPunish: false };
      }

      if (await this.isWhitelisted(guildId, userId, userRoles)) {
        return { shouldPunish: false };
      }

      await this.trackAction(guildId, userId, AntiNukeActionType.ROLE_DELETE);

      const rateLimitExceeded = await this.checkRateLimit(
        guildId,
        userId,
        AntiNukeActionType.ROLE_DELETE,
        config.roleActionLimit,
        config.roleTimeWindow,
      );

      if (rateLimitExceeded) {
        const reason = `Exceeded role deletion limit (${config.roleActionLimit} in ${config.roleTimeWindow}s)`;

        await this.logAction({
          guildId,
          botId: config.botId,
          actionType: AntiNukeActionType.ROLE_DELETE,
          userId,
          targetId: roleId,
          targetType: 'ROLE',
          punishment: config.punishment,
          details: reason,
        });

        return {
          shouldPunish: true,
          punishment: config.punishment,
          reason,
        };
      }

      return { shouldPunish: false };
    } catch (error) {
      this.logger.error(
        `Failed to handle role delete: ${error.message}`,
        error.stack,
      );
      return { shouldPunish: false };
    }
  }

  /**
   * Handle role update action
   */
  async handleRoleUpdate(
    guildId: string,
    userId: string,
    roleId: string,
    userRoles?: string[],
  ): Promise<{
    shouldPunish: boolean;
    punishment?: string;
    reason?: string;
  }> {
    try {
      const config = await this.getConfig(guildId, '');

      if (!config.enabled || !config.antiRoleUpdate) {
        return { shouldPunish: false };
      }

      if (await this.isWhitelisted(guildId, userId, userRoles)) {
        return { shouldPunish: false };
      }

      await this.trackAction(guildId, userId, AntiNukeActionType.ROLE_UPDATE);

      const rateLimitExceeded = await this.checkRateLimit(
        guildId,
        userId,
        AntiNukeActionType.ROLE_UPDATE,
        config.roleActionLimit,
        config.roleTimeWindow,
      );

      if (rateLimitExceeded) {
        const reason = `Exceeded role update limit (${config.roleActionLimit} in ${config.roleTimeWindow}s)`;

        await this.logAction({
          guildId,
          botId: config.botId,
          actionType: AntiNukeActionType.ROLE_UPDATE,
          userId,
          targetId: roleId,
          targetType: 'ROLE',
          punishment: config.punishment,
          details: reason,
        });

        return {
          shouldPunish: true,
          punishment: config.punishment,
          reason,
        };
      }

      return { shouldPunish: false };
    } catch (error) {
      this.logger.error(
        `Failed to handle role update: ${error.message}`,
        error.stack,
      );
      return { shouldPunish: false };
    }
  }

  /**
   * Handle member kick action
   */
  async handleKick(
    guildId: string,
    userId: string,
    targetId: string,
    userRoles?: string[],
  ): Promise<{
    shouldPunish: boolean;
    punishment?: string;
    reason?: string;
  }> {
    try {
      const config = await this.getConfig(guildId, '');

      if (!config.enabled || !config.antiMassKick) {
        return { shouldPunish: false };
      }

      if (await this.isWhitelisted(guildId, userId, userRoles)) {
        return { shouldPunish: false };
      }

      await this.trackAction(guildId, userId, AntiNukeActionType.MEMBER_KICK);

      const rateLimitExceeded = await this.checkRateLimit(
        guildId,
        userId,
        AntiNukeActionType.MEMBER_KICK,
        config.kickBanLimit,
        config.kickBanTimeWindow,
      );

      if (rateLimitExceeded) {
        const reason = `Exceeded kick limit (${config.kickBanLimit} in ${config.kickBanTimeWindow}s)`;

        await this.logAction({
          guildId,
          botId: config.botId,
          actionType: AntiNukeActionType.MEMBER_KICK,
          userId,
          targetId,
          targetType: 'MEMBER',
          punishment: config.punishment,
          details: reason,
        });

        return {
          shouldPunish: true,
          punishment: config.punishment,
          reason,
        };
      }

      return { shouldPunish: false };
    } catch (error) {
      this.logger.error(`Failed to handle kick: ${error.message}`, error.stack);
      return { shouldPunish: false };
    }
  }

  /**
   * Handle member ban action
   */
  async handleBan(
    guildId: string,
    userId: string,
    targetId: string,
    userRoles?: string[],
  ): Promise<{
    shouldPunish: boolean;
    punishment?: string;
    reason?: string;
  }> {
    try {
      const config = await this.getConfig(guildId, '');

      if (!config.enabled || !config.antiMassBan) {
        return { shouldPunish: false };
      }

      if (await this.isWhitelisted(guildId, userId, userRoles)) {
        return { shouldPunish: false };
      }

      await this.trackAction(guildId, userId, AntiNukeActionType.MEMBER_BAN);

      const rateLimitExceeded = await this.checkRateLimit(
        guildId,
        userId,
        AntiNukeActionType.MEMBER_BAN,
        config.kickBanLimit,
        config.kickBanTimeWindow,
      );

      if (rateLimitExceeded) {
        const reason = `Exceeded ban limit (${config.kickBanLimit} in ${config.kickBanTimeWindow}s)`;

        await this.logAction({
          guildId,
          botId: config.botId,
          actionType: AntiNukeActionType.MEMBER_BAN,
          userId,
          targetId,
          targetType: 'MEMBER',
          punishment: config.punishment,
          details: reason,
        });

        return {
          shouldPunish: true,
          punishment: config.punishment,
          reason,
        };
      }

      return { shouldPunish: false };
    } catch (error) {
      this.logger.error(`Failed to handle ban: ${error.message}`, error.stack);
      return { shouldPunish: false };
    }
  }

  /**
   * Handle bot add action
   */
  async handleBotAdd(
    guildId: string,
    userId: string,
    botId: string,
    userRoles?: string[],
  ): Promise<{
    shouldPunish: boolean;
    punishment?: string;
    reason?: string;
  }> {
    try {
      const config = await this.getConfig(guildId, '');

      if (!config.enabled || !config.antiBotAdd) {
        return { shouldPunish: false };
      }

      if (await this.isWhitelisted(guildId, userId, userRoles)) {
        return { shouldPunish: false };
      }

      // Check if bot is in allowed list
      const allowedBots = config.allowedBots
        ? JSON.parse(config.allowedBots)
        : [];

      if (allowedBots.includes(botId)) {
        return { shouldPunish: false };
      }

      const reason = `Added unauthorized bot: ${botId}`;

      await this.logAction({
        guildId,
        botId: config.botId,
        actionType: AntiNukeActionType.BOT_ADD,
        userId,
        targetId: botId,
        targetType: 'BOT',
        punishment: config.punishment,
        details: reason,
      });

      return {
        shouldPunish: true,
        punishment: config.punishment,
        reason,
      };
    } catch (error) {
      this.logger.error(
        `Failed to handle bot add: ${error.message}`,
        error.stack,
      );
      return { shouldPunish: false };
    }
  }

  /**
   * Handle webhook create action
   */
  async handleWebhookCreate(
    guildId: string,
    userId: string,
    webhookId?: string,
    userRoles?: string[],
  ): Promise<{
    shouldPunish: boolean;
    punishment?: string;
    reason?: string;
  }> {
    try {
      const config = await this.getConfig(guildId, '');

      if (!config.enabled || !config.antiWebhookCreate) {
        return { shouldPunish: false };
      }

      if (await this.isWhitelisted(guildId, userId, userRoles)) {
        return { shouldPunish: false };
      }

      const reason = `Created webhook without permission`;

      await this.logAction({
        guildId,
        botId: config.botId,
        actionType: AntiNukeActionType.WEBHOOK_CREATE,
        userId,
        targetId: webhookId,
        targetType: 'WEBHOOK',
        punishment: config.punishment,
        details: reason,
      });

      return {
        shouldPunish: true,
        punishment: config.punishment,
        reason,
      };
    } catch (error) {
      this.logger.error(
        `Failed to handle webhook create: ${error.message}`,
        error.stack,
      );
      return { shouldPunish: false };
    }
  }

  /**
   * Log an anti-nuke action
   */
  async logAction(data: {
    guildId: string;
    botId: string;
    actionType: AntiNukeActionType;
    userId: string;
    targetId?: string;
    targetType?: string;
    punishment?: string;
    details?: string;
  }): Promise<AntiNukeLog> {
    try {
      this.logger.log(
        `Logging anti-nuke action: ${data.actionType} by user ${data.userId} in guild ${data.guildId}`,
      );

      const log = await this.prisma.antiNukeLog.create({
        data: {
          guildId: data.guildId,
          botId: data.botId,
          actionType: data.actionType,
          userId: data.userId,
          targetId: data.targetId,
          targetType: data.targetType,
          punishment: data.punishment,
          details: data.details,
        },
      });

      return log;
    } catch (error) {
      this.logger.error(
        `Failed to log anti-nuke action: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to log action');
    }
  }

  /**
   * Get anti-nuke logs with pagination
   */
  async getLogs(
    guildId: string,
    options: {
      page?: number;
      limit?: number;
      userId?: string;
      actionType?: string;
    } = {},
  ): Promise<{
    logs: AntiNukeLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 50;
      const skip = (page - 1) * limit;

      const where: any = { guildId };

      if (options.userId) {
        where.userId = options.userId;
      }

      if (options.actionType) {
        where.actionType = options.actionType;
      }

      const [logs, total] = await Promise.all([
        this.prisma.antiNukeLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.antiNukeLog.count({ where }),
      ]);

      return {
        logs,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Failed to get logs: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to get logs');
    }
  }

  /**
   * Delete old logs (cleanup utility)
   */
  async deleteOldLogs(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.prisma.antiNukeLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(`Deleted ${result.count} old anti-nuke logs`);
      return result.count;
    } catch (error) {
      this.logger.error(
        `Failed to delete old logs: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }
}
