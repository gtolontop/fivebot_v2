/**
 * Suggestions Service
 * Handles all suggestion-related operations
 */

import { getPrismaClient } from './prisma-singleton.service';

interface SuggestionConfigData {
  guildId: string;
  botId: string;
  channelId?: string;
  enabled?: boolean;
}

interface CreateSuggestionData {
  guildId: string;
  botId: string;
  authorId: string;
  content: string;
}

interface UpdateSuggestionData {
  messageId?: string;
  status?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  response?: string;
}

export class SuggestionsService {
  private prisma = getPrismaClient();

  /**
   * Create suggestion configuration
   */
  async createConfig(data: SuggestionConfigData) {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO suggestion_configs (
          id, guild_id, bot_id, channel_id, enabled,
          notify_on_decision, use_reactions, auto_thread,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${data.guildId},
          ${data.botId},
          ${data.channelId || null},
          ${data.enabled !== false},
          true,
          true,
          false,
          NOW(),
          NOW()
        )
        ON CONFLICT (guild_id) DO NOTHING
      `;

      return this.getConfig(data.guildId);
    } catch (error) {
      console.error('[SuggestionsService] Error creating config:', error);
      throw error;
    }
  }

  /**
   * Get suggestion configuration for a guild
   */
  async getConfig(guildId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT * FROM suggestion_configs
        WHERE guild_id = ${guildId}
        LIMIT 1
      ` as any[];

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('[SuggestionsService] Error fetching config:', error);
      return null;
    }
  }

  /**
   * Update suggestion configuration
   */
  async updateConfig(guildId: string, data: Partial<SuggestionConfigData>) {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (data.channelId !== undefined) {
        updates.push(`channel_id = $${values.length + 1}`);
        values.push(data.channelId);
      }

      if (data.enabled !== undefined) {
        updates.push(`enabled = $${values.length + 1}`);
        values.push(data.enabled);
      }

      if (updates.length === 0) return;

      updates.push('updated_at = NOW()');

      await this.prisma.$executeRawUnsafe(`
        UPDATE suggestion_configs
        SET ${updates.join(', ')}
        WHERE guild_id = $${values.length + 1}
      `, ...values, guildId);

      return this.getConfig(guildId);
    } catch (error) {
      console.error('[SuggestionsService] Error updating config:', error);
      throw error;
    }
  }

  /**
   * Create a new suggestion
   */
  async createSuggestion(data: CreateSuggestionData) {
    try {
      // Get next suggestion number
      const countResult = await this.prisma.$queryRaw`
        SELECT COALESCE(MAX(suggestion_number), 0) + 1 as next_number
        FROM suggestions
        WHERE guild_id = ${data.guildId}
      ` as any[];

      const suggestionNumber = countResult[0].next_number;

      await this.prisma.$executeRaw`
        INSERT INTO suggestions (
          id, guild_id, bot_id, suggestion_number, author_id, content,
          status, upvotes, downvotes, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${data.guildId},
          ${data.botId},
          ${suggestionNumber},
          ${data.authorId},
          ${data.content},
          'pending',
          '[]'::jsonb,
          '[]'::jsonb,
          NOW(),
          NOW()
        )
      `;

      return this.getSuggestionByNumber(data.guildId, suggestionNumber);
    } catch (error) {
      console.error('[SuggestionsService] Error creating suggestion:', error);
      throw error;
    }
  }

  /**
   * Get suggestion by number
   */
  async getSuggestionByNumber(guildId: string, suggestionNumber: number) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT * FROM suggestions
        WHERE guild_id = ${guildId}
          AND suggestion_number = ${suggestionNumber}
        LIMIT 1
      ` as any[];

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('[SuggestionsService] Error fetching suggestion:', error);
      return null;
    }
  }

  /**
   * Get suggestion by ID
   */
  async getSuggestionById(suggestionId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT * FROM suggestions
        WHERE id = ${suggestionId}::uuid
        LIMIT 1
      ` as any[];

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('[SuggestionsService] Error fetching suggestion:', error);
      return null;
    }
  }

  /**
   * Update suggestion
   */
  async updateSuggestion(suggestionId: string, data: UpdateSuggestionData) {
    try {
      const updates: string[] = [];
      const setParts: string[] = [];

      if (data.messageId !== undefined) {
        setParts.push(`message_id = ${data.messageId ? `'${data.messageId}'` : 'NULL'}`);
      }

      if (data.status !== undefined) {
        setParts.push(`status = '${data.status}'`);
      }

      if (data.reviewedBy !== undefined) {
        setParts.push(`reviewed_by = '${data.reviewedBy}'`);
      }

      if (data.reviewedAt !== undefined) {
        const timestamp = data.reviewedAt.toISOString();
        setParts.push(`reviewed_at = '${timestamp}'`);
      }

      if (data.response !== undefined) {
        setParts.push(`response = ${data.response ? `'${data.response.replace(/'/g, "''")}'` : 'NULL'}`);
      }

      if (setParts.length === 0) return;

      setParts.push('updated_at = NOW()');

      await this.prisma.$executeRawUnsafe(`
        UPDATE suggestions
        SET ${setParts.join(', ')}
        WHERE id = '${suggestionId}'::uuid
      `);

      return this.getSuggestionById(suggestionId);
    } catch (error) {
      console.error('[SuggestionsService] Error updating suggestion:', error);
      throw error;
    }
  }

  /**
   * Add upvote to suggestion
   */
  async addUpvote(suggestionId: string, userId: string) {
    try {
      const suggestion = await this.getSuggestionById(suggestionId);
      if (!suggestion) {
        return { success: false, message: 'Suggestion not found' };
      }

      const upvotes = suggestion.upvotes ? JSON.parse(suggestion.upvotes as string) : [];
      const downvotes = suggestion.downvotes ? JSON.parse(suggestion.downvotes as string) : [];

      // Remove from downvotes if present
      const downvoteIndex = downvotes.indexOf(userId);
      if (downvoteIndex > -1) {
        downvotes.splice(downvoteIndex, 1);
      }

      // Check if already upvoted
      if (upvotes.includes(userId)) {
        // Remove upvote
        const index = upvotes.indexOf(userId);
        upvotes.splice(index, 1);
      } else {
        // Add upvote
        upvotes.push(userId);
      }

      await this.prisma.$executeRaw`
        UPDATE suggestions
        SET upvotes = ${JSON.stringify(upvotes)}::jsonb,
            downvotes = ${JSON.stringify(downvotes)}::jsonb,
            updated_at = NOW()
        WHERE id = ${suggestionId}::uuid
      `;

      return {
        success: true,
        upvotes: upvotes.length,
        downvotes: downvotes.length,
      };
    } catch (error) {
      console.error('[SuggestionsService] Error adding upvote:', error);
      throw error;
    }
  }

  /**
   * Add downvote to suggestion
   */
  async addDownvote(suggestionId: string, userId: string) {
    try {
      const suggestion = await this.getSuggestionById(suggestionId);
      if (!suggestion) {
        return { success: false, message: 'Suggestion not found' };
      }

      const upvotes = suggestion.upvotes ? JSON.parse(suggestion.upvotes as string) : [];
      const downvotes = suggestion.downvotes ? JSON.parse(suggestion.downvotes as string) : [];

      // Remove from upvotes if present
      const upvoteIndex = upvotes.indexOf(userId);
      if (upvoteIndex > -1) {
        upvotes.splice(upvoteIndex, 1);
      }

      // Check if already downvoted
      if (downvotes.includes(userId)) {
        // Remove downvote
        const index = downvotes.indexOf(userId);
        downvotes.splice(index, 1);
      } else {
        // Add downvote
        downvotes.push(userId);
      }

      await this.prisma.$executeRaw`
        UPDATE suggestions
        SET upvotes = ${JSON.stringify(upvotes)}::jsonb,
            downvotes = ${JSON.stringify(downvotes)}::jsonb,
            updated_at = NOW()
        WHERE id = ${suggestionId}::uuid
      `;

      return {
        success: true,
        upvotes: upvotes.length,
        downvotes: downvotes.length,
      };
    } catch (error) {
      console.error('[SuggestionsService] Error adding downvote:', error);
      throw error;
    }
  }

  /**
   * Get all suggestions for a guild
   */
  async getGuildSuggestions(guildId: string, status?: string, limit: number = 50) {
    try {
      const result = status
        ? await this.prisma.$queryRaw`
            SELECT * FROM suggestions
            WHERE guild_id = ${guildId}
              AND status = ${status}
            ORDER BY created_at DESC
            LIMIT ${limit}
          ` as any[]
        : await this.prisma.$queryRaw`
            SELECT * FROM suggestions
            WHERE guild_id = ${guildId}
            ORDER BY created_at DESC
            LIMIT ${limit}
          ` as any[];

      return result;
    } catch (error) {
      console.error('[SuggestionsService] Error fetching guild suggestions:', error);
      return [];
    }
  }

  /**
   * Get suggestions by author
   */
  async getUserSuggestions(guildId: string, userId: string, limit: number = 10) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT * FROM suggestions
        WHERE guild_id = ${guildId}
          AND author_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      ` as any[];

      return result;
    } catch (error) {
      console.error('[SuggestionsService] Error fetching user suggestions:', error);
      return [];
    }
  }

  /**
   * Add comment to suggestion
   */
  async addComment(suggestionId: string, authorId: string, content: string) {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO suggestion_comments (
          id, suggestion_id, author_id, content, created_at
        ) VALUES (
          gen_random_uuid(),
          ${suggestionId}::uuid,
          ${authorId},
          ${content},
          NOW()
        )
      `;
    } catch (error) {
      console.error('[SuggestionsService] Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Get comments for a suggestion
   */
  async getComments(suggestionId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT * FROM suggestion_comments
        WHERE suggestion_id = ${suggestionId}::uuid
        ORDER BY created_at ASC
      ` as any[];

      return result;
    } catch (error) {
      console.error('[SuggestionsService] Error fetching comments:', error);
      return [];
    }
  }

  /**
   * Delete suggestion
   */
  async deleteSuggestion(suggestionId: string) {
    try {
      await this.prisma.$executeRaw`
        DELETE FROM suggestions
        WHERE id = ${suggestionId}::uuid
      `;
    } catch (error) {
      console.error('[SuggestionsService] Error deleting suggestion:', error);
      throw error;
    }
  }
}
