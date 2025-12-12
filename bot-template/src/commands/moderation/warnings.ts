import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { ModerationService } from '../../services/moderation.service';
import { getPrismaClient } from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('warnings')
  .setDescription('View warnings for a user')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to check warnings for')
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

    // Get warnings
    const warnings = await moderationService.getUserWarnings(interaction.guild.id, user.id);

    if (warnings.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ No Warnings')
        .setDescription(`${user.tag} has no active warnings.`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Create embed with warnings
    const embed = new EmbedBuilder()
      .setColor(0xFFFF00)
      .setTitle(`⚠️ Warnings for ${user.tag}`)
      .setDescription(`Total active warnings: **${warnings.length}**`)
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();

    // Add warnings as fields (max 25 fields in Discord embeds)
    const displayWarnings = warnings.slice(0, 25);
    for (const warning of displayWarnings) {
      const moderator = await interaction.client.users.fetch(warning.moderatorId).catch(() => null);
      const moderatorName = moderator ? moderator.tag : 'Unknown';
      const date = new Date(warning.createdAt).toLocaleDateString();

      embed.addFields({
        name: `Case #${warning.caseNumber} - ${date}`,
        value: `**Moderator:** ${moderatorName}\n**Reason:** ${warning.reason || 'No reason provided'}`,
        inline: false,
      });
    }

    if (warnings.length > 25) {
      embed.setFooter({
        text: `Showing 25 of ${warnings.length} warnings`,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Warnings Command] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to fetch warnings. Please try again.',
    });
  }
}
