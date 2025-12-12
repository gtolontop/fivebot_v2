/**
 * Starboard Service
 * Handles all starboard-related operations
 */

import { getPrismaClient } from './prisma-singleton.service';

interface StarboardSetupData {
  guildId: string;
  botId: string;
  channelId: string;
  emoji: string;
  threshold: number;
}

interface StarboardEntryData {
  guildId: string;
  botId: string;
  messageId: string;
  channelId: string;
  authorId: string;
  starCount: number;
  starboardMessageId?: string;
}

export class StarboardService {
  private prisma = getPrismaClient();

  /**
   * Setup or update starboard configuration
   */
  async setupStarboard(data: StarboardSetupData) {
    try {
      const result = await this.prisma.$executeRaw`
        INSERT INTO starboard_configs (
          id, guild_id, bot_id, channel_id, emoji, threshold,
          enabled, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${data.guildId},
          ${data.botId},
          ${data.channelId},
          ${data.emoji},
          ${data.threshold},
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT (guild_id)
        DO UPDATE SET
          channel_id = ${data.channelId},
          emoji = ${data.emoji},
          threshold = ${data.threshold},
          enabled = true,
          updated_at = NOW()
      `;

      return this.getConfig(data.guildId);
    } catch (error) {
      console.error('[StarboardService] Error setting up starboard:', error);
      throw error;
    }
  }

