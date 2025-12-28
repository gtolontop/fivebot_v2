/**
 * /badge command
 * Grant or revoke FiveLink badges to users
 * Admin only - requires manage server permission
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  AutocompleteInteraction,
} from 'discord.js';
import { FiveLinkService } from '../../services/fivelink.service';
import { getRedisClient } from '../../services/redis.service';
import { getModuleConfig } from '../../services/config.service';

// Cache for badge autocomplete
let badgeCache: Array<{ key: string; name: string }> = [];
let badgeCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const data = new SlashCommandBuilder()
  .setName('badge')
  .setDescription('Manage FiveLink badges')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName('grant')
      .setDescription('Grant a badge to a user')
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The user to grant the badge to')
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('badge')
          .setDescription('The badge to grant')
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addStringOption((option) =>
        option
          .setName('reason')
          .setDescription('Reason for granting the badge')
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('revoke')
      .setDescription('Revoke a badge from a user')
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The user to revoke the badge from')
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('badge')
          .setDescription('The badge to revoke')
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addStringOption((option) =>
        option
          .setName('reason')
          .setDescription('Reason for revoking the badge')
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('list')
      .setDescription('List all available badges')
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused().toLowerCase();

  try {
    // Check if cache is valid
    if (Date.now() - badgeCacheTime > CACHE_TTL || badgeCache.length === 0) {
      // Get module config
      const config = await getModuleConfig(interaction.guildId!, 'fivelink');
      if (config?.apiKey) {
        const redis = getRedisClient();
        const fivelink = new FiveLinkService(
          {
            apiKey: config.apiKey,
            cacheEnabled: true,
            cacheTTL: 300,
          },
          redis
        );

        const result = await fivelink.getAvailableBadges();
        if (result.success && result.badges) {
          badgeCache = result.badges;
          badgeCacheTime = Date.now();
        }
      }
    }

    // Filter badges based on input
    const filtered = badgeCache
      .filter(
        (badge) =>
          badge.name.toLowerCase().includes(focusedValue) ||
          badge.key.toLowerCase().includes(focusedValue)
      )
      .slice(0, 25);

    await interaction.respond(
      filtered.map((badge) => ({
        name: badge.name,
        value: badge.key,
      }))
    );
  } catch (error) {
    console.error('[Badge] Autocomplete error:', error);
    await interaction.respond([]);
  }
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  // Get module config
  const config = await getModuleConfig(interaction.guildId!, 'fivelink');
  if (!config || !config.apiKey) {
    return interaction.reply({
      content: '❌ FiveLink module is not configured. Please set your API key first.',
      ephemeral: true,
    });
  }

  // Initialize FiveLink service
  const redis = getRedisClient();
  const fivelink = new FiveLinkService(
    {
      apiKey: config.apiKey,
      cacheEnabled: true,
      cacheTTL: 300,
    },
    redis
  );

  switch (subcommand) {
    case 'grant':
      return handleGrant(interaction, fivelink);
    case 'revoke':
      return handleRevoke(interaction, fivelink);
    case 'list':
      return handleList(interaction, fivelink);
    default:
      return interaction.reply({
        content: '❌ Unknown subcommand',
        ephemeral: true,
      });
  }
}

async function handleGrant(
  interaction: ChatInputCommandInteraction,
  fivelink: FiveLinkService
) {
  await interaction.deferReply({ ephemeral: true });

  const user = interaction.options.getUser('user', true);
  const badgeKey = interaction.options.getString('badge', true);
  const reason = interaction.options.getString('reason') || `Granted by ${interaction.user.tag}`;

  try {
    const result = await fivelink.grantBadge(user.id, badgeKey, reason);

    if (result.success) {
      const embed = new EmbedBuilder()
        .setColor(result.alreadyHad ? 0xffaa00 : 0x00ff00)
        .setTitle(result.alreadyHad ? '⚠️ Badge Already Owned' : '✅ Badge Granted')
        .setDescription(
          result.alreadyHad
            ? `${user.tag} already has the **${badgeKey}** badge.`
            : `Successfully granted **${badgeKey}** badge to ${user.tag}.`
        )
        .addFields(
          { name: 'User', value: `<@${user.id}>`, inline: true },
          { name: 'Badge', value: badgeKey, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setFooter({ text: 'Powered by FiveLink' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({
        content: `❌ Failed to grant badge: ${result.error}`,
      });
    }
  } catch (error: any) {
    console.error('[Badge] Grant error:', error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}`,
    });
  }
}

async function handleRevoke(
  interaction: ChatInputCommandInteraction,
  fivelink: FiveLinkService
) {
  await interaction.deferReply({ ephemeral: true });

  const user = interaction.options.getUser('user', true);
  const badgeKey = interaction.options.getString('badge', true);
  const reason = interaction.options.getString('reason') || `Revoked by ${interaction.user.tag}`;

  try {
    const result = await fivelink.revokeBadge(user.id, badgeKey, reason);

    if (result.success) {
      const embed = new EmbedBuilder()
        .setColor(result.hadBadge ? 0xff0000 : 0xffaa00)
        .setTitle(result.hadBadge ? '✅ Badge Revoked' : '⚠️ Badge Not Found')
        .setDescription(
          result.hadBadge
            ? `Successfully revoked **${badgeKey}** badge from ${user.tag}.`
            : `${user.tag} did not have the **${badgeKey}** badge.`
        )
        .addFields(
          { name: 'User', value: `<@${user.id}>`, inline: true },
          { name: 'Badge', value: badgeKey, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setFooter({ text: 'Powered by FiveLink' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({
        content: `❌ Failed to revoke badge: ${result.error}`,
      });
    }
  } catch (error: any) {
    console.error('[Badge] Revoke error:', error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}`,
    });
  }
}

async function handleList(
  interaction: ChatInputCommandInteraction,
  fivelink: FiveLinkService
) {
  await interaction.deferReply();

  try {
    const result = await fivelink.getAvailableBadges();

    if (!result.success || !result.badges) {
      return interaction.editReply({
        content: `❌ Failed to fetch badges: ${result.error}`,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎖️ Available Badges')
      .setDescription(
        result.badges.length > 0
          ? result.badges
              .map((b) => `• **${b.name}** (\`${b.key}\`)${b.description ? `\n  ${b.description}` : ''}`)
              .join('\n\n')
          : 'No badges available.'
      )
      .setFooter({ text: `${result.badges.length} badges available • Powered by FiveLink` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    console.error('[Badge] List error:', error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}`,
    });
  }
}
