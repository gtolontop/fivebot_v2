import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { ModerationService } from '../../services/moderation.service';
import { getPrismaClient } from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('unmute')
  .setDescription('Remove timeout/unmute a user')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to unmute')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for unmuting')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';

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

    // Get member
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.editReply({
        content: '❌ User is not in this server.',
      });
      return;
    }

    // Check if user is muted
    if (!member.communicationDisabledUntil) {
      await interaction.editReply({
        content: '❌ This user is not muted.',
      });
      return;
    }

    // Remove timeout
    await member.timeout(null, reason);

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
      userId: user.id,
      moderatorId: interaction.user.id,
      action: 'unmute',
      reason,
    });

    // Send mod log
    await moderationService.sendModLog(
      interaction.guild,
      modCase,
      interaction.user,
      user
    );

    // Try to DM the user
    if (config.dmOnAction) {
      await moderationService.sendUserDM(user, interaction.guild, modCase);
    }

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🔊 User Unmuted')
      .setDescription(`Successfully unmuted ${user.tag}`)
      .addFields(
        { name: 'Case Number', value: `#${modCase.caseNumber}`, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Unmute Command] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to unmute user. Please try again.',
    });
  }
}