  /**
   * Get starboard configuration for a guild
   */
  async getConfig(guildId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT * FROM starboard_configs
        WHERE guild_id = ${guildId}
        LIMIT 1
      ` as any[];

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('[StarboardService] Error fetching config:', error);
      return null;
    }
  }

  /**
   * Add a star to a message
   */
  async addStar(guildId: string, messageId: string, userId: string) {
    try {
      // Get or create starboard entry
      const entry = await this.getOrCreateEntry(guildId, messageId);

      if (!entry) {
        throw new Error('Failed to get or create starboard entry');
      }

      // Check if user already starred
      const stars = entry.stars ? JSON.parse(entry.stars as string) : [];
      if (stars.includes(userId)) {
        return { success: false, message: 'User already starred this message' };
      }

      // Add star
      stars.push(userId);

      await this.prisma.$executeRaw`
        UPDATE starboard_entries
        SET stars = ${JSON.stringify(stars)}::jsonb,
            star_count = ${stars.length},
            updated_at = NOW()
        WHERE id = ${entry.id}::uuid
      `;

      return {
        success: true,
        starCount: stars.length,
        entryId: entry.id,
      };
    } catch (error) {
      console.error('[StarboardService] Error adding star:', error);
      throw error;
    }
  }

  /**
   * Remove a star from a message
   */
  async removeStar(guildId: string, messageId: string, userId: string) {
    try {
      const entry = await this.getEntry(guildId, messageId);

      if (!entry) {
        return { success: false, message: 'Starboard entry not found' };
      }

      const stars = entry.stars ? JSON.parse(entry.stars as string) : [];
      const index = stars.indexOf(userId);

      if (index === -1) {
        return { success: false, message: 'User has not starred this message' };
      }

      // Remove star
      stars.splice(index, 1);

      await this.prisma.$executeRaw`
        UPDATE starboard_entries
        SET stars = ${JSON.stringify(stars)}::jsonb,
            star_count = ${stars.length},
            updated_at = NOW()
        WHERE id = ${entry.id}::uuid
      `;

      return {
        success: true,
        starCount: stars.length,
        entryId: entry.id,
      };
    } catch (error) {
      console.error('[StarboardService] Error removing star:', error);
      throw error;
    }
  }

  /**
   * Check if a message meets the threshold for starboard
   */
  async checkThreshold(guildId: string, messageId: string): Promise<boolean> {
    try {
      const config = await this.getConfig(guildId);
      if (!config || !config.enabled) return false;

      const entry = await this.getEntry(guildId, messageId);
      if (!entry) return false;

      return entry.starCount >= config.threshold;
    } catch (error) {
      console.error('[StarboardService] Error checking threshold:', error);
      return false;
    }
  }

  /**
   * Create or update starboard entry
   */
  async createStarboardEntry(guildId: string, messageId: string, starCount: number, starboardMessageId?: string) {
    try {
      await this.prisma.$executeRaw`
        UPDATE starboard_entries
        SET starboard_message_id = ${starboardMessageId},
            star_count = ${starCount},
            updated_at = NOW()
        WHERE guild_id = ${guildId}
          AND message_id = ${messageId}
      `;

      return this.getEntry(guildId, messageId);
    } catch (error) {
      console.error('[StarboardService] Error creating starboard entry:', error);
      throw error;
    }
  }

  /**
   * Get starboard entry for a message
   */
  async getEntry(guildId: string, messageId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT * FROM starboard_entries
        WHERE guild_id = ${guildId}
          AND message_id = ${messageId}
        LIMIT 1
      ` as any[];

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('[StarboardService] Error fetching entry:', error);
      return null;
    }
  }

  /**
   * Get or create starboard entry
   */
  private async getOrCreateEntry(guildId: string, messageId: string) {
    try {
      let entry = await this.getEntry(guildId, messageId);

      if (!entry) {
        // Entry doesn't exist, we need more info to create it
        // This will be handled by the handler which has access to the message
        return null;
      }

      return entry;
    } catch (error) {
      console.error('[StarboardService] Error getting or creating entry:', error);
      return null;
    }
  }

  /**
   * Create a new starboard entry
   */
  async createEntry(data: StarboardEntryData) {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO starboard_entries (
          id, guild_id, bot_id, message_id, channel_id, author_id,
          stars, star_count, starboard_message_id, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${data.guildId},
          ${data.botId},
          ${data.messageId},
          ${data.channelId},
          ${data.authorId},
          '[]'::jsonb,
          ${data.starCount},
          ${data.starboardMessageId || null},
          NOW(),
          NOW()
        )
        ON CONFLICT (guild_id, message_id) DO NOTHING
      `;

      return this.getEntry(data.guildId, data.messageId);
    } catch (error) {
      console.error('[StarboardService] Error creating entry:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(guildId: string, userId: string) {
    try {
      // Get messages on starboard by user
      const starredMessages = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM starboard_entries
        WHERE guild_id = ${guildId}
          AND author_id = ${userId}
          AND starboard_message_id IS NOT NULL
      ` as any[];

      // Get total stars received
      const starsReceived = await this.prisma.$queryRaw`
        SELECT COALESCE(SUM(star_count), 0) as total
        FROM starboard_entries
        WHERE guild_id = ${guildId}
          AND author_id = ${userId}
      ` as any[];

      // Get highest starred message
      const highest = await this.prisma.$queryRaw`
        SELECT COALESCE(MAX(star_count), 0) as max
        FROM starboard_entries
        WHERE guild_id = ${guildId}
          AND author_id = ${userId}
      ` as any[];

      // Get stars given (count of how many times user starred messages)
      const starsGiven = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM starboard_entries
        WHERE guild_id = ${guildId}
          AND stars @> ${JSON.stringify([userId])}::jsonb
      ` as any[];

      // Get user rank
      const rank = await this.prisma.$queryRaw`
        SELECT COUNT(*) + 1 as rank
        FROM (
          SELECT author_id, SUM(star_count) as total_stars
          FROM starboard_entries
          WHERE guild_id = ${guildId}
          GROUP BY author_id
          HAVING SUM(star_count) > (
            SELECT COALESCE(SUM(star_count), 0)
            FROM starboard_entries
            WHERE guild_id = ${guildId}
              AND author_id = ${userId}
          )
        ) as rankings
      ` as any[];

      return {
        starredMessages: parseInt(starredMessages[0]?.count || '0'),
        starsReceived: parseInt(starsReceived[0]?.total || '0'),
        highestStars: parseInt(highest[0]?.max || '0'),
        starsGiven: parseInt(starsGiven[0]?.count || '0'),
        rank: parseInt(rank[0]?.rank || '0'),
      };
    } catch (error) {
      console.error('[StarboardService] Error fetching user stats:', error);
      return {
        starredMessages: 0,
        starsReceived: 0,
        highestStars: 0,
        starsGiven: 0,
        rank: 0,
      };
    }
  }

  /**
   * Get top starred messages
   */
  async getTopMessages(guildId: string, limit: number = 10) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT *
        FROM starboard_entries
        WHERE guild_id = ${guildId}
          AND starboard_message_id IS NOT NULL
        ORDER BY star_count DESC
        LIMIT ${limit}
      ` as any[];

      return result;
    } catch (error) {
      console.error('[StarboardService] Error fetching top messages:', error);
      return [];
    }
  }

  /**
   * Delete starboard entry
   */
  async deleteEntry(guildId: string, messageId: string) {
    try {
      await this.prisma.$executeRaw`
        DELETE FROM starboard_entries
        WHERE guild_id = ${guildId}
          AND message_id = ${messageId}
      `;
    } catch (error) {
      console.error('[StarboardService] Error deleting entry:', error);
      throw error;
    }
  }
}
