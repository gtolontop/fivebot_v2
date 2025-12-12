import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { ModerationService } from '../../services/moderation.service';
import { getPrismaClient } from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('mute')
  .setDescription('Timeout/mute a user')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to mute')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('duration')
      .setDescription('Duration (e.g., 10m, 1h, 1d)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for the mute')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const user = interaction.options.getUser('user', true);
  const durationStr = interaction.options.getString('duration', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (!interaction.guild || !interaction.member) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  // Check if user is trying to mute themselves
  if (user.id === interaction.user.id) {
    await interaction.editReply({
      content: '❌ You cannot mute yourself.',
    });
    return;
  }

  // Check if user is trying to mute a bot
  if (user.bot) {
    await interaction.editReply({
      content: '❌ You cannot mute bots.',
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

    // Parse duration
    const durationMinutes = moderationService.parseDuration(durationStr);
    if (!durationMinutes) {
      await interaction.editReply({
        content: '❌ Invalid duration format. Use format like: 10m, 1h, 1d, 1w',
      });
      return;
    }

    // Discord timeout max is 28 days
    const maxMinutes = 28 * 24 * 60;
    if (durationMinutes > maxMinutes) {
      await interaction.editReply({
        content: `❌ Duration cannot exceed 28 days (${maxMinutes} minutes).`,
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

    // Check role hierarchy
    if (member.roles.highest.position >= (interaction.member as any).roles.highest.position) {
      await interaction.editReply({
        content: '❌ You cannot mute this user due to role hierarchy.',
      });
      return;
    }

    // Timeout the user
    await member.timeout(durationMinutes * 60 * 1000, reason);

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
      action: 'mute',
      reason,
      duration: durationMinutes,
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
      .setColor(0xFFA500)
      .setTitle('🔇 User Muted')
      .setDescription(`Successfully muted ${user.tag}`)
      .addFields(
        { name: 'Case Number', value: `#${modCase.caseNumber}`, inline: true },
        { name: 'Duration', value: durationStr, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Mute Command] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to mute user. Please try again.',
    });
  }
}
