/**
 * /poll-end command
 * End a poll early
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { PollsService } from '../../services/polls.service';

export const data = new SlashCommandBuilder()
  .setName('poll-end')
  .setDescription('End a poll early')
  .addStringOption(option =>
    option
      .setName('message-id')
      .setDescription('The message ID of the poll')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId || !interaction.guild) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  try {
    const messageId = interaction.options.getString('message-id', true);

    const pollsService = new PollsService();
    const poll = await pollsService.getPollByMessageId(messageId);

    if (!poll) {
      await interaction.editReply({
        content: '❌ Poll not found. Make sure the message ID is correct.',
      });
      return;
    }

    if (poll.guildId !== interaction.guildId) {
      await interaction.editReply({
        content: '❌ This poll is not from this server.',
      });
      return;
    }

    if (poll.ended) {
      await interaction.editReply({
        content: '❌ This poll has already ended.',
      });
      return;
    }

    // Check if user is the creator or has manage messages permission
    const member = interaction.member;
    if (
      poll.creatorId !== interaction.user.id &&
      member &&
      'permissions' in member &&
      !member.permissions.has(PermissionFlagsBits.ManageMessages)
    ) {
      await interaction.editReply({
        content: '❌ You must be the poll creator or have Manage Messages permission to end this poll.',
      });
      return;
    }

    // End the poll
    await pollsService.endPoll(poll.id);
    await pollsService.updatePollMessage(poll, interaction.client);

    await interaction.editReply({
      content: '✅ Poll ended successfully!',
    });

  } catch (error: any) {
    console.error('[Poll-End] Error ending poll:', error);
    await interaction.editReply({
      content: `❌ Failed to end poll: ${error.message}`,
    });
  }
}
