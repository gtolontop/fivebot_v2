import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UpdateConfigDto } from './dto/update-config.dto';

@Injectable()
export class TempChannelsService {
  private readonly logger = new Logger(TempChannelsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get temp channel configuration for a guild
   * @param guildId - Guild ID
   */
  async getConfig(guildId: string) {
    try {
      const config = await this.prisma.tempChannelConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        throw new NotFoundException(
          `Temp channel config not found for guild ${guildId}`,
        );
      }

      return config;
    } catch (error) {
      this.logger.error(`Failed to get config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update temp channel configuration
   * @param guildId - Guild ID
   * @param data - Configuration data to update
   */
  async updateConfig(guildId: string, data: UpdateConfigDto) {
    try {
      const config = await this.prisma.tempChannelConfig.upsert({
        where: { guildId },
        create: {
          guildId,
          botId: data.hubChannelId ? 'default' : '', // Will be set by the caller
          hubChannelId: data.hubChannelId || '',
          categoryId: data.categoryId,
          enabled: data.enabled ?? true,
          defaultName: data.defaultName ?? "{user}'s Channel",
          userLimit: data.userLimit ?? 0,
          maxChannelsPerUser: data.maxChannelsPerUser ?? 1,
          maxChannelsTotal: data.maxChannelsTotal ?? 50,
          deleteWhenEmpty: data.deleteWhenEmpty ?? true,
          deleteAfterSeconds: data.deleteAfterSeconds ?? 0,
          defaultBitrate: data.defaultBitrate ?? 64000,
        },
        update: {
          ...data,
        },
      });

      return config;
    } catch (error) {
      this.logger.error(
        `Failed to update config: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle voice channel join event
   * @param guildId - Guild ID
   * @param userId - User ID
   * @param channelId - Channel ID
   */
  async handleVoiceJoin(guildId: string, userId: string, channelId: string) {
    try {
      const config = await this.prisma.tempChannelConfig.findUnique({
        where: { guildId },
      });

      if (!config || !config.enabled) {
        return null;
      }

      // Check if the channel is the hub channel
      if (channelId !== config.hubChannelId) {
        // Update last activity for existing temp channels
        await this.updateLastActivity(channelId);
        return null;
      }

      // Check user limits
      const userChannelCount = await this.prisma.tempChannel.count({
        where: {
          guildId,
          ownerId: userId,
        },
      });

      if (userChannelCount >= config.maxChannelsPerUser) {
        throw new BadRequestException(
          `You have reached the maximum number of temp channels (${config.maxChannelsPerUser})`,
        );
      }

      // Check total channel limit
      const totalChannelCount = await this.prisma.tempChannel.count({
        where: {
          configId: config.id,
        },
      });

      if (totalChannelCount >= config.maxChannelsTotal) {
        throw new BadRequestException(
          'Maximum number of temp channels reached for this server',
        );
      }

      // Create temp channel
      return await this.createTempChannel(guildId, userId, config);
    } catch (error) {
      this.logger.error(
        `Failed to handle voice join: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle voice channel leave event
   * @param guildId - Guild ID
   * @param userId - User ID
   * @param channelId - Channel ID
   */
  async handleVoiceLeave(guildId: string, userId: string, channelId: string) {
    try {
      const tempChannel = await this.prisma.tempChannel.findUnique({
        where: { channelId },
      });

      if (!tempChannel) {
        return null;
      }

      const config = await this.prisma.tempChannelConfig.findUnique({
        where: { id: tempChannel.configId },
      });

      if (!config || !config.deleteWhenEmpty) {
        return null;
      }

      // In a real implementation, you would check the actual Discord channel
      // to see if it's empty. For now, we'll return a signal to check.
      return {
        shouldCheck: true,
        tempChannel,
        config,
      };
    } catch (error) {
      this.logger.error(
        `Failed to handle voice leave: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Create a temp channel
   * @param guildId - Guild ID
   * @param userId - User ID who will own the channel
   * @param config - Temp channel configuration
   */
  async createTempChannel(guildId: string, userId: string, config: any) {
    try {
      // Parse channel name with variables
      const channelName = this.parseChannelName(
        config.defaultName,
        userId,
        null,
      );

      // Get the next channel count for naming
      const count = await this.prisma.tempChannel.count({
        where: { guildId },
      });

      const finalName = channelName.replace('{count}', String(count + 1));

      // In a real implementation, you would create the actual Discord channel here
      // For now, we'll create the database record with a placeholder channel ID
      const tempChannel = await this.prisma.tempChannel.create({
        data: {
          configId: config.id,
          guildId,
          channelId: `temp_${Date.now()}_${userId}`, // Placeholder - replace with actual Discord channel ID
          ownerId: userId,
          name: finalName,
          userLimit: config.userLimit,
          bitrate: config.defaultBitrate || 64000,
          isLocked: false,
          isHidden: false,
          trustedUsers: null,
          blockedUsers: null,
        },
      });

      return tempChannel;
    } catch (error) {
      this.logger.error(
        `Failed to create temp channel: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete a temp channel
   * @param channelId - Channel ID to delete
   */
  async deleteTempChannel(channelId: string) {
    try {
      const tempChannel = await this.prisma.tempChannel.findUnique({
        where: { channelId },
      });

      if (!tempChannel) {
        throw new NotFoundException('Temp channel not found');
      }

      await this.prisma.tempChannel.delete({
        where: { channelId },
      });

      // In a real implementation, you would also delete the actual Discord channel
      return { success: true, channelId };
    } catch (error) {
      this.logger.error(
        `Failed to delete temp channel: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Set channel name
   * @param channelId - Channel ID
   * @param ownerId - Owner ID
   * @param name - New name
   */
  async setChannelName(channelId: string, ownerId: string, name: string) {
    try {
      const tempChannel = await this.verifyChannelOwnership(
        channelId,
        ownerId,
      );

      const updated = await this.prisma.tempChannel.update({
        where: { channelId },
        data: { name },
      });

      // In a real implementation, you would also update the Discord channel name
      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to set channel name: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Set channel user limit
   * @param channelId - Channel ID
   * @param ownerId - Owner ID
   * @param limit - User limit (0 = unlimited)
   */
  async setChannelLimit(channelId: string, ownerId: string, limit: number) {
    try {
      const tempChannel = await this.verifyChannelOwnership(
        channelId,
        ownerId,
      );

      const updated = await this.prisma.tempChannel.update({
        where: { channelId },
        data: { userLimit: limit },
      });

      // In a real implementation, you would also update the Discord channel limit
      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to set channel limit: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Lock a channel (only trusted users can join)
   * @param channelId - Channel ID
   * @param ownerId - Owner ID
   */
  async lockChannel(channelId: string, ownerId: string) {
    try {
      const tempChannel = await this.verifyChannelOwnership(
        channelId,
        ownerId,
      );

      const updated = await this.prisma.tempChannel.update({
        where: { channelId },
        data: { isLocked: true },
      });

      // In a real implementation, you would also update Discord channel permissions
      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to lock channel: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Unlock a channel
   * @param channelId - Channel ID
   * @param ownerId - Owner ID
   */
  async unlockChannel(channelId: string, ownerId: string) {
    try {
      const tempChannel = await this.verifyChannelOwnership(
        channelId,
        ownerId,
      );

      const updated = await this.prisma.tempChannel.update({
        where: { channelId },
        data: { isLocked: false },
      });

      // In a real implementation, you would also update Discord channel permissions
      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to unlock channel: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Permit a user to join a locked channel
   * @param channelId - Channel ID
   * @param ownerId - Owner ID
   * @param userId - User ID to permit
   */
  async permitUser(channelId: string, ownerId: string, userId: string) {
    try {
      const tempChannel = await this.verifyChannelOwnership(
        channelId,
        ownerId,
      );

      const trustedUsers = tempChannel.trustedUsers
        ? JSON.parse(tempChannel.trustedUsers)
        : [];

      if (!trustedUsers.includes(userId)) {
        trustedUsers.push(userId);
      }

      // Remove from blocked users if present
      let blockedUsers = tempChannel.blockedUsers
        ? JSON.parse(tempChannel.blockedUsers)
        : [];
      blockedUsers = blockedUsers.filter((id: string) => id !== userId);

      const updated = await this.prisma.tempChannel.update({
        where: { channelId },
        data: {
          trustedUsers: JSON.stringify(trustedUsers),
          blockedUsers: JSON.stringify(blockedUsers),
        },
      });

      // In a real implementation, you would also update Discord channel permissions
      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to permit user: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Reject a user from joining a channel
   * @param channelId - Channel ID
   * @param ownerId - Owner ID
   * @param userId - User ID to reject
   */
  async rejectUser(channelId: string, ownerId: string, userId: string) {
    try {
      const tempChannel = await this.verifyChannelOwnership(
        channelId,
        ownerId,
      );

      const blockedUsers = tempChannel.blockedUsers
        ? JSON.parse(tempChannel.blockedUsers)
        : [];

      if (!blockedUsers.includes(userId)) {
        blockedUsers.push(userId);
      }

      // Remove from trusted users if present
      let trustedUsers = tempChannel.trustedUsers
        ? JSON.parse(tempChannel.trustedUsers)
        : [];
      trustedUsers = trustedUsers.filter((id: string) => id !== userId);

      const updated = await this.prisma.tempChannel.update({
        where: { channelId },
        data: {
          trustedUsers: JSON.stringify(trustedUsers),
          blockedUsers: JSON.stringify(blockedUsers),
        },
      });

      // In a real implementation, you would also update Discord channel permissions
      // and kick the user if they're currently in the channel
      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to reject user: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Claim a channel if the owner has left
   * @param channelId - Channel ID
   * @param newOwnerId - New owner ID
   */
  async claimChannel(channelId: string, newOwnerId: string) {
    try {
      const tempChannel = await this.prisma.tempChannel.findUnique({
        where: { channelId },
      });

      if (!tempChannel) {
        throw new NotFoundException('Temp channel not found');
      }

      // In a real implementation, you would verify that:
      // 1. The original owner is not in the channel
      // 2. The new owner is in the channel
      // For now, we'll just update the owner

      const updated = await this.prisma.tempChannel.update({
        where: { channelId },
        data: { ownerId: newOwnerId },
      });

      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to claim channel: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Transfer channel ownership
   * @param channelId - Channel ID
   * @param ownerId - Current owner ID
   * @param newOwnerId - New owner ID
   */
  async transferOwnership(
    channelId: string,
    ownerId: string,
    newOwnerId: string,
  ) {
    try {
      const tempChannel = await this.verifyChannelOwnership(
        channelId,
        ownerId,
      );

      const updated = await this.prisma.tempChannel.update({
        where: { channelId },
        data: { ownerId: newOwnerId },
      });

      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to transfer ownership: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cleanup empty channels (scheduled task)
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupEmptyChannels() {
    try {
      this.logger.log('Running scheduled cleanup of empty temp channels');

      // Get all temp channels that should be deleted
      const now = new Date();
      const channels = await this.prisma.tempChannel.findMany({
        include: {
          config: true,
        },
      });

      for (const channel of channels) {
        if (!channel.config) continue;

        const config = channel.config as any;

        if (config.deleteWhenEmpty && config.deleteAfterSeconds > 0) {
          const lastActivity = new Date(channel.lastActivity);
          const timeSinceActivity =
            (now.getTime() - lastActivity.getTime()) / 1000;

          if (timeSinceActivity >= config.deleteAfterSeconds) {
            // In a real implementation, you would check if the Discord channel is empty
            // For now, we'll just delete channels that haven't been active
            this.logger.log(
              `Deleting inactive temp channel: ${channel.channelId}`,
            );
            await this.deleteTempChannel(channel.channelId);
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to cleanup empty channels: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Update last activity timestamp for a channel
   * @param channelId - Channel ID
   */
  private async updateLastActivity(channelId: string) {
    try {
      await this.prisma.tempChannel.updateMany({
        where: { channelId },
        data: { lastActivity: new Date() },
      });
    } catch (error) {
      // Silently fail - this is not critical
      this.logger.debug(
        `Failed to update last activity: ${error.message}`,
      );
    }
  }

  /**
   * Verify channel ownership
   * @param channelId - Channel ID
   * @param ownerId - Owner ID
   */
  private async verifyChannelOwnership(channelId: string, ownerId: string) {
    const tempChannel = await this.prisma.tempChannel.findUnique({
      where: { channelId },
    });

    if (!tempChannel) {
      throw new NotFoundException('Temp channel not found');
    }

    if (tempChannel.ownerId !== ownerId) {
      throw new ForbiddenException('You are not the owner of this channel');
    }

    return tempChannel;
  }

  /**
   * Parse channel name with variables
   * @param template - Name template
   * @param userId - User ID
   * @param game - Current game/activity (optional)
   */
  private parseChannelName(
    template: string,
    userId: string,
    game: string | null,
  ): string {
    let name = template;

    // Replace {user} with user mention or username
    name = name.replace('{user}', `<@${userId}>`);

    // Replace {game} with current activity
    if (game) {
      name = name.replace('{game}', game);
    } else {
      name = name.replace('{game}', 'Channel');
    }

    // {count} will be replaced after we know the count
    return name;
  }

  /**
   * Get all temp channels for a guild
   * @param guildId - Guild ID
   */
  async getTempChannels(guildId: string) {
    try {
      return await this.prisma.tempChannel.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get temp channels: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get a specific temp channel
   * @param channelId - Channel ID
   */
  async getTempChannel(channelId: string) {
    try {
      const channel = await this.prisma.tempChannel.findUnique({
        where: { channelId },
        include: {
          config: true,
        },
      });

      if (!channel) {
        throw new NotFoundException('Temp channel not found');
      }

      return channel;
    } catch (error) {
      this.logger.error(
        `Failed to get temp channel: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
