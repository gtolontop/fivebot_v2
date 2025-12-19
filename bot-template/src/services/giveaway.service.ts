/**
 * Giveaway Service
 * Handles all giveaway-related operations
 */

import { Client, EmbedBuilder, TextChannel, User } from 'discord.js';
import { getPrismaClient } from './prisma-singleton.service';

interface GiveawayRequirements {
  roleId?: string;
  level?: number;
  messages?: number;
}

interface BonusEntries {
  roleId: string;
  multiplier: number;
}

interface CreateGiveawayData {
  messageId: string;
  channelId: string;
  prize: string;
  winnersCount: number;
  hostId: string;
  endTime: Date;
  requirements?: GiveawayRequirements;
  bonusEntries?: BonusEntries;
}

export class GiveawayService {
  private prisma = getPrismaClient();

  /**
   * Create a new giveaway
   */
  async createGiveaway(guildId: string, botId: string, data: CreateGiveawayData) {
    try {
      const giveaway = await this.prisma.$executeRaw`
        INSERT INTO giveaways (
          id, guild_id, bot_id, message_id, channel_id, prize,
          winners_count, host_id, end_time, entries, winners,
          requirements, bonus_entries, ended, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${guildId},
          ${botId},
          ${data.messageId},
          ${data.channelId},
          ${data.prize},
          ${data.winnersCount},
          ${data.hostId},
          ${data.endTime},
          '[]'::jsonb,
          '[]'::jsonb,
          ${data.requirements ? JSON.stringify(data.requirements) : null}::jsonb,
          ${data.bonusEntries ? JSON.stringify(data.bonusEntries) : null}::jsonb,
          false,
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      // Fetch the created giveaway
      const created = await this.prisma.$queryRaw`
        SELECT * FROM giveaways WHERE message_id = ${data.messageId} LIMIT 1
      ` as any[];

      return created[0];
    } catch (error) {
      console.error('[GiveawayService] Error creating giveaway:', error);
      throw error;
    }
  }

  /**
   * Enter a user into a giveaway
   */
  async enterGiveaway(giveawayId: string, userId: string, multiplier: number = 1) {
    try {
      // Get current entries
      const giveaway = await this.prisma.$queryRaw`
        SELECT entries FROM giveaways WHERE id = ${giveawayId}::uuid LIMIT 1
      ` as any[];

      if (!giveaway || giveaway.length === 0) {
        throw new Error('Giveaway not found');
      }

      const entries = giveaway[0].entries ? JSON.parse(giveaway[0].entries) : [];

      // Check if user already entered
      const alreadyEntered = entries.includes(userId);
      if (alreadyEntered) {
        return { success: false, message: 'You have already entered this giveaway!' };
      }

      // Add entries based on multiplier
      for (let i = 0; i < multiplier; i++) {
        entries.push(userId);
      }

      // Update database
      await this.prisma.$executeRaw`
        UPDATE giveaways
        SET entries = ${JSON.stringify(entries)}::jsonb,
            updated_at = NOW()
        WHERE id = ${giveawayId}::uuid
      `;

      return {
        success: true,
        message: multiplier > 1
          ? `You entered with ${multiplier} entries!`
          : 'You entered the giveaway!',
        totalEntries: entries.length,
      };
    } catch (error) {
      console.error('[GiveawayService] Error entering giveaway:', error);
      throw error;
    }
  }

  /**
   * End a giveaway and pick winners
   */
  async endGiveaway(giveawayId: string, client: Client) {
    try {
      const giveaway = await this.prisma.$queryRaw`
        SELECT * FROM giveaways WHERE id = ${giveawayId}::uuid LIMIT 1
      ` as any[];

      if (!giveaway || giveaway.length === 0) {
        throw new Error('Giveaway not found');
      }

      const g = giveaway[0];

      if (g.ended) {
        throw new Error('Giveaway already ended');
      }

      // Pick winners
      const winners = await this.pickWinners(giveawayId, g.winnersCount);

      // Mark as ended
      await this.prisma.$executeRaw`
        UPDATE giveaways
        SET ended = true,
            winners = ${JSON.stringify(winners)}::jsonb,
            updated_at = NOW()
        WHERE id = ${giveawayId}::uuid
      `;

      // Update message and notify winners
      await this.announceWinners(g, winners, client);

      return winners;
    } catch (error) {
      console.error('[GiveawayService] Error ending giveaway:', error);
      throw error;
    }
  }

  /**
   * Reroll giveaway winners
   */
  async rerollGiveaway(giveawayId: string, count: number, client: Client) {
    try {
      const giveaway = await this.prisma.$queryRaw`
        SELECT * FROM giveaways WHERE id = ${giveawayId}::uuid LIMIT 1
      ` as any[];

      if (!giveaway || giveaway.length === 0) {
        throw new Error('Giveaway not found');
      }

      const g = giveaway[0];

      if (!g.ended) {
        throw new Error('Giveaway has not ended yet');
      }

      // Get previous winners to exclude them
      const previousWinners = g.winners ? JSON.parse(g.winners) : [];

      // Pick new winners
      const newWinners = await this.pickWinners(giveawayId, count, previousWinners);

      if (newWinners.length === 0) {
        throw new Error('No valid participants left to reroll');
      }

      // Update winners
      await this.prisma.$executeRaw`
        UPDATE giveaways
        SET winners = ${JSON.stringify(newWinners)}::jsonb,
            updated_at = NOW()
        WHERE id = ${giveawayId}::uuid
      `;

      // Announce reroll
      await this.announceReroll(g, newWinners, client);

      return newWinners;
    } catch (error) {
      console.error('[GiveawayService] Error rerolling giveaway:', error);
      throw error;
    }
  }

  /**
   * Pick random winners from entries
   */
  async pickWinners(giveawayId: string, count: number, exclude: string[] = []): Promise<string[]> {
    try {
      const giveaway = await this.prisma.$queryRaw`
        SELECT entries FROM giveaways WHERE id = ${giveawayId}::uuid LIMIT 1
      ` as any[];

      if (!giveaway || giveaway.length === 0) {
        return [];
      }

      const entries = giveaway[0].entries ? JSON.parse(giveaway[0].entries) : [];

      // Remove excluded users
      const validEntries = entries.filter((userId: string) => !exclude.includes(userId));

      if (validEntries.length === 0) {
        return [];
      }

      // Get unique users (since they might have multiple entries)
      const uniqueUsers = [...new Set(validEntries)];

      // Shuffle and pick winners
      const shuffled = uniqueUsers.sort(() => Math.random() - 0.5);
      const winners = shuffled.slice(0, Math.min(count, shuffled.length)) as string[];

      return winners;
    } catch (error) {
      console.error('[GiveawayService] Error picking winners:', error);
      return [];
    }
  }

  /**
   * Cancel a giveaway
   */
  async cancelGiveaway(giveawayId: string) {
    try {
      await this.prisma.$executeRaw`
        UPDATE giveaways
        SET ended = true,
            updated_at = NOW()
        WHERE id = ${giveawayId}::uuid
      `;
    } catch (error) {
      console.error('[GiveawayService] Error cancelling giveaway:', error);
      throw error;
    }
  }

  /**
   * Get giveaway by message ID
   */
  async getGiveawayByMessageId(messageId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT * FROM giveaways WHERE message_id = ${messageId} LIMIT 1
      ` as any[];

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('[GiveawayService] Error fetching giveaway:', error);
      return null;
    }
  }

