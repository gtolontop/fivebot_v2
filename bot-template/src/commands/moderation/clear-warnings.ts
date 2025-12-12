import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { ModerationService } from '../../services/moderation.service';
import { getPrismaClient } from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('clear-warnings')
  .setDescription('Clear warnings for a user')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to clear warnings for')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option
      .setName('case-id')
      .setDescription('Specific case number to clear (optional)')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const user = interaction.options.getUser('user', true);
  const caseNumber = interaction.options.getInteger('case-id');

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

    // Clear warnings
    const clearedCount = await moderationService.clearWarnings(
      interaction.guild.id,
      user.id,
      caseNumber || undefined
    );

    if (clearedCount === 0) {
      await interaction.editReply({
        content: caseNumber
          ? `❌ No warning found with case #${caseNumber} for ${user.tag}.`
          : `❌ No active warnings found for ${user.tag}.`,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Warnings Cleared')
      .setDescription(
        caseNumber
          ? `Cleared warning case #${caseNumber} for ${user.tag}`
          : `Cleared **${clearedCount}** warning${clearedCount !== 1 ? 's' : ''} for ${user.tag}`
      )
      .addFields(
        { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Clear Warnings Command] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to clear warnings. Please try again.',
    });
  }
}
