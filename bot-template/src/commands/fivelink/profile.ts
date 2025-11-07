/**
 * /profile command
 * Look up any FiveLink profile by username
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

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('Look up a FiveLink profile')
  .addStringOption((option) =>
    option
      .setName('username')
      .setDescription('FiveLink username or alias')
      .setRequired(true)
      .setMaxLength(50)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.deferReply();

    const username = interaction.options.getString('username', true);

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

    // Get profile
    const profileData = await fivelink.getProfile(username);

    if (!profileData) {
      return interaction.editReply({
        content: `❌ Profile "${username}" not found. Make sure the username is correct.`,
      });
    }

    const { profile, owner, stats } = profileData;

    // Build embed
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`${profile.displayName}'s Profile`)
      .setDescription(profile.pageTitle || 'FiveLink Profile')
      .setThumbnail(profile.avatar || owner.image || null)
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
          value: stats.views.toLocaleString(),
          inline: true,
        },
        {
          name: '🎯 Total Clicks',
          value: stats.clicks.toLocaleString(),
          inline: true,
        },
        {
          name: '📸 Media Uploads',
          value: stats.mediaUploads.toLocaleString(),
          inline: true,
        },
        {
          name: '🏆 Badges',
          value: owner.badges.length.toLocaleString(),
          inline: true,
        }
      )
      .setFooter({ text: 'Powered by FiveLink' })
      .setTimestamp();

    // Add badges if available
    if (owner.badges && owner.badges.length > 0) {
      const badgeList = owner.badges
        .slice(0, 5) // Show first 5 badges
        .map((b) => {
          const name = b.badge?.name || b.customName || 'Badge';
          const icon = b.badge?.icon || b.customIcon || '🏅';
          return `${icon} ${name}`;
        })
        .join(', ');

      embed.addFields({
        name: '🎖️ Badges',
        value: badgeList + (owner.badges.length > 5 ? ` and ${owner.badges.length - 5} more` : ''),
        inline: false,
      });
    }

    // Add created date
    const createdDate = new Date(profile.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    embed.addFields({
      name: '📅 Created',
      value: createdDate,
      inline: true,
    });

    // Add profile link button
    const profileUrl = profile.alias
      ? `https://fivelink.lol/${profile.alias}`
      : `https://fivelink.lol/${profile.slug}`;

    const linkButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('View Profile')
        .setStyle(ButtonStyle.Link)
        .setURL(profileUrl)
        .setEmoji('🔗')
    );

    await interaction.editReply({
      embeds: [embed],
      components: [linkButton],
      // @ts-ignore - V2 flag
      flags: COMP_V2_FLAG,
    });
  } catch (error: any) {
    console.error('[FiveLink] /profile command error:', error);

    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';

    if (interaction.deferred) {
      await interaction.editReply({
        content: `❌ Failed to fetch profile: ${errorMessage}`,
      });
    } else {
      await interaction.reply({
        content: `❌ Failed to fetch profile: ${errorMessage}`,
        flags: 64  // MessageFlags.Ephemeral
      });
    }
  }
}
