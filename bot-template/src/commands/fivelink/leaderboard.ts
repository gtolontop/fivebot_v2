/**
 * /leaderboard command
 * Display FiveLink leaderboards with interactive buttons
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

const LEADERBOARD_TYPES = {
  views: { emoji: '👁️', label: 'Views', description: 'Most viewed profiles' },
  clicks: { emoji: '🎯', label: 'Clicks', description: 'Most clicked profiles' },
  customId: { emoji: '🆔', label: 'ID', description: 'Earliest users' },
  badges: { emoji: '🏆', label: 'Badges', description: 'Most badges collected' },
  mediaUploads: { emoji: '📸', label: 'Media', description: 'Most media uploaded' },
};

const COMP_V2_FLAG = 1 << 15;

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Display FiveLink leaderboards')
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('Leaderboard type')
      .setRequired(false)
      .addChoices(
        { name: '👁️ Views', value: 'views' },
        { name: '🎯 Clicks', value: 'clicks' },
        { name: '🆔 ID (Earliest Users)', value: 'customId' },
        { name: '🏆 Badges', value: 'badges' },
        { name: '📸 Media Uploads', value: 'mediaUploads' }
      )
  );

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

    // Get initial type
    const initialType = (interaction.options.getString('type') as keyof typeof LEADERBOARD_TYPES) || 'views';
    const page = 0;

    // Fetch leaderboard
    const leaderboard = await fivelink.getLeaderboard(initialType, 10, page * 10);

    if (!leaderboard || leaderboard.length === 0) {
      return interaction.editReply({
        content: '❌ No leaderboard data available at the moment.',
      });
    }

    // Build embed with V2 components
    const typeInfo = LEADERBOARD_TYPES[initialType];
    const embed = buildLeaderboardEmbed(leaderboard, initialType, page);

    // Build buttons
    const buttons = buildLeaderboardButtons(initialType, page, leaderboard.length < 10);

    await interaction.editReply({
      embeds: [embed],
      components: buttons,
      // @ts-ignore - V2 flag
      flags: COMP_V2_FLAG,
    });
  } catch (error: any) {
    console.error('[FiveLink] Leaderboard error:', error);

    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';

    if (interaction.deferred) {
      await interaction.editReply({
        content: `❌ Failed to fetch leaderboard: ${errorMessage}`,
      });
    } else {
      await interaction.reply({
        content: `❌ Failed to fetch leaderboard: ${errorMessage}`,
        flags: 64  // MessageFlags.Ephemeral
      });
    }
  }
}

function buildLeaderboardEmbed(
  leaderboard: any[],
  type: keyof typeof LEADERBOARD_TYPES,
  page: number
) {
  const typeInfo = LEADERBOARD_TYPES[type];

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle(`${typeInfo.emoji} FiveLink Leaderboard - ${typeInfo.label}`)
    .setDescription(typeInfo.description)
    .setFooter({ text: `Page ${page + 1} • Powered by FiveLink` })
    .setTimestamp();

  // Add leaderboard entries
  let description = '';
  for (const entry of leaderboard) {
    const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `${entry.rank}.`;
    const username = entry.alias ? `@${entry.alias}` : `@${entry.slug}`;
    const valueFormatted = entry.value.toLocaleString();

    description += `${medal} **${username}** - ${valueFormatted}\n`;

    if (entry.customId) {
      description += `   ➜ ID: #${entry.customId}\n`;
    }
  }

  embed.setDescription(description);

  return embed;
}

function buildLeaderboardButtons(
  currentType: keyof typeof LEADERBOARD_TYPES,
  page: number,
  isLastPage: boolean
) {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  // Type selection buttons (row 1)
  const typeRow = new ActionRowBuilder<ButtonBuilder>();
  for (const [key, info] of Object.entries(LEADERBOARD_TYPES)) {
    typeRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`fivelink_lb_${key}_${page}`)
        .setLabel(info.label)
        .setEmoji(info.emoji)
        .setStyle(key === currentType ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );
  }
  rows.push(typeRow);

  // Pagination buttons (row 2)
  const paginationRow = new ActionRowBuilder<ButtonBuilder>();

  paginationRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`fivelink_lb_${currentType}_${Math.max(0, page - 1)}`)
      .setLabel('Previous')
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0)
  );

  paginationRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`fivelink_lb_refresh_${currentType}_${page}`)
      .setLabel('Refresh')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Secondary)
  );

  paginationRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`fivelink_lb_${currentType}_${page + 1}`)
      .setLabel('Next')
      .setEmoji('➡️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isLastPage)
  );

  rows.push(paginationRow);

  return rows;
}

// Handle button interactions
export async function handleLeaderboardButton(interaction: any) {
  try {
    await interaction.deferUpdate();

    const [, , typeOrRefresh, pageStr] = interaction.customId.split('_');

    let type: keyof typeof LEADERBOARD_TYPES;
    let page: number;
    let forceRefresh = false;

    if (typeOrRefresh === 'refresh') {
      // Refresh button: fivelink_lb_refresh_TYPE_PAGE
      const [, , , actualType, actualPageStr] = interaction.customId.split('_');
      type = actualType as keyof typeof LEADERBOARD_TYPES;
      page = parseInt(actualPageStr);
      forceRefresh = true;
    } else {
      // Type/page button: fivelink_lb_TYPE_PAGE
      type = typeOrRefresh as keyof typeof LEADERBOARD_TYPES;
      page = parseInt(pageStr);
    }

    // Get module config
    const config = await getModuleConfig(interaction.guildId!, 'fivelink');
    if (!config || !config.apiKey) {
      return interaction.editReply({
        content: '❌ FiveLink module is not configured.',
        components: [],
      });
    }

    // Initialize FiveLink service
    const redis = getRedisClient();
    const fivelink = new FiveLinkService(
      {
        apiKey: config.apiKey,
        cacheEnabled: forceRefresh ? false : (config.cacheEnabled ?? true),
        cacheTTL: config.cacheTTL ?? 3600,
      },
      redis
    );

    // Fetch leaderboard
    const leaderboard = await fivelink.getLeaderboard(type, 10, page * 10);

    if (!leaderboard || leaderboard.length === 0) {
      return interaction.editReply({
        content: '❌ No leaderboard data available.',
        components: [],
      });
    }

    // Build updated embed and buttons
    const embed = buildLeaderboardEmbed(leaderboard, type, page);
    const buttons = buildLeaderboardButtons(type, page, leaderboard.length < 10);

    await interaction.editReply({
      embeds: [embed],
      components: buttons,
    });
  } catch (error: any) {
    console.error('[FiveLink] Button interaction error:', error);
    await interaction.editReply({
      content: `❌ Failed to update leaderboard: ${error.message}`,
      components: [],
    });
  }
}
