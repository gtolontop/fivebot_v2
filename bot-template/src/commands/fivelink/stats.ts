/**
 * /stats command
 * Display global FiveLink platform statistics
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { FiveLinkService } from '../../services/fivelink.service';
import { getRedisClient } from '../../services/redis.service';
import { getModuleConfig } from '../../services/config.service';

const COMP_V2_FLAG = 1 << 15;

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('View global FiveLink platform statistics');

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.deferReply();

    // Get module config
    const config = await getModuleConfig(interaction.guildId!, 'fivelink');
    if (!config || !config.apiKey) {
      return interaction.editReply({
        content: '❌ FiveLink module is not configured. Please set your API key first.',
      });
    }

    // Initialize FiveLink service
    const redis = getRedisClient();
    const fivelink = new FiveLinkService(
      {
        apiKey: config.apiKey,
        cacheEnabled: config.cacheEnabled ?? true,
        cacheTTL: config.cacheTTL ?? 3600,
      },
      redis
    );

    // Get global stats
    const stats = await fivelink.getGlobalStats();

    // Build embed
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🌐 FiveLink Platform Statistics')
      .setDescription('Real-time statistics from the FiveLink platform')
      .addFields(
        {
          name: '👥 Total Users',
          value: stats.allTime.totalUsers.toLocaleString(),
          inline: true,
        },
        {
          name: '📄 Total Profiles',
          value: stats.allTime.totalProfiles.toLocaleString(),
          inline: true,
        },
        {
          name: '✅ Active Profiles',
          value: stats.allTime.activeProfiles.toLocaleString(),
          inline: true,
        },
        {
          name: '👁️ Total Views',
          value: stats.allTime.totalViews.toLocaleString(),
          inline: true,
        },
        {
          name: '🎯 Total Clicks',
          value: stats.allTime.totalClicks.toLocaleString(),
          inline: true,
        },
        {
          name: '\u200b',
          value: '\u200b',
          inline: true,
        }
      )
      .addFields({
        name: '📊 Last 24 Hours',
        value:
          `👁️ **${stats.last24Hours.views.toLocaleString()}** views\n` +
          `🎯 **${stats.last24Hours.clicks.toLocaleString()}** clicks\n` +
          `📄 **${stats.last24Hours.newProfiles.toLocaleString()}** new profiles`,
        inline: false,
      })
      .setFooter({ text: 'Powered by FiveLink • Updated every 5 minutes' })
      .setTimestamp();

    // Add buttons
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('fivelink_stats_refresh')
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄'),
      new ButtonBuilder()
        .setLabel('Visit FiveLink')
        .setStyle(ButtonStyle.Link)
        .setURL('https://fivelink.lol')
        .setEmoji('🌐'),
      new ButtonBuilder()
        .setLabel('Create Profile')
        .setStyle(ButtonStyle.Link)
        .setURL('https://fivelink.lol/register')
        .setEmoji('✨')
    );

    await interaction.editReply({
      embeds: [embed],
      components: [buttons],
      // @ts-ignore - V2 flag
      flags: COMP_V2_FLAG,
    });
  } catch (error: any) {
    console.error('[FiveLink] /stats command error:', error);

    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';

    if (interaction.deferred) {
      await interaction.editReply({
        content: `❌ Failed to fetch statistics: ${errorMessage}`,
      });
    } else {
      await interaction.reply({
        content: `❌ Failed to fetch statistics: ${errorMessage}`,
        ephemeral: true,
      });
    }
  }
}

// Handle refresh button
export async function handleStatsRefresh(interaction: any) {
  try {
    await interaction.deferUpdate();

    // Get module config
    const config = await getModuleConfig(interaction.guildId!, 'fivelink');
    if (!config || !config.apiKey) {
      return interaction.editReply({
        content: '❌ FiveLink module is not configured.',
        components: [],
      });
    }

    // Initialize FiveLink service (no cache)
    const redis = getRedisClient();
    const fivelink = new FiveLinkService(
      {
        apiKey: config.apiKey,
        cacheEnabled: false, // Force fresh data
        cacheTTL: config.cacheTTL ?? 3600,
      },
      redis
    );

    // Get global stats
    const stats = await fivelink.getGlobalStats();

    // Build updated embed
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🌐 FiveLink Platform Statistics')
      .setDescription('Real-time statistics from the FiveLink platform')
      .addFields(
        {
          name: '👥 Total Users',
          value: stats.allTime.totalUsers.toLocaleString(),
          inline: true,
        },
        {
          name: '📄 Total Profiles',
          value: stats.allTime.totalProfiles.toLocaleString(),
          inline: true,
        },
        {
          name: '✅ Active Profiles',
          value: stats.allTime.activeProfiles.toLocaleString(),
          inline: true,
        },
        {
          name: '👁️ Total Views',
          value: stats.allTime.totalViews.toLocaleString(),
          inline: true,
        },
        {
          name: '🎯 Total Clicks',
          value: stats.allTime.totalClicks.toLocaleString(),
          inline: true,
        },
        {
          name: '\u200b',
          value: '\u200b',
          inline: true,
        }
      )
      .addFields({
        name: '📊 Last 24 Hours',
        value:
          `👁️ **${stats.last24Hours.views.toLocaleString()}** views\n` +
          `🎯 **${stats.last24Hours.clicks.toLocaleString()}** clicks\n` +
          `📄 **${stats.last24Hours.newProfiles.toLocaleString()}** new profiles`,
        inline: false,
      })
      .setFooter({ text: 'Powered by FiveLink • Refreshed just now' })
      .setTimestamp();

    // Keep same buttons
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('fivelink_stats_refresh')
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄'),
      new ButtonBuilder()
        .setLabel('Visit FiveLink')
        .setStyle(ButtonStyle.Link)
        .setURL('https://fivelink.lol')
        .setEmoji('🌐'),
      new ButtonBuilder()
        .setLabel('Create Profile')
        .setStyle(ButtonStyle.Link)
        .setURL('https://fivelink.lol/register')
        .setEmoji('✨')
    );

    await interaction.editReply({
      embeds: [embed],
      components: [buttons],
    });
  } catch (error: any) {
    console.error('[FiveLink] Stats refresh error:', error);
    await interaction.editReply({
      content: `❌ Failed to refresh statistics: ${error.message}`,
      components: [],
    });
  }
}
