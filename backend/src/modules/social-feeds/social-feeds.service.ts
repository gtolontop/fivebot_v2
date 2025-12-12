import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SocialPlatform } from '@prisma/client';
import { CreateFeedDto, UpdateFeedDto } from './dto';
import {
  YouTubeService,
  TwitchService,
  TwitterService,
  RSSService,
} from './platforms';

@Injectable()
export class SocialFeedsService {
  private readonly logger = new Logger(SocialFeedsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly youtubeService: YouTubeService,
    private readonly twitchService: TwitchService,
    private readonly twitterService: TwitterService,
    private readonly rssService: RSSService,
  ) {}

  /**
   * Get social feeds configuration for a guild
   * @param guildId - Guild ID
   * @returns Social feeds configuration
   */
  async getConfig(guildId: string) {
    try {
      const config = await this.prisma.socialFeedsConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        throw new NotFoundException(
          `Social feeds configuration not found for guild ${guildId}`,
        );
      }

      return config;
    } catch (error) {
      this.logger.error(
        `Failed to get config for guild ${guildId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update social feeds configuration
   * @param guildId - Guild ID
   * @param botId - Bot ID
   * @param enabled - Enable or disable social feeds
   * @returns Updated configuration
   */
  async updateConfig(guildId: string, botId: string, enabled: boolean) {
    try {
      const config = await this.prisma.socialFeedsConfig.upsert({
        where: { guildId },
        create: {
          guildId,
          botId,
          enabled,
        },
        update: {
          enabled,
        },
      });

      this.logger.log(
        `Updated social feeds config for guild ${guildId}: enabled=${enabled}`,
      );

      return config;
    } catch (error) {
      this.logger.error(
        `Failed to update config for guild ${guildId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all social feeds for a guild
   * @param guildId - Guild ID
   * @returns Array of social feeds
   */
  async getFeeds(guildId: string) {
    try {
      const feeds = await this.prisma.socialFeed.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
      });

      return feeds;
    } catch (error) {
      this.logger.error(
        `Failed to get feeds for guild ${guildId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get a specific social feed
   * @param feedId - Feed ID
   * @returns Social feed
   */
  async getFeed(feedId: string) {
    try {
      const feed = await this.prisma.socialFeed.findUnique({
        where: { id: feedId },
      });

      if (!feed) {
        throw new NotFoundException(`Social feed not found: ${feedId}`);
      }

      return feed;
    } catch (error) {
      this.logger.error(
        `Failed to get feed ${feedId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Create a new social feed
   * @param guildId - Guild ID
   * @param botId - Bot ID
   * @param data - Feed creation data
   * @returns Created social feed
   */
  async createFeed(guildId: string, botId: string, data: CreateFeedDto) {
    try {
      // Ensure config exists
      const config = await this.prisma.socialFeedsConfig.upsert({
        where: { guildId },
        create: {
          guildId,
          botId,
          enabled: true,
        },
        update: {},
      });

      // Create the feed
      const feed = await this.prisma.socialFeed.create({
        data: {
          configId: config.id,
          guildId,
          platform: data.platform,
          accountId: data.accountId,
          accountName: data.accountName,
          accountUrl: data.accountUrl,
          channelId: data.channelId,
          roleToMention: data.roleToMention,
          customMessage: data.customMessage,
          embedEnabled: data.embedEnabled ?? true,
          embedColor: data.embedColor,
          filterKeywords: data.filterKeywords,
          excludeKeywords: data.excludeKeywords,
          isActive: true,
        },
      });

      this.logger.log(
        `Created social feed ${feed.id} for guild ${guildId}: ${data.platform} - ${data.accountName}`,
      );

      return feed;
    } catch (error) {
      this.logger.error(
        `Failed to create feed for guild ${guildId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update a social feed
   * @param feedId - Feed ID
   * @param data - Update data
   * @returns Updated social feed
   */
  async updateFeed(feedId: string, data: UpdateFeedDto) {
    try {
      const feed = await this.prisma.socialFeed.update({
        where: { id: feedId },
        data: {
          accountName: data.accountName,
          accountUrl: data.accountUrl,
          channelId: data.channelId,
          roleToMention: data.roleToMention,
          customMessage: data.customMessage,
          embedEnabled: data.embedEnabled,
          embedColor: data.embedColor,
          filterKeywords: data.filterKeywords,
          excludeKeywords: data.excludeKeywords,
          isActive: data.isActive,
        },
      });

      this.logger.log(`Updated social feed ${feedId}`);

      return feed;
    } catch (error) {
      this.logger.error(
        `Failed to update feed ${feedId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete a social feed
   * @param feedId - Feed ID
   * @returns Deleted social feed
   */
  async deleteFeed(feedId: string) {
    try {
      const feed = await this.prisma.socialFeed.delete({
        where: { id: feedId },
      });

      this.logger.log(`Deleted social feed ${feedId}`);

      return feed;
    } catch (error) {
      this.logger.error(
        `Failed to delete feed ${feedId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Toggle a social feed's active status
   * @param feedId - Feed ID
   * @param isActive - Active status
   * @returns Updated social feed
   */
  async toggleFeed(feedId: string, isActive: boolean) {
    try {
      const feed = await this.prisma.socialFeed.update({
        where: { id: feedId },
        data: { isActive },
      });

      this.logger.log(`Toggled social feed ${feedId}: isActive=${isActive}`);

      return feed;
    } catch (error) {
      this.logger.error(
        `Failed to toggle feed ${feedId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Test a social feed by sending a test notification
   * @param feedId - Feed ID
   * @returns Test result
   */
  async testFeed(feedId: string) {
    try {
      const feed = await this.getFeed(feedId);

      this.logger.log(`Testing social feed ${feedId}: ${feed.platform} - ${feed.accountName}`);

      // TODO: Implement test notification via Discord webhook or bot
      // For now, return a success response
      return {
        success: true,
        message: `Test notification would be sent to channel ${feed.channelId}`,
        feed: {
          id: feed.id,
          platform: feed.platform,
          accountName: feed.accountName,
          channelId: feed.channelId,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to test feed ${feedId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Check a feed for new content
   * @param feedId - Feed ID
   * @returns Check result with any new content found
   */
  async checkFeed(feedId: string) {
    try {
      const feed = await this.getFeed(feedId);

      if (!feed.isActive) {
        return {
          success: false,
          message: 'Feed is not active',
        };
      }

      this.logger.log(`Checking feed ${feedId}: ${feed.platform} - ${feed.accountName}`);

      let newContent: any[] = [];

      switch (feed.platform) {
        case SocialPlatform.YOUTUBE:
          newContent = await this.youtubeService.checkForNewVideos(
            feed.accountId,
            feed.lastPostId,
          );
          break;

        case SocialPlatform.TWITCH:
          const streamStatus = await this.twitchService.checkStreamStatus(
            feed.accountId,
          );
          if (streamStatus && streamStatus.isLive) {
            newContent = [streamStatus];
          }
          break;

        case SocialPlatform.TWITTER:
          newContent = await this.twitterService.checkForNewTweets(
            feed.accountId,
            feed.lastPostId,
          );
          break;

        case SocialPlatform.RSS:
          newContent = await this.rssService.checkForNewItems(
            feed.accountId,
            feed.lastPostId,
          );
          break;

        default:
          this.logger.warn(`Unsupported platform: ${feed.platform}`);
          return {
            success: false,
            message: `Platform ${feed.platform} is not yet supported`,
          };
      }

      // Update last checked time
      await this.prisma.socialFeed.update({
        where: { id: feedId },
        data: {
          lastChecked: new Date(),
          errorCount: 0, // Reset error count on successful check
        },
      });

      // If new content was found, update lastPostId
      if (newContent.length > 0) {
        const latestPost = newContent[0];
        await this.prisma.socialFeed.update({
          where: { id: feedId },
          data: {
            lastPostId: latestPost.id,
            lastPostUrl: latestPost.url || latestPost.link,
          },
        });
      }

      return {
        success: true,
        newContentCount: newContent.length,
        content: newContent,
      };
    } catch (error) {
      this.logger.error(
        `Failed to check feed ${feedId}: ${error.message}`,
        error.stack,
      );

      // Increment error count
      await this.prisma.socialFeed.update({
        where: { id: feedId },
        data: {
          errorCount: { increment: 1 },
          lastChecked: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Process all active feeds (for cron job)
   * @returns Processing results
   */
  async processAllFeeds() {
    try {
      this.logger.log('Processing all active social feeds...');

      // Get all active feeds from enabled configs
      const feeds = await this.prisma.socialFeed.findMany({
        where: {
          isActive: true,
          config: {
            enabled: true,
          },
        },
        include: {
          config: true,
        },
      });

      this.logger.log(`Found ${feeds.length} active feeds to process`);

      const results = [];

      for (const feed of feeds) {
        try {
          const result = await this.checkFeed(feed.id);
          results.push({
            feedId: feed.id,
            accountName: feed.accountName,
            platform: feed.platform,
            ...result,
          });

          // If new content found, log it
          if (result.newContentCount > 0) {
            this.logger.log(
              `Found ${result.newContentCount} new items for feed ${feed.id} (${feed.platform} - ${feed.accountName})`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error processing feed ${feed.id}: ${error.message}`,
            error.stack,
          );
          results.push({
            feedId: feed.id,
            accountName: feed.accountName,
            platform: feed.platform,
            success: false,
            error: error.message,
          });
        }
      }

      this.logger.log(`Finished processing ${feeds.length} feeds`);

      return {
        totalProcessed: feeds.length,
        results,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process all feeds: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get statistics for social feeds in a guild
   * @param guildId - Guild ID
   * @returns Feed statistics
   */
  async getStatistics(guildId: string) {
    try {
      const [totalFeeds, activeFeeds, feedsByPlatform] = await Promise.all([
        this.prisma.socialFeed.count({
          where: { guildId },
        }),
        this.prisma.socialFeed.count({
          where: { guildId, isActive: true },
        }),
        this.prisma.socialFeed.groupBy({
          by: ['platform'],
          where: { guildId },
          _count: true,
        }),
      ]);

      // Get feeds with errors
      const feedsWithErrors = await this.prisma.socialFeed.count({
        where: {
          guildId,
          errorCount: { gt: 0 },
        },
      });

      // Get recently checked feeds (within last hour)
      const recentlyChecked = await this.prisma.socialFeed.count({
        where: {
          guildId,
          lastChecked: {
            gte: new Date(Date.now() - 60 * 60 * 1000),
          },
        },
      });

      return {
        totalFeeds,
        activeFeeds,
        inactiveFeeds: totalFeeds - activeFeeds,
        feedsWithErrors,
        recentlyChecked,
        byPlatform: feedsByPlatform.reduce((acc, item) => {
          acc[item.platform] = item._count;
          return acc;
        }, {} as Record<string, number>),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get statistics for guild ${guildId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
