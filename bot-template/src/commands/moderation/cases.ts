import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { ModerationService } from '../../services/moderation.service';
import { getPrismaClient } from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('cases')
  .setDescription('View all moderation cases for a user')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to view cases for')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const user = interaction.options.getUser('user', true);

  if (!interaction.guild || !interaction.member) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  try {
    const prisma = getPrismaClient();
    const moderationService = new ModerationService(prisma);

    // Check if moderator has permissions
    const canModerate = await moderationService.canModerate(
      interaction.member as any,
      interaction.guild.id
    );

    if (!canModerate) {
      await interaction.editReply({
        content: '❌ You do not have permission to use moderation commands.',
      });
      return;
    }

    // Get all cases
    const cases = await moderationService.getUserCases(interaction.guild.id, user.id);

    if (cases.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ No Cases')
        .setDescription(`${user.tag} has no moderation cases.`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Count cases by type
    const caseStats = {
      warn: cases.filter(c => c.action === 'warn' && !c.resolved).length,
      mute: cases.filter(c => c.action === 'mute').length,
      kick: cases.filter(c => c.action === 'kick').length,
      ban: cases.filter(c => c.action === 'ban').length,
      total: cases.length,
    };

    // Create embed with cases
    const embed = new EmbedBuilder()
      .setColor(0xFF8C00)
      .setTitle(`📋 Cases for ${user.tag}`)
      .setDescription(
        `**Total Cases:** ${caseStats.total}\n` +
        `**Active Warnings:** ${caseStats.warn}\n` +
        `**Mutes:** ${caseStats.mute}\n` +
        `**Kicks:** ${caseStats.kick}\n` +
        `**Bans:** ${caseStats.ban}`
      )
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();

    // Add recent cases as fields (max 10)
    const recentCases = cases.slice(0, 10);
    for (const c of recentCases) {
      const moderator = await interaction.client.users.fetch(c.moderatorId).catch(() => null);
      const moderatorName = moderator ? moderator.tag : 'Unknown';
      const date = new Date(c.createdAt).toLocaleDateString();
      const status = c.resolved ? '✅' : '⏳';

      embed.addFields({
        name: `${status} Case #${c.caseNumber} - ${c.action.toUpperCase()} - ${date}`,
        value: `**Moderator:** ${moderatorName}\n**Reason:** ${c.reason?.substring(0, 100) || 'No reason'}${c.reason && c.reason.length > 100 ? '...' : ''}`,
        inline: false,
      });
    }

    if (cases.length > 10) {
      embed.setFooter({
        text: `Showing 10 of ${cases.length} cases`,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Cases Command] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to fetch cases. Please try again.',
    });
  }
}
