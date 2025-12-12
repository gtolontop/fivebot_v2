import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { ModerationService } from '../../services/moderation.service';
import { getPrismaClient } from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('unban')
  .setDescription('Unban a user from the server')
  .addStringOption(option =>
    option
      .setName('user-id')
      .setDescription('The user ID to unban')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for the unban')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const userId = interaction.options.getString('user-id', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (!interaction.guild || !interaction.member) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  // Validate user ID format
  if (!/^\d{17,19}$/.test(userId)) {
    await interaction.editReply({
      content: '❌ Invalid user ID format.',
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

    // Check if user is banned
    const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
    if (!ban) {
      await interaction.editReply({
        content: '❌ This user is not banned.',
      });
      return;
    }

    // Unban the user
    await interaction.guild.members.unban(userId, reason);

    // Get user info
    const user = await interaction.client.users.fetch(userId).catch(() => null);

    // Get or create config
    let config = await moderationService.getConfig(interaction.guild.id);
    if (!config) {
      const botId = process.env.BOT_ID || interaction.client.user.id;
      config = await moderationService.createConfig({
        guildId: interaction.guild.id,
        botId,
      });
    }

    // Create moderation case
    const modCase = await moderationService.createCase({
      guildId: interaction.guild.id,
      userId: userId,
      moderatorId: interaction.user.id,
      action: 'unban',
      reason,
    });

    // Send mod log
    if (user) {
      await moderationService.sendModLog(
        interaction.guild,
        modCase,
        interaction.user,
        user
      );
    }

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🔓 User Unbanned')
      .setDescription(user ? `Successfully unbanned ${user.tag}` : `Successfully unbanned user ${userId}`)
      .addFields(
        { name: 'Case Number', value: `#${modCase.caseNumber}`, inline: true },
        { name: 'User ID', value: userId, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Unban Command] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to unban user. Please try again.',
    });
  }
}
