import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getLevelingService } from '../../services/leveling.service';

export const data = new SlashCommandBuilder()
  .setName('xp-settings')
  .setDescription('View current XP and leveling settings for this server');

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.deferReply();

    // Get bot ID from environment
    const botId = process.env.BOT_ID || interaction.client.user?.id;
    if (!botId) {
      await interaction.editReply({ content: '❌ Bot configuration error' });
      return;
    }

    // Get guild ID
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.editReply({ content: '❌ This command can only be used in a server' });
      return;
    }

    // Get leveling service
    const levelingService = await getLevelingService();

    // Get leveling config
    const config = await levelingService.getLevelingConfig(guildId, botId);

    // Parse JSON fields
    let ignoredChannels: string[] = [];
    let ignoredRoles: string[] = [];
    let multiplierRoles: Record<string, number> = {};
    let levelRoles: Record<string, string> = {};

    try {
      if (config.ignoredChannels) {
        ignoredChannels = typeof config.ignoredChannels === 'string'
          ? JSON.parse(config.ignoredChannels)
          : config.ignoredChannels;
      }
      if (config.ignoredRoles) {
        ignoredRoles = typeof config.ignoredRoles === 'string'
          ? JSON.parse(config.ignoredRoles)
          : config.ignoredRoles;
      }
      if (config.multiplierRoles) {
        multiplierRoles = typeof config.multiplierRoles === 'string'
          ? JSON.parse(config.multiplierRoles)
          : config.multiplierRoles;
      }
      if (config.levelRoles) {
        levelRoles = typeof config.levelRoles === 'string'
          ? JSON.parse(config.levelRoles)
          : config.levelRoles;
      }
    } catch (error) {
      console.error('Error parsing config JSON:', error);
    }

    // Create settings embed
    const settingsEmbed = new EmbedBuilder()
      .setTitle('⚙️ Leveling System Settings')
      .setColor(config.enabled ? '#4CAF50' : '#FF6B6B')
      .setDescription(config.enabled ? '✅ **Leveling system is ENABLED**' : '❌ **Leveling system is DISABLED**')
      .addFields(
        {
          name: '📊 XP Configuration',
          value: [
            `**XP Range:** ${config.xpMin}-${config.xpMax} per message`,
            `**Base XP:** ${config.xpPerMessage}`,
            `**Cooldown:** ${config.cooldownSeconds} seconds`,
          ].join('\n'),
          inline: false
        },
        {
          name: '🎉 Level Up Settings',
          value: [
            `**Announce in Channel:** ${config.announceInChannel ? 'Yes' : 'No'}`,
            `**Level Up Channel:** ${config.levelUpChannelId ? `<#${config.levelUpChannelId}>` : 'Current Channel'}`,
            `**Allow Multiple Levels:** ${config.allowMultipleLevels ? 'Yes' : 'No'}`,
            `**Custom Message:** ${config.levelUpMessage ? 'Set' : 'Default'}`,
          ].join('\n'),
          inline: false
        },
        {
          name: '🎭 Role Settings',
          value: [
            `**Stack Roles:** ${config.stackRoles ? 'Yes (keep all level roles)' : 'No (remove previous)'}`,
            `**Level Roles:** ${Object.keys(levelRoles).length > 0 ? `${Object.keys(levelRoles).length} configured` : 'None set'}`,
            `**XP Multiplier Roles:** ${Object.keys(multiplierRoles).length > 0 ? `${Object.keys(multiplierRoles).length} configured` : 'None set'}`,
          ].join('\n'),
          inline: false
        },
        {
          name: '🚫 Ignored Settings',
          value: [
            `**Ignored Channels:** ${ignoredChannels.length > 0 ? `${ignoredChannels.length} channels` : 'None'}`,
            `**Ignored Roles:** ${ignoredRoles.length > 0 ? `${ignoredRoles.length} roles` : 'None'}`,
          ].join('\n'),
          inline: false
        },
        {
          name: '🔄 Other Settings',
          value: [
            `**Reset on Leave:** ${config.resetOnLeave ? 'Yes' : 'No'}`,
          ].join('\n'),
          inline: false
        }
      )
      .setFooter({
        text: `${interaction.guild?.name} • Leveling System`,
        iconURL: interaction.guild?.iconURL() || undefined
      })
      .setTimestamp();

    // Add level role details if configured
    if (Object.keys(levelRoles).length > 0) {
      const levelRolesList = Object.entries(levelRoles)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .slice(0, 10) // Show max 10
        .map(([level, roleId]) => `Level ${level}: <@&${roleId}>`)
        .join('\n');

      settingsEmbed.addFields({
        name: '📋 Level Roles (Preview)',
        value: levelRolesList || 'None',
        inline: false
      });

      if (Object.keys(levelRoles).length > 10) {
        settingsEmbed.addFields({
          name: 'ℹ️',
          value: `...and ${Object.keys(levelRoles).length - 10} more`,
          inline: false
        });
      }
    }

    // Add XP multiplier details if configured
    if (Object.keys(multiplierRoles).length > 0) {
      const multipliersList = Object.entries(multiplierRoles)
        .slice(0, 5) // Show max 5
        .map(([roleId, multiplier]) => `<@&${roleId}>: ${multiplier}x XP`)
        .join('\n');

      settingsEmbed.addFields({
        name: '✨ XP Multipliers (Preview)',
        value: multipliersList || 'None',
        inline: false
      });

      if (Object.keys(multiplierRoles).length > 5) {
        settingsEmbed.addFields({
          name: 'ℹ️',
          value: `...and ${Object.keys(multiplierRoles).length - 5} more`,
          inline: false
        });
      }
    }

    // Add example level calculation
    const level10Xp = levelingService.calculateXPForLevel(10);
    const level50Xp = levelingService.calculateXPForLevel(50);
    const level100Xp = levelingService.calculateXPForLevel(100);

    settingsEmbed.addFields({
      name: '📈 XP Requirements (Examples)',
      value: [
        `Level 10: ${level10Xp.toLocaleString()} XP`,
        `Level 50: ${level50Xp.toLocaleString()} XP`,
        `Level 100: ${level100Xp.toLocaleString()} XP`,
      ].join('\n'),
      inline: false
    });

    await interaction.editReply({ embeds: [settingsEmbed] });
  } catch (error) {
    console.error('Error in xp-settings command:', error);

    const errorMessage = interaction.deferred
      ? { content: '❌ An error occurred while fetching XP settings' }
      : { content: '❌ An error occurred while fetching XP settings', ephemeral: true };

    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}
