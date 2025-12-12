import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export enum LogEventType {
  MESSAGE_DELETE = 'MESSAGE_DELETE',
  MESSAGE_EDIT = 'MESSAGE_EDIT',
  MESSAGE_BULK_DELETE = 'MESSAGE_BULK_DELETE',
  MEMBER_JOIN = 'MEMBER_JOIN',
  MEMBER_LEAVE = 'MEMBER_LEAVE',
  MEMBER_UPDATE = 'MEMBER_UPDATE',
  MEMBER_BAN = 'MEMBER_BAN',
  CHANNEL_CREATE = 'CHANNEL_CREATE',
  CHANNEL_DELETE = 'CHANNEL_DELETE',
  CHANNEL_UPDATE = 'CHANNEL_UPDATE',
  ROLE_CREATE = 'ROLE_CREATE',
  ROLE_DELETE = 'ROLE_DELETE',
  ROLE_UPDATE = 'ROLE_UPDATE',
  VOICE_JOIN = 'VOICE_JOIN',
  VOICE_LEAVE = 'VOICE_LEAVE',
  VOICE_MOVE = 'VOICE_MOVE',
  INVITE_CREATE = 'INVITE_CREATE',
  INVITE_DELETE = 'INVITE_DELETE',
  EMOJI_CREATE = 'EMOJI_CREATE',
  EMOJI_DELETE = 'EMOJI_DELETE',
}

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== CONFIG ====================

  async getConfig(guildId: string) {
    const config = await this.prisma.loggingConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      throw new NotFoundException(`Logging config not found for guild ${guildId}`);
    }

    // Parse JSON strings for ignored lists
    return {
      ...config,
      ignoredChannels: config.ignoredChannels ? JSON.parse(config.ignoredChannels) : [],
      ignoredRoles: config.ignoredRoles ? JSON.parse(config.ignoredRoles) : [],
      ignoredUsers: config.ignoredUsers ? JSON.parse(config.ignoredUsers) : [],
    };
  }

  async getOrCreateConfig(guildId: string, botId: string) {
    let config = await this.prisma.loggingConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      config = await this.prisma.loggingConfig.create({
        data: {
          guildId,
          botId,
        },
      });
    }

    // Parse JSON strings for ignored lists
    return {
      ...config,
      ignoredChannels: config.ignoredChannels ? JSON.parse(config.ignoredChannels) : [],
      ignoredRoles: config.ignoredRoles ? JSON.parse(config.ignoredRoles) : [],
      ignoredUsers: config.ignoredUsers ? JSON.parse(config.ignoredUsers) : [],
    };
  }

  async updateConfig(guildId: string, botId: string, data: any) {
    // First ensure config exists
    await this.getOrCreateConfig(guildId, botId);

    return this.prisma.loggingConfig.update({
      where: { guildId },
      data,
    });
  }

  // ==================== EVENT CHANNELS ====================

  private getEventChannelField(eventType: LogEventType): string {
    const fieldMap: Record<LogEventType, string> = {
      [LogEventType.MESSAGE_DELETE]: 'messageDeleteChannelId',
      [LogEventType.MESSAGE_EDIT]: 'messageEditChannelId',
      [LogEventType.MESSAGE_BULK_DELETE]: 'messageBulkDeleteChannelId',
      [LogEventType.MEMBER_JOIN]: 'memberJoinChannelId',
      [LogEventType.MEMBER_LEAVE]: 'memberLeaveChannelId',
      [LogEventType.MEMBER_UPDATE]: 'memberUpdateChannelId',
      [LogEventType.MEMBER_BAN]: 'memberBanChannelId',
      [LogEventType.CHANNEL_CREATE]: 'channelCreateChannelId',
      [LogEventType.CHANNEL_DELETE]: 'channelDeleteChannelId',
      [LogEventType.CHANNEL_UPDATE]: 'channelUpdateChannelId',
      [LogEventType.ROLE_CREATE]: 'roleCreateChannelId',
      [LogEventType.ROLE_DELETE]: 'roleDeleteChannelId',
      [LogEventType.ROLE_UPDATE]: 'roleUpdateChannelId',
      [LogEventType.VOICE_JOIN]: 'voiceJoinChannelId',
      [LogEventType.VOICE_LEAVE]: 'voiceLeaveChannelId',
      [LogEventType.VOICE_MOVE]: 'voiceMoveChannelId',
      [LogEventType.INVITE_CREATE]: 'inviteCreateChannelId',
      [LogEventType.INVITE_DELETE]: 'inviteDeleteChannelId',
      [LogEventType.EMOJI_CREATE]: 'emojiCreateChannelId',
      [LogEventType.EMOJI_DELETE]: 'emojiDeleteChannelId',
    };

    return fieldMap[eventType];
  }

  async setEventChannel(guildId: string, eventType: LogEventType, channelId: string) {
    const field = this.getEventChannelField(eventType);

    if (!field) {
      throw new BadRequestException(`Invalid event type: ${eventType}`);
    }

    return this.prisma.loggingConfig.update({
      where: { guildId },
      data: { [field]: channelId },
    });
  }

  async getEventChannel(guildId: string, eventType: LogEventType): Promise<string | null> {
    const config = await this.prisma.loggingConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      return null;
    }

    const field = this.getEventChannelField(eventType);
    const channelId = config[field] as string | null;

    // Fall back to default channel if specific channel not set
    return channelId || config.defaultChannelId || null;
  }

  // ==================== LOG EVENT ====================

  async logEvent(guildId: string, eventType: LogEventType, data: any) {
    try {
      const config = await this.prisma.loggingConfig.findUnique({
        where: { guildId },
      });

      if (!config || !config.enabled) {
        this.logger.debug(`Logging disabled for guild ${guildId}`);
        return { logged: false, reason: 'disabled' };
      }

      const channelId = await this.getEventChannel(guildId, eventType);

      if (!channelId) {
        this.logger.debug(`No channel configured for event ${eventType} in guild ${guildId}`);
        return { logged: false, reason: 'no_channel' };
      }

      // Here you would integrate with Discord.js to send the log message
      // For now, we'll just log it
      this.logger.log(`[${guildId}] ${eventType} -> ${channelId}`);
      this.logger.debug(`Event data: ${JSON.stringify(data)}`);

      return {
        logged: true,
        channelId,
        eventType,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to log event ${eventType} for guild ${guildId}:`, error);
      return { logged: false, reason: 'error', error: error.message };
    }
  }

  // ==================== IGNORED CHANNELS ====================

  async getIgnoredChannels(guildId: string): Promise<string[]> {
    const config = await this.prisma.loggingConfig.findUnique({
      where: { guildId },
    });

    if (!config || !config.ignoredChannels) {
      return [];
    }

    try {
      return JSON.parse(config.ignoredChannels);
    } catch (error) {
      this.logger.error(`Failed to parse ignoredChannels for guild ${guildId}:`, error);
      return [];
    }
  }

  async addIgnoredChannel(guildId: string, channelId: string) {
    const ignoredChannels = await this.getIgnoredChannels(guildId);

    if (ignoredChannels.includes(channelId)) {
      throw new BadRequestException(`Channel ${channelId} is already ignored`);
    }

    ignoredChannels.push(channelId);

    return this.prisma.loggingConfig.update({
      where: { guildId },
      data: {
        ignoredChannels: JSON.stringify(ignoredChannels),
      },
    });
  }

  async removeIgnoredChannel(guildId: string, channelId: string) {
    const ignoredChannels = await this.getIgnoredChannels(guildId);

    const filteredChannels = ignoredChannels.filter((id) => id !== channelId);

    if (filteredChannels.length === ignoredChannels.length) {
      throw new NotFoundException(`Channel ${channelId} is not in the ignored list`);
    }

    return this.prisma.loggingConfig.update({
      where: { guildId },
      data: {
        ignoredChannels: JSON.stringify(filteredChannels),
      },
    });
  }

  // ==================== IGNORED ROLES ====================

  async getIgnoredRoles(guildId: string): Promise<string[]> {
    const config = await this.prisma.loggingConfig.findUnique({
      where: { guildId },
    });

    if (!config || !config.ignoredRoles) {
      return [];
    }

    try {
      return JSON.parse(config.ignoredRoles);
    } catch (error) {
      this.logger.error(`Failed to parse ignoredRoles for guild ${guildId}:`, error);
      return [];
    }
  }

  async addIgnoredRole(guildId: string, roleId: string) {
    const ignoredRoles = await this.getIgnoredRoles(guildId);

    if (ignoredRoles.includes(roleId)) {
      throw new BadRequestException(`Role ${roleId} is already ignored`);
    }

    ignoredRoles.push(roleId);

    return this.prisma.loggingConfig.update({
      where: { guildId },
      data: {
        ignoredRoles: JSON.stringify(ignoredRoles),
      },
    });
  }

  async removeIgnoredRole(guildId: string, roleId: string) {
    const ignoredRoles = await this.getIgnoredRoles(guildId);

    const filteredRoles = ignoredRoles.filter((id) => id !== roleId);

    if (filteredRoles.length === ignoredRoles.length) {
      throw new NotFoundException(`Role ${roleId} is not in the ignored list`);
    }

    return this.prisma.loggingConfig.update({
      where: { guildId },
      data: {
        ignoredRoles: JSON.stringify(filteredRoles),
      },
    });
  }

  // ==================== SHOULD LOG ====================

  async shouldLog(
    guildId: string,
    channelId?: string,
    userId?: string,
    roleIds?: string[],
  ): Promise<boolean> {
    try {
      const config = await this.prisma.loggingConfig.findUnique({
        where: { guildId },
      });

      // If no config or logging disabled, don't log
      if (!config || !config.enabled) {
        return false;
      }

      // Check if channel is ignored
      if (channelId) {
        const ignoredChannels = await this.getIgnoredChannels(guildId);
        if (ignoredChannels.includes(channelId)) {
          return false;
        }
      }

      // Check if user has ignored role
      if (roleIds && roleIds.length > 0) {
        const ignoredRoles = await this.getIgnoredRoles(guildId);
        const hasIgnoredRole = roleIds.some((roleId) => ignoredRoles.includes(roleId));
        if (hasIgnoredRole) {
          return false;
        }
      }

      // Check if user is ignored (if we have userId)
      if (userId && config.ignoredUsers) {
        try {
          const ignoredUsers = JSON.parse(config.ignoredUsers);
          if (ignoredUsers.includes(userId)) {
            return false;
          }
        } catch (error) {
          this.logger.error(`Failed to parse ignoredUsers for guild ${guildId}:`, error);
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Error in shouldLog for guild ${guildId}:`, error);
      return false;
    }
  }
}
