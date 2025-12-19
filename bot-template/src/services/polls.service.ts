/**
 * Polls Service
 * Handles all poll-related operations
 */

import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { getPrismaClient } from './prisma-singleton.service';

interface CreatePollData {
  messageId: string;
  channelId: string;
  creatorId: string;
  question: string;
  options: string[];
  duration?: number; // milliseconds
  allowMultiple?: boolean;
}

export class PollsService {
  private prisma = getPrismaClient();

  /**
   * Create a new poll
   */
  async createPoll(guildId: string, botId: string, data: CreatePollData) {
    try {
      const endTime = data.duration ? new Date(Date.now() + data.duration) : null;

      await this.prisma.$executeRaw`
        INSERT INTO polls (
          id, guild_id, bot_id, message_id, channel_id, creator_id,
          question, options, votes, duration, end_time, ended,
          allow_multiple, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${guildId},
          ${botId},
          ${data.messageId},
          ${data.channelId},
          ${data.creatorId},
          ${data.question},
          ${JSON.stringify(data.options)}::jsonb,
          '{}'::jsonb,
          ${data.duration || null},
          ${endTime},
          false,
          ${data.allowMultiple || false},
          NOW(),
          NOW()
        )
      `;

      // Fetch the created poll
      const created = await this.prisma.$queryRaw`
        SELECT * FROM polls WHERE message_id = ${data.messageId} LIMIT 1
      ` as any[];

      return created[0];
    } catch (error) {
      console.error('[PollsService] Error creating poll:', error);
      throw error;
    }
  }

  /**
   * Vote on a poll
   */
  async vote(pollId: string, userId: string, optionIndex: number) {
    try {
      // Get current poll
      const poll = await this.prisma.$queryRaw`
        SELECT * FROM polls WHERE id = ${pollId}::uuid LIMIT 1
      ` as any[];

      if (!poll || poll.length === 0) {
        throw new Error('Poll not found');
      }

      const pollData = poll[0];

      if (pollData.ended) {
        return { success: false, message: 'This poll has ended.' };
      }

      // Check if poll has expired
      if (pollData.endTime && new Date() >= new Date(pollData.endTime)) {
        await this.endPoll(pollId);
        return { success: false, message: 'This poll has ended.' };
      }

      const votes = pollData.votes ? JSON.parse(pollData.votes) : {};
      const options = JSON.parse(pollData.options);

      // Validate option index
      if (optionIndex < 0 || optionIndex >= options.length) {
        return { success: false, message: 'Invalid option.' };
      }

      // Check if user already voted
      const hasVoted = Object.values(votes).some((voters: any) =>
        Array.isArray(voters) && voters.includes(userId)
      );

      if (hasVoted && !pollData.allowMultiple) {
        // Remove previous vote if not allowing multiple
        for (const key in votes) {
          if (Array.isArray(votes[key])) {
            votes[key] = votes[key].filter((id: string) => id !== userId);
          }
        }
      }

      // Check if user already voted for this specific option
      if (!votes[optionIndex]) {
        votes[optionIndex] = [];
      }

      if (votes[optionIndex].includes(userId)) {
        return { success: false, message: 'You already voted for this option!' };
      }

      // Add vote
      votes[optionIndex].push(userId);

      // Update database
      await this.prisma.$executeRaw`
        UPDATE polls
        SET votes = ${JSON.stringify(votes)}::jsonb,
            updated_at = NOW()
        WHERE id = ${pollId}::uuid
      `;

      return {
        success: true,
        message: 'Vote recorded!',
        totalVotes: Object.values(votes).reduce((sum: number, voters: any) =>
          sum + (Array.isArray(voters) ? voters.length : 0), 0
        ),
      };
    } catch (error) {
      console.error('[PollsService] Error voting:', error);
      throw error;
    }
  }

