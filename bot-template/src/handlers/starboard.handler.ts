/**
 * Starboard Handler
 * Handles reaction events for the starboard system
 */

import {
  Client,
  MessageReaction,
  User,
  PartialMessageReaction,
  PartialUser,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import { StarboardService } from '../services/starboard.service';

export class StarboardHandler {
  private starboardService: StarboardService;

  constructor(private client: Client) {
    this.starboardService = new StarboardService();
  }

  /**
   * Handle reaction add event
   */
  async handleReactionAdd(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ): Promise<void> {
    try {
      // Ignore bot reactions
      if (user.bot) return;

      // Fetch partial data if needed
      if (reaction.partial) {
        try {
          await reaction.fetch();
        } catch (error) {
          console.error('[StarboardHandler] Failed to fetch reaction:', error);
          return;
        }
      }

      if (reaction.message.partial) {
        try {
          await reaction.message.fetch();
        } catch (error) {
          console.error('[StarboardHandler] Failed to fetch message:', error);
          return;
        }
      }

      const message = reaction.message;
      if (!message.guild || !message.guildId) return;

      // Get starboard config
      const config = await this.starboardService.getConfig(message.guildId);
      if (!config || !config.enabled) return;

      // Check if this is the starboard emoji
      const emojiMatch = this.matchEmoji(reaction.emoji.toString(), config.emoji);
      if (!emojiMatch) return;

      // Don't allow starring messages in the starboard channel
      if (message.channelId === config.channelId) return;

      // Create entry if it doesn't exist
      let entry = await this.starboardService.getEntry(message.guildId, message.id);
      if (!entry) {
        const botId = process.env.BOT_ID || this.client.user!.id;
        entry = await this.starboardService.createEntry({
          guildId: message.guildId,
          botId,
          messageId: message.id,
          channelId: message.channelId,
          authorId: message.author!.id,
          starCount: 0,
        });
      }

      // Add star
      const result = await this.starboardService.addStar(
        message.guildId,
        message.id,
        user.id
      );

      if (!result.success) return;

      // Check if message should be on starboard
      const shouldBeOnStarboard = await this.starboardService.checkThreshold(
        message.guildId,
        message.id
      );

      if (shouldBeOnStarboard) {
        await this.updateOrCreateStarboardPost(message, result.starCount, config, entry);
      }
    } catch (error) {
      console.error('[StarboardHandler] Error handling reaction add:', error);
    }
  }

  /**
   * Handle reaction remove event
   */
  async handleReactionRemove(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ): Promise<void> {
    try {
      // Ignore bot reactions
      if (user.bot) return;

      // Fetch partial data if needed
      if (reaction.partial) {
        try {
          await reaction.fetch();
        } catch (error) {
          console.error('[StarboardHandler] Failed to fetch reaction:', error);
          return;
        }
      }

      if (reaction.message.partial) {
        try {
          await reaction.message.fetch();
        } catch (error) {
          console.error('[StarboardHandler] Failed to fetch message:', error);
          return;
        }
      }

      const message = reaction.message;
      if (!message.guild || !message.guildId) return;

      // Get starboard config
      const config = await this.starboardService.getConfig(message.guildId);
      if (!config || !config.enabled) return;

      // Check if this is the starboard emoji
      const emojiMatch = this.matchEmoji(reaction.emoji.toString(), config.emoji);
      if (!emojiMatch) return;

      // Remove star
      const result = await this.starboardService.removeStar(
        message.guildId,
        message.id,
        user.id
      );

      if (!result.success) return;

      // Update or remove starboard post
      const entry = await this.starboardService.getEntry(message.guildId, message.id);
      if (!entry) return;

      if (result.starCount < config.threshold) {
        // Remove from starboard
        await this.removeStarboardPost(message.guildId, config.channelId, entry);
      } else {
        // Update starboard post
        await this.updateOrCreateStarboardPost(message, result.starCount, config, entry);
      }
    } catch (error) {
      console.error('[StarboardHandler] Error handling reaction remove:', error);
    }
  }

  /**
   * Update or create a starboard post
   */
  private async updateOrCreateStarboardPost(
    message: any,
    starCount: number,
    config: any,
    entry: any
  ): Promise<void> {
    try {
      const starboardChannel = await this.client.channels.fetch(
        config.channelId
      ) as TextChannel;

      if (!starboardChannel) return;

      // Build embed
      const embed = this.buildStarboardEmbed(message, starCount, config.emoji);

      if (entry.starboardMessageId) {
        // Update existing starboard post
        try {
          const starboardMessage = await starboardChannel.messages.fetch(
            entry.starboardMessageId
          );
          await starboardMessage.edit({ embeds: [embed] });
        } catch (error) {
          // Message might have been deleted, create a new one
          const newMessage = await starboardChannel.send({ embeds: [embed] });
          await this.starboardService.createStarboardEntry(
            message.guildId,
            message.id,
            starCount,
            newMessage.id
          );
        }
      } else {
        // Create new starboard post
        const starboardMessage = await starboardChannel.send({ embeds: [embed] });
        await this.starboardService.createStarboardEntry(
          message.guildId,
          message.id,
          starCount,
          starboardMessage.id
        );
      }
    } catch (error) {
      console.error('[StarboardHandler] Error updating/creating starboard post:', error);
    }
  }

  /**
   * Remove a starboard post
   */
  private async removeStarboardPost(
    guildId: string,
    channelId: string,
    entry: any
  ): Promise<void> {
    try {
      if (!entry.starboardMessageId) return;

      const starboardChannel = await this.client.channels.fetch(channelId) as TextChannel;
      if (!starboardChannel) return;

      try {
        const starboardMessage = await starboardChannel.messages.fetch(
          entry.starboardMessageId
        );
        await starboardMessage.delete();
      } catch (error) {
        console.log('[StarboardHandler] Starboard message already deleted');
      }

      // Update entry to remove starboard message ID
      await this.starboardService.createStarboardEntry(
        guildId,
        entry.messageId,
        entry.starCount,
        undefined
      );
    } catch (error) {
      console.error('[StarboardHandler] Error removing starboard post:', error);
    }
  }

  /**
   * Build starboard embed
   */
  private buildStarboardEmbed(message: any, starCount: number, emoji: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setAuthor({
        name: message.author!.tag,
        iconURL: message.author!.displayAvatarURL(),
      })
      .setDescription(
        `${message.content || '*[No content - possibly an embed or attachment]*'}\n\n` +
        `[Jump to Message](https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id})`
      )
      .addFields({
        name: 'Channel',
        value: `<#${message.channelId}>`,
        inline: true,
      })
      .setFooter({ text: `${emoji} ${starCount} | Message ID: ${message.id}` })
      .setTimestamp(message.createdTimestamp);

    // Add image if present
    if (message.attachments.size > 0) {
      const attachment = message.attachments.first();
      if (attachment && attachment.contentType?.startsWith('image/')) {
        embed.setImage(attachment.url);
      }
    }

    // Add embed image if present
    if (message.embeds.length > 0) {
      const messageEmbed = message.embeds[0];
      if (messageEmbed.image) {
        embed.setImage(messageEmbed.image.url);
      } else if (messageEmbed.thumbnail) {
        embed.setThumbnail(messageEmbed.thumbnail.url);
      }
    }

    return embed;
  }

  /**
   * Match emoji with config emoji
   */
  private matchEmoji(reactionEmoji: string, configEmoji: string): boolean {
    // Clean up emoji strings for comparison
    const cleanReaction = reactionEmoji.trim();
    const cleanConfig = configEmoji.trim();

    return cleanReaction === cleanConfig;
  }
}
