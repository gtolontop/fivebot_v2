import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateConfigDto } from './dto/update-config.dto';

@Injectable()
export class StarboardService {
  private readonly logger = new Logger(StarboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get starboard configuration for a guild
   * @param guildId - Guild ID
   */
  async getConfig(guildId: string) {
    try {
      const config = await this.prisma.starboardConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        throw new NotFoundException('Starboard configuration not found');
      }

      return config;
    } catch (error) {
      this.logger.error(`Failed to get starboard config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update starboard configuration
   * @param guildId - Guild ID
   * @param botId - Bot ID
   * @param data - Configuration update data
   */
  async updateConfig(guildId: string, botId: string, data: UpdateConfigDto) {
    try {
      const config = await this.prisma.starboardConfig.upsert({
        where: { guildId },
        create: {
          guildId,
          botId,
          channelId: data.channelId || '',
          emoji: data.emoji || '⭐',
          threshold: data.threshold || 3,
          enabled: data.enabled !== undefined ? data.enabled : true,
          embedColor: data.embedColor,
          showJumpButton: data.showJumpButton !== undefined ? data.showJumpButton : true,
          ignoredChannels: data.ignoredChannels,
          selfStarAllowed: data.selfStarAllowed || false,
          botStarAllowed: data.botStarAllowed || false,
          nsfwAllowed: data.nsfwAllowed || false,
        },
        update: data,
      });

      return config;
    } catch (error) {
      this.logger.error(`Failed to update starboard config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create starboard configuration
   * @param guildId - Guild ID
   * @param botId - Bot ID
   * @param channelId - Starboard channel ID
   * @param threshold - Star threshold
   */
  async createConfig(
    guildId: string,
    botId: string,
    channelId: string,
    threshold: number = 3,
  ) {
    try {
      const config = await this.prisma.starboardConfig.create({
        data: {
          guildId,
          botId,
          channelId,
          threshold,
          emoji: '⭐',
          enabled: true,
          showJumpButton: true,
          selfStarAllowed: false,
          botStarAllowed: false,
          nsfwAllowed: false,
        },
      });

      return config;
    } catch (error) {
      this.logger.error(`Failed to create starboard config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add a star to a message
   * @param guildId - Guild ID
   * @param messageId - Message ID
   * @param channelId - Channel ID
   * @param authorId - Message author ID
   * @param userId - User who starred the message
   */
  async addStar(
    guildId: string,
    messageId: string,
    channelId: string,
    authorId: string,
    userId: string,
  ) {
    try {
      // Get config first
      const config = await this.getConfig(guildId);

      if (!config.enabled) {
        throw new BadRequestException('Starboard is disabled for this guild');
      }

      // Check if user is trying to star their own message
      if (!config.selfStarAllowed && authorId === userId) {
        throw new BadRequestException('Self-starring is not allowed');
      }

      // Get or create entry
      let entry = await this.prisma.starboardEntry.findFirst({
        where: {
          guildId,
          messageId,
        },
      });

      if (!entry) {
        entry = await this.prisma.starboardEntry.create({
          data: {
            configId: config.id,
            guildId,
            messageId,
            channelId,
            authorId,
            starCount: 0,
            starUsers: '[]',
          },
        });
      }

      // Parse star users
      const starUsers = JSON.parse(entry.starUsers || '[]') as string[];

      // Check if user already starred
      if (starUsers.includes(userId)) {
        throw new BadRequestException('User already starred this message');
      }

      // Add user to star list
      starUsers.push(userId);

      // Update entry
      const updated = await this.prisma.starboardEntry.update({
        where: { id: entry.id },
        data: {
          starCount: starUsers.length,
          starUsers: JSON.stringify(starUsers),
        },
      });

      return updated;
    } catch (error) {
      this.logger.error(`Failed to add star: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Remove a star from a message
   * @param guildId - Guild ID
   * @param messageId - Message ID
   * @param userId - User who is removing their star
   */
  async removeStar(guildId: string, messageId: string, userId: string) {
    try {
      const entry = await this.prisma.starboardEntry.findFirst({
        where: {
          guildId,
          messageId,
        },
      });

      if (!entry) {
        throw new NotFoundException('Starboard entry not found');
      }

      // Parse star users
      const starUsers = JSON.parse(entry.starUsers || '[]') as string[];

      // Check if user has starred
      if (!starUsers.includes(userId)) {
        throw new BadRequestException('User has not starred this message');
      }

      // Remove user from star list
      const updatedStarUsers = starUsers.filter((id) => id !== userId);

      // Update entry
      const updated = await this.prisma.starboardEntry.update({
        where: { id: entry.id },
        data: {
          starCount: updatedStarUsers.length,
          starUsers: JSON.stringify(updatedStarUsers),
        },
      });

      return updated;
    } catch (error) {
      this.logger.error(`Failed to remove star: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get a starboard entry by message ID
   * @param messageId - Message ID
   */
  async getEntry(messageId: string) {
    try {
      const entry = await this.prisma.starboardEntry.findFirst({
        where: { messageId },
      });

      if (!entry) {
        throw new NotFoundException('Starboard entry not found');
      }

      return entry;
    } catch (error) {
      this.logger.error(`Failed to get entry: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get paginated starboard entries for a guild
   * @param guildId - Guild ID
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   */
  async getEntries(guildId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [entries, total] = await Promise.all([
        this.prisma.starboardEntry.findMany({
          where: { guildId },
          orderBy: [{ starCount: 'desc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        this.prisma.starboardEntry.count({
          where: { guildId },
        }),
      ]);

      return {
        data: entries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to get entries: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get top starred messages for a guild
   * @param guildId - Guild ID
   * @param limit - Number of entries to return
   */
  async getTopEntries(guildId: string, limit: number = 10) {
    try {
      const entries = await this.prisma.starboardEntry.findMany({
        where: { guildId },
        orderBy: [{ starCount: 'desc' }, { createdAt: 'desc' }],
        take: limit,
      });

      return entries.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));
    } catch (error) {
      this.logger.error(`Failed to get top entries: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get top starred messages for a specific user in a guild
   * @param guildId - Guild ID
   * @param userId - User ID
   * @param limit - Number of entries to return
   */
  async getUserTopEntries(guildId: string, userId: string, limit: number = 10) {
    try {
      const entries = await this.prisma.starboardEntry.findMany({
        where: {
          guildId,
          authorId: userId,
        },
        orderBy: [{ starCount: 'desc' }, { createdAt: 'desc' }],
        take: limit,
      });

      return entries.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));
    } catch (error) {
      this.logger.error(`Failed to get user top entries: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if a message should create a starboard entry based on star count
   * @param guildId - Guild ID
   * @param starCount - Current star count
   */
  async shouldCreateEntry(guildId: string, starCount: number): Promise<boolean> {
    try {
      const config = await this.getConfig(guildId);
      return config.enabled && starCount >= config.threshold;
    } catch (error) {
      this.logger.error(`Failed to check if should create entry: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Create or update a starboard message
   * @param entry - Starboard entry
   */
  async createStarboardMessage(entry: any) {
    try {
      // This method would typically interact with Discord API
      // to post/update the message in the starboard channel
      // For now, we'll just return the entry with a placeholder message ID

      const config = await this.getConfig(entry.guildId);

      if (await this.shouldCreateEntry(entry.guildId, entry.starCount)) {
        // Update entry with starboard message ID
        const updated = await this.prisma.starboardEntry.update({
          where: { id: entry.id },
          data: {
            starboardMessageId: entry.starboardMessageId || 'placeholder_message_id',
          },
        });

        return updated;
      }

      return entry;
    } catch (error) {
      this.logger.error(`Failed to create starboard message: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a starboard entry
   * @param entryId - Entry ID
   */
  async deleteEntry(entryId: string) {
    try {
      const entry = await this.prisma.starboardEntry.delete({
        where: { id: entryId },
      });

      return entry;
    } catch (error) {
      this.logger.error(`Failed to delete entry: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get starboard statistics for a guild
   * @param guildId - Guild ID
   */
  async getStatistics(guildId: string) {
    try {
      const [totalEntries, totalStars, topEntry, config] = await Promise.all([
        this.prisma.starboardEntry.count({
          where: { guildId },
        }),
        this.prisma.starboardEntry.aggregate({
          where: { guildId },
          _sum: {
            starCount: true,
          },
        }),
        this.prisma.starboardEntry.findFirst({
          where: { guildId },
          orderBy: { starCount: 'desc' },
        }),
        this.prisma.starboardConfig.findUnique({
          where: { guildId },
        }),
      ]);

      return {
        totalEntries,
        totalStars: totalStars._sum.starCount || 0,
        topEntry,
        config,
        averageStars: totalEntries > 0 ? (totalStars._sum.starCount || 0) / totalEntries : 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get statistics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get leaderboard of users with most starred messages
   * @param guildId - Guild ID
   * @param limit - Number of users to return
   */
  async getLeaderboard(guildId: string, limit: number = 10) {
    try {
      // Get all entries for the guild
      const entries = await this.prisma.starboardEntry.findMany({
        where: { guildId },
        select: {
          authorId: true,
          starCount: true,
        },
      });

      // Group by author and sum stars
      const userStars = new Map<string, number>();
      const userMessages = new Map<string, number>();

      for (const entry of entries) {
        const currentStars = userStars.get(entry.authorId) || 0;
        const currentMessages = userMessages.get(entry.authorId) || 0;

        userStars.set(entry.authorId, currentStars + entry.starCount);
        userMessages.set(entry.authorId, currentMessages + 1);
      }

      // Convert to array and sort
      const leaderboard = Array.from(userStars.entries())
        .map(([userId, totalStars]) => ({
          userId,
          totalStars,
          totalMessages: userMessages.get(userId) || 0,
          averageStars: totalStars / (userMessages.get(userId) || 1),
        }))
        .sort((a, b) => b.totalStars - a.totalStars)
        .slice(0, limit)
        .map((user, index) => ({
          ...user,
          rank: index + 1,
        }));

      return leaderboard;
    } catch (error) {
      this.logger.error(`Failed to get leaderboard: ${error.message}`, error.stack);
      throw error;
    }
  }
}