  /**
   * End a poll
   */
  async endPoll(pollId: string) {
    try {
      await this.prisma.$executeRaw`
        UPDATE polls
        SET ended = true,
            updated_at = NOW()
        WHERE id = ${pollId}::uuid
      `;
    } catch (error) {
      console.error('[PollsService] Error ending poll:', error);
      throw error;
    }
  }

  /**
   * Get poll results
   */
  async getResults(pollId: string) {
    try {
      const poll = await this.prisma.$queryRaw`
        SELECT * FROM polls WHERE id = ${pollId}::uuid LIMIT 1
      ` as any[];

      if (!poll || poll.length === 0) {
        return null;
      }

      const pollData = poll[0];
      const options = JSON.parse(pollData.options);
      const votes = pollData.votes ? JSON.parse(pollData.votes) : {};

      // Calculate results
      const results = options.map((option: string, index: number) => {
        const voteCount = votes[index] ? votes[index].length : 0;
        return {
          option,
          votes: voteCount,
          voters: votes[index] || [],
        };
      });

      const totalVotes = results.reduce((sum: number, r: { votes: number }) => sum + r.votes, 0);

      return {
        poll: pollData,
        results,
        totalVotes,
      };
    } catch (error) {
      console.error('[PollsService] Error getting results:', error);
      return null;
    }
  }

  /**
   * Get poll by message ID
   */
  async getPollByMessageId(messageId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT * FROM polls WHERE message_id = ${messageId} LIMIT 1
      ` as any[];

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('[PollsService] Error fetching poll:', error);
      return null;
    }
  }

  /**
   * Update poll message with current results
   */
  async updatePollMessage(poll: any, client: Client) {
    try {
      const channel = await client.channels.fetch(poll.channelId) as TextChannel;
      const message = await channel.messages.fetch(poll.messageId);

      const options = JSON.parse(poll.options);
      const votes = poll.votes ? JSON.parse(poll.votes) : {};
      const totalVotes = Object.values(votes).reduce((sum: number, voters: any) =>
        sum + (Array.isArray(voters) ? voters.length : 0), 0
      );

      // Create results visualization
      let resultsText = '';
      options.forEach((option: string, index: number) => {
        const voteCount = votes[index] ? votes[index].length : 0;
        const percentage = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(1) : '0.0';
        const barLength = Math.round((voteCount / Math.max(totalVotes, 1)) * 20);
        const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);

        resultsText += `\n\n**${index + 1}. ${option}**\n${bar} ${percentage}% (${voteCount} ${voteCount === 1 ? 'vote' : 'votes'})`;
      });

      const embed = new EmbedBuilder()
        .setColor(poll.ended ? 0x808080 : 0x5865F2)
        .setTitle(`📊 ${poll.question}`)
        .setDescription(resultsText || 'No votes yet.')
        .setFooter({
          text: poll.ended
            ? `Poll ended • ${totalVotes} total ${totalVotes === 1 ? 'vote' : 'votes'}`
            : `${totalVotes} total ${totalVotes === 1 ? 'vote' : 'votes'}${poll.allowMultiple ? ' • Multiple votes allowed' : ''}`
        })
        .setTimestamp(poll.ended ? new Date(poll.updatedAt) : (poll.endTime ? new Date(poll.endTime) : undefined));

      if (poll.endTime && !poll.ended) {
        embed.addFields({
          name: '⏰ Ends',
          value: `<t:${Math.floor(new Date(poll.endTime).getTime() / 1000)}:R>`,
          inline: false,
        });
      }

      await message.edit({
        embeds: [embed],
        components: poll.ended ? [] : message.components,
      });
    } catch (error) {
      console.error('[PollsService] Error updating poll message:', error);
    }
  }

  /**
   * Get active polls in a guild
   */
  async getActivePolls(guildId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT * FROM polls
        WHERE guild_id = ${guildId}
          AND ended = false
        ORDER BY created_at DESC
      ` as any[];

      return result;
    } catch (error) {
      console.error('[PollsService] Error fetching active polls:', error);
      return [];
    }
  }
}
