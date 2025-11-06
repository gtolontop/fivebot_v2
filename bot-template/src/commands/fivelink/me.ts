/**
 * /me command
 * Show your FiveLink profile (if Discord is linked)
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
  .setName('me')
  .setDescription('View your FiveLink profile');

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

    // Get user by Discord ID
    const userData = await fivelink.getUserByDiscordId(interaction.user.id);

    if (!userData) {
      // User not found - show helpful message
      const embed = new EmbedBuilder()
        .setColor(0xff9500)
        .setTitle('❌ Discord Not Linked')
        .setDescription(
          'Your Discord account is not linked to a FiveLink profile.\n\n' +
          '**How to link your account:**\n' +
          '1. Visit [fivelink.lol](https://fivelink.lol)\n' +
          '2. Log in or sign up using Discord\n' +
          '3. Once logged in, your Discord will be automatically linked!\n\n' +
          'If you already have an account, make sure you\'re logged in with Discord.'
        )
        .setFooter({ text: 'Powered by FiveLink' })
        .setTimestamp();

      const linkButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('Link Account')
          .setStyle(ButtonStyle.Link)
          .setURL('https://fivelink.lol/login')
          .setEmoji('🔗')
      );

      return interaction.editReply({
        embeds: [embed],
        components: [linkButton],
      });
    }

    // User found - show profile
    const { user, profile, stats, badges } = userData;

    if (!profile) {
      return interaction.editReply({
        content: '❌ You don\'t have a FiveLink profile yet. Create one at https://fivelink.lol',
      });
    }

    // Build embed
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`${profile.displayName}'s Profile`)
      .setDescription(profile.pageTitle || 'FiveLink Profile')
      .setThumbnail(profile.avatar || user.image || null)
      .addFields(
        {
          name: '🆔 Profile ID',
          value: profile.customId ? `#${profile.customId}` : 'N/A',
          inline: true,
        },
        {
          name: '👤 Username',
          value: profile.alias ? `@${profile.alias}` : `@${profile.slug}`,
          inline: true,
        },
        {
          name: '👁️ Total Views',
          value: profile.views.toLocaleString(),
          inline: true,
        },
        {
          name: '🎯 Total Clicks',
          value: stats.totalClicks.toLocaleString(),
          inline: true,
        },
        {
          name: '📸 Media Uploads',
          value: stats.mediaUploads.toLocaleString(),
          inline: true,
        },
        {
          name: '🏆 Badges',
          value: stats.totalBadges.toLocaleString(),
          inline: true,
        }
      )
      .setFooter({ text: 'Powered by FiveLink' })
      .setTimestamp();

    // Add badges if available
    if (badges && badges.length > 0) {
      const badgeList = badges
        .slice(0, 5) // Show first 5 badges
        .map((b) => {
          const name = b.badge?.name || b.customName || 'Badge';
          const icon = b.badge?.icon || b.customIcon || '🏅';
          return `${icon} ${name}`;
        })
        .join(', ');

      embed.addFields({
        name: '🎖️ Badges',
        value: badgeList + (badges.length > 5 ? ` and ${badges.length - 5} more` : ''),
        inline: false,
      });
    }

    // Add profile link button
    const profileUrl = profile.alias
      ? `https://fivelink.lol/${profile.alias}`
      : `https://fivelink.lol/${profile.slug}`;

    const linkButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('View Profile')
        .setStyle(ButtonStyle.Link)
        .setURL(profileUrl)
        .setEmoji('🔗'),
      new ButtonBuilder()
        .setLabel('Edit Profile')
        .setStyle(ButtonStyle.Link)
        .setURL('https://fivelink.lol/dashboard/editor')
        .setEmoji('✏️')
    );

    await interaction.editReply({
      embeds: [embed],
      components: [linkButton],
      // @ts-ignore - V2 flag
      flags: COMP_V2_FLAG,
    });
  } catch (error: any) {
    console.error('[FiveLink] /me command error:', error);

    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';

    if (interaction.deferred) {
      await interaction.editReply({
        content: `❌ Failed to fetch your profile: ${errorMessage}`,
      });
    } else {
      await interaction.reply({
        content: `❌ Failed to fetch your profile: ${errorMessage}`,
        ephemeral: true,
      });
    }
  }
}
