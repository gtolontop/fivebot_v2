/**
 * /starboard stats command
 * View starboard statistics for a user or the server
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  User,
} from 'discord.js';
import { StarboardService } from '../../services/starboard.service';

export const data = new SlashCommandBuilder()
  .setName('starboard')
  .setDescription('Manage the starboard system')
  .addSubcommand(subcommand =>
    subcommand
      .setName('stats')
      .setDescription('View starboard statistics')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User to view stats for (defaults to yourself)')
          .setRequired(false)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (interaction.options.getSubcommand() !== 'stats') return;

  await interaction.deferReply();

  if (!interaction.guildId || !interaction.guild) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  try {
    const user = interaction.options.getUser('user') || interaction.user;
    const starboardService = new StarboardService();

    // Get configuration
    const config = await starboardService.getConfig(interaction.guildId);

    if (!config) {
      await interaction.editReply({
        content: '❌ Starboard is not configured for this server. Use `/starboard setup` to set it up.',
      });
      return;
    }

    // Get user stats
    const stats = await starboardService.getUserStats(interaction.guildId, user.id);

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`⭐ Starboard Stats - ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        {
          name: '🌟 Messages on Starboard',
          value: `${stats.starredMessages}`,
          inline: true,
        },
        {
          name: '⭐ Total Stars Received',
          value: `${stats.starsReceived}`,
          inline: true,
        },
        {
          name: '💫 Stars Given',
          value: `${stats.starsGiven}`,
          inline: true,
        },
        {
          name: '🏆 Highest Starred Message',
          value: stats.highestStars > 0
            ? `${stats.highestStars} stars`
            : 'No starred messages',
          inline: true,
        },
        {
          name: '📊 Average Stars',
          value: stats.starredMessages > 0
            ? `${(stats.starsReceived / stats.starredMessages).toFixed(1)} stars`
            : 'N/A',
          inline: true,
        },
        {
          name: '🎯 Star Rank',
          value: `#${stats.rank || 'N/A'}`,
          inline: true,
        }
      )
      .setFooter({ text: `Starboard emoji: ${config.emoji}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    console.error('[Starboard Stats] Error:', error);
    await interaction.editReply({
      content: `❌ Failed to fetch starboard stats: ${error.message}`,
    });
  }
}
