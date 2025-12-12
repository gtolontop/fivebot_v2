/**
 * Polls Handler
 * Handles button interactions for poll voting
 */

import {
  Client,
  Interaction,
  ButtonInteraction,
} from 'discord.js';
import { PollsService } from '../services/polls.service';

export class PollsHandler {
  private pollsService: PollsService;

  constructor(private client: Client) {
    this.pollsService = new PollsService();
  }

  /**
   * Main interaction handler
   */
  async handleInteraction(interaction: Interaction): Promise<void> {
    try {
      if (!interaction.isButton()) return;

      const [namespace, action, ...args] = interaction.customId.split(':');

      if (namespace !== 'poll') return;

      switch (action) {
        case 'vote':
          await this.handleVoteButton(interaction, args);
          break;
      }
    } catch (error) {
      console.error('[PollsHandler] Error handling interaction:', error);

      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while processing your request.',
          ephemeral: true,
        });
      }
    }
  }

  /**
   * Handle poll vote button
   */
  private async handleVoteButton(interaction: ButtonInteraction, args: string[]): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.guildId || !interaction.guild) {
      await interaction.editReply({
        content: '❌ This command can only be used in a server.',
      });
      return;
    }

    try {
      const optionIndex = parseInt(args[0]);

      if (isNaN(optionIndex)) {
        await interaction.editReply({
          content: '❌ Invalid poll option.',
        });
        return;
      }

      // Get the poll
      const poll = await this.pollsService.getPollByMessageId(interaction.message.id);

      if (!poll) {
        await interaction.editReply({
          content: '❌ Poll not found.',
        });
        return;
      }

      if (poll.ended) {
        await interaction.editReply({
          content: '❌ This poll has already ended.',
        });
        return;
      }

      // Check if poll has ended (by time)
      if (poll.endTime && new Date() >= new Date(poll.endTime)) {
        await this.pollsService.endPoll(poll.id);
        await this.pollsService.updatePollMessage(poll, this.client);
        await interaction.editReply({
          content: '❌ This poll has ended.',
        });
        return;
      }

      // Vote
      const result = await this.pollsService.vote(
        poll.id,
        interaction.user.id,
        optionIndex
      );

      if (!result.success) {
        await interaction.editReply({
          content: `❌ ${result.message}`,
        });
        return;
      }

      await interaction.editReply({
        content: `✅ ${result.message}`,
      });

      // Update the poll message to show new results
      // Fetch the updated poll
      const updatedPoll = await this.pollsService.getPollByMessageId(interaction.message.id);
      if (updatedPoll) {
        await this.pollsService.updatePollMessage(updatedPoll, this.client);
      }

    } catch (error: any) {
      console.error('[PollsHandler] Error voting:', error);
      await interaction.editReply({
        content: `❌ Failed to vote: ${error.message}`,
      });
    }
  }

  /**
   * Start monitoring active polls for auto-end
   */
  async startPollMonitor(): Promise<void> {
    try {
      console.log('[PollsHandler] Starting poll monitor...');

      // Check every minute for polls that need to end
      setInterval(async () => {
        try {
          const prisma = (this.pollsService as any).prisma;
          const now = new Date();

          // Find polls that should have ended
          const endedPolls = await prisma.$queryRaw`
            SELECT * FROM polls
            WHERE ended = false
              AND end_time IS NOT NULL
              AND end_time <= ${now}
          ` as any[];

          for (const poll of endedPolls) {
            console.log(`[PollsHandler] Auto-ending poll: ${poll.id}`);
            await this.pollsService.endPoll(poll.id);
            await this.pollsService.updatePollMessage(poll, this.client);
          }
        } catch (error) {
          console.error('[PollsHandler] Error in poll monitor:', error);
        }
      }, 60000); // Check every minute

    } catch (error) {
      console.error('[PollsHandler] Error starting poll monitor:', error);
    }
  }
}
