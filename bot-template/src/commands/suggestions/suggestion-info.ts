/**
 * /suggestion info command
 * View detailed information about a suggestion
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';
import { SuggestionsService } from '../../services/suggestions.service';

export const data = new SlashCommandBuilder()
  .setName('suggestion')
  .setDescription('Manage suggestions')
  .addSubcommand(subcommand =>
    subcommand
      .setName('info')
      .setDescription('View details about a suggestion')
      .addIntegerOption(option =>
        option
          .setName('id')
          .setDescription('The suggestion number')
          .setRequired(true)
          .setMinValue(1)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (interaction.options.getSubcommand() !== 'info') return;

  await interaction.deferReply();

  if (!interaction.guildId || !interaction.guild) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  try {
    const suggestionNumber = interaction.options.getInteger('id', true);
    const suggestionsService = new SuggestionsService();

    // Get the suggestion
    const suggestion = await suggestionsService.getSuggestionByNumber(
      interaction.guildId,
      suggestionNumber
    );

    if (!suggestion) {
      await interaction.editReply({
        content: `❌ Suggestion #${suggestionNumber} not found.`,
      });
      return;
    }

    // Get votes
    const upvotes = suggestion.upvotes ? JSON.parse(suggestion.upvotes as string) : [];
    const downvotes = suggestion.downvotes ? JSON.parse(suggestion.downvotes as string) : [];

    // Determine status color and emoji
    let color = 0x5865F2;
    let statusEmoji = '🔵';
    let statusText = 'Pending';

    switch (suggestion.status) {
      case 'approved':
        color = 0x00FF00;
        statusEmoji = '✅';
        statusText = 'Approved';
        break;
      case 'denied':
        color = 0xFF0000;
        statusEmoji = '❌';
        statusText = 'Denied';
        break;
      case 'implemented':
        color = 0x00FFFF;
        statusEmoji = '🎉';
        statusText = 'Implemented';
        break;
    }

    // Fetch author
    let authorTag = 'Unknown User';
    try {
      const author = await interaction.client.users.fetch(suggestion.authorId);
      authorTag = author.tag;
    } catch (error) {
      console.log('[Suggestion Info] Could not fetch author');
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`💡 Suggestion #${suggestionNumber}`)
      .setDescription(suggestion.content)
      .addFields(
        {
          name: 'Author',
          value: `<@${suggestion.authorId}> (${authorTag})`,
          inline: true,
        },
        {
          name: 'Status',
          value: `${statusEmoji} ${statusText}`,
          inline: true,
        },
        {
          name: 'Created',
          value: `<t:${Math.floor(new Date(suggestion.createdAt).getTime() / 1000)}:R>`,
          inline: true,
        },
        {
          name: '👍 Upvotes',
          value: `${upvotes.length}`,
          inline: true,
        },
        {
          name: '👎 Downvotes',
          value: `${downvotes.length}`,
          inline: true,
        },
        {
          name: 'Score',
          value: `${upvotes.length - downvotes.length}`,
          inline: true,
        }
      );

    // Add reviewer info if reviewed
    if (suggestion.reviewedBy) {
      try {
        const reviewer = await interaction.client.users.fetch(suggestion.reviewedBy);
        embed.addFields({
          name: 'Reviewed By',
          value: `${reviewer.tag}`,
          inline: true,
        });
      } catch (error) {
        console.log('[Suggestion Info] Could not fetch reviewer');
      }

      if (suggestion.reviewedAt) {
        embed.addFields({
          name: 'Reviewed At',
          value: `<t:${Math.floor(new Date(suggestion.reviewedAt).getTime() / 1000)}:R>`,
          inline: true,
        });
      }
    }

    // Add response if exists
    if (suggestion.response) {
      embed.addFields({
        name: '📝 Staff Response',
        value: suggestion.response,
      });
    }

    // Add message link if available
    if (suggestion.messageId) {
      const config = await suggestionsService.getConfig(interaction.guildId);
      if (config?.channelId) {
        embed.addFields({
          name: 'Message Link',
          value: `[Jump to Suggestion](https://discord.com/channels/${interaction.guildId}/${config.channelId}/${suggestion.messageId})`,
        });
      }
    }

    embed.setTimestamp(new Date(suggestion.createdAt));

    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    console.error('[Suggestion Info] Error:', error);
    await interaction.editReply({
      content: `❌ Failed to fetch suggestion info: ${error.message}`,
    });
  }
}
