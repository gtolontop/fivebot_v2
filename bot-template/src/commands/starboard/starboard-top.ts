/**
 * /starboard top command
 * View the top starred messages on the server
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';
import { StarboardService } from '../../services/starboard.service';

export const data = new SlashCommandBuilder()
  .setName('starboard')
  .setDescription('Manage the starboard system')
  .addSubcommand(subcommand =>
    subcommand
      .setName('top')
      .setDescription('View the top starred messages')
      .addIntegerOption(option =>
        option
          .setName('limit')
          .setDescription('Number of messages to show (default: 10)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(25)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (interaction.options.getSubcommand() !== 'top') return;

  await interaction.deferReply();

  if (!interaction.guildId || !interaction.guild) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  try {
    const limit = interaction.options.getInteger('limit') || 10;
    const starboardService = new StarboardService();

    // Get configuration
    const config = await starboardService.getConfig(interaction.guildId);

    if (!config) {
      await interaction.editReply({
        content: '❌ Starboard is not configured for this server. Use `/starboard setup` to set it up.',
      });
      return;
    }

    // Get top starred messages
    const topMessages = await starboardService.getTopMessages(interaction.guildId, limit);

    if (topMessages.length === 0) {
      await interaction.editReply({
        content: '❌ No starred messages found yet. Start reacting to messages with the star emoji!',
      });
      return;
    }

    // Build the leaderboard
    const description = topMessages
      .map((msg: any, index: number) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${index + 1}.**`;
        const starCount = msg.starCount || 0;
        const author = `<@${msg.authorId}>`;
        const link = `[Jump](https://discord.com/channels/${interaction.guildId}/${msg.channelId}/${msg.messageId})`;

        return `${medal} ${config.emoji} **${starCount}** | ${author} | ${link}`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🌟 Top Starred Messages')
      .setDescription(description)
      .setFooter({ text: `Showing top ${topMessages.length} messages` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    console.error('[Starboard Top] Error:', error);
    await interaction.editReply({
      content: `❌ Failed to fetch top starred messages: ${error.message}`,
    });
  }
}
