/**
 * /poll-results command
 * Show detailed poll results
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';
import { PollsService } from '../../services/polls.service';

export const data = new SlashCommandBuilder()
  .setName('poll-results')
  .setDescription('Show detailed poll results')
  .addStringOption(option =>
    option
      .setName('message-id')
      .setDescription('The message ID of the poll')
      .setRequired(true)
  );

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
    const data = await pollsService.getResults(messageId);

    if (!data) {
      await interaction.editReply({
        content: '❌ Poll not found. Make sure the message ID is correct.',
      });
      return;
    }

    const { poll, results, totalVotes } = data;

    if (poll.guildId !== interaction.guildId) {
      await interaction.editReply({
        content: '❌ This poll is not from this server.',
      });
      return;
    }

    // Sort results by votes (descending)
    const sortedResults = [...results].sort((a, b) => b.votes - a.votes);

    // Create detailed results text
    let resultsText = '';
    sortedResults.forEach((result, index) => {
      const percentage = totalVotes > 0 ? ((result.votes / totalVotes) * 100).toFixed(1) : '0.0';
      const barLength = Math.round((result.votes / Math.max(totalVotes, 1)) * 20);
      const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);

      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '▫️';

      resultsText += `\n\n${medal} **${result.option}**\n${bar} ${percentage}% (${result.votes} ${result.votes === 1 ? 'vote' : 'votes'})`;

      // Show voter list if there are votes and not too many
      if (result.votes > 0 && result.votes <= 10) {
        const voters = result.voters.map((id: string) => `<@${id}>`).join(', ');
        resultsText += `\n*Voters: ${voters}*`;
      } else if (result.votes > 10) {
        resultsText += `\n*${result.votes} voters*`;
      }
    });

    const embed = new EmbedBuilder()
      .setColor(poll.ended ? 0x808080 : 0x5865F2)
      .setTitle(`📊 ${poll.question}`)
      .setDescription(resultsText || 'No votes yet.')
      .addFields(
        {
          name: '📈 Statistics',
          value: `**Total Votes:** ${totalVotes}\n**Options:** ${results.length}\n**Status:** ${poll.ended ? '✅ Ended' : '🟢 Active'}${poll.allowMultiple ? '\n**Type:** Multiple choice' : '\n**Type:** Single choice'}`,
          inline: false,
        }
      )
      .setFooter({
        text: `Poll by ${poll.creatorId} • Created`,
      })
      .setTimestamp(new Date(poll.createdAt));

    if (poll.endTime && !poll.ended) {
      embed.addFields({
        name: '⏰ Ends',
        value: `<t:${Math.floor(new Date(poll.endTime).getTime() / 1000)}:R>`,
        inline: true,
      });
    } else if (poll.ended) {
      embed.addFields({
        name: '🏁 Ended',
        value: `<t:${Math.floor(new Date(poll.updatedAt).getTime() / 1000)}:R>`,
        inline: true,
      });
    }

    await interaction.editReply({
      embeds: [embed],
    });

  } catch (error: any) {
    console.error('[Poll-Results] Error getting poll results:', error);
    await interaction.editReply({
      content: `❌ Failed to get poll results: ${error.message}`,
    });
  }
}