  /**
   * Get active giveaways in a guild
   */
  async getActiveGiveaways(guildId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT * FROM giveaways
        WHERE guild_id = ${guildId}
          AND ended = false
        ORDER BY end_time ASC
      ` as any[];

      return result;
    } catch (error) {
      console.error('[GiveawayService] Error fetching active giveaways:', error);
      return [];
    }
  }

  /**
   * Announce winners
   */
  private async announceWinners(giveaway: any, winners: string[], client: Client) {
    try {
      const channel = await client.channels.fetch(giveaway.channelId) as TextChannel;
      const message = await channel.messages.fetch(giveaway.messageId);

      const entries = giveaway.entries ? JSON.parse(giveaway.entries) : [];
      const uniqueEntries = [...new Set(entries)].length;

      // Update giveaway message
      const endedEmbed = new EmbedBuilder()
        .setColor(0x808080)
        .setTitle(`🏁 ${giveaway.prize}`)
        .setDescription(
          `**Giveaway Ended!**\n\n` +
          (winners.length > 0
            ? `**Winners:** ${winners.map(w => `<@${w}>`).join(', ')}`
            : '**No valid entries**')
        )
        .setFooter({ text: `${uniqueEntries} participants` })
        .setTimestamp();

      await message.edit({
        embeds: [endedEmbed],
        components: [],
      });

      // Announce in channel
      if (winners.length > 0) {
        await channel.send({
          content: `🎉 Congratulations ${winners.map(w => `<@${w}>`).join(', ')}! You won **${giveaway.prize}**!`,
        });

        // DM winners
        for (const winnerId of winners) {
          try {
            const user = await client.users.fetch(winnerId);
            await user.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(0x00ff00)
                  .setTitle('🎉 Congratulations!')
                  .setDescription(
                    `You won the giveaway for **${giveaway.prize}**!\n\n` +
                    `[Jump to Giveaway](https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId})`
                  )
                  .setTimestamp(),
              ],
            });
          } catch (error) {
            console.log(`[GiveawayService] Could not DM winner ${winnerId}`);
          }
        }
      } else {
        await channel.send({
          content: `😔 The giveaway for **${giveaway.prize}** ended with no valid entries.`,
        });
      }
    } catch (error) {
      console.error('[GiveawayService] Error announcing winners:', error);
    }
  }

  /**
   * Announce reroll
   */
  private async announceReroll(giveaway: any, winners: string[], client: Client) {
    try {
      const channel = await client.channels.fetch(giveaway.channelId) as TextChannel;

      await channel.send({
        content: `🔄 **Giveaway Rerolled!**\n🎉 New winner(s): ${winners.map(w => `<@${w}>`).join(', ')} won **${giveaway.prize}**!`,
      });

      // DM new winners
      for (const winnerId of winners) {
        try {
          const user = await client.users.fetch(winnerId);
          await user.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('🎉 Congratulations!')
                .setDescription(
                  `You won the rerolled giveaway for **${giveaway.prize}**!\n\n` +
                  `[Jump to Giveaway](https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId})`
                )
                .setTimestamp(),
            ],
          });
        } catch (error) {
          console.log(`[GiveawayService] Could not DM reroll winner ${winnerId}`);
        }
      }
    } catch (error) {
      console.error('[GiveawayService] Error announcing reroll:', error);
    }
  }

  /**
   * Update giveaway message entry count
   */
  async updateGiveawayMessage(giveaway: any, client: Client) {
    try {
      const channel = await client.channels.fetch(giveaway.channelId) as TextChannel;
      const message = await channel.messages.fetch(giveaway.messageId);

      const entries = giveaway.entries ? JSON.parse(giveaway.entries) : [];
      const uniqueEntries = [...new Set(entries)].length;

      const embed = message.embeds[0];
      if (embed) {
        const updatedEmbed = EmbedBuilder.from(embed)
          .setFooter({ text: `${uniqueEntries} entries` });

        await message.edit({ embeds: [updatedEmbed] });
      }
    } catch (error) {
      console.error('[GiveawayService] Error updating giveaway message:', error);
    }
  }
}
