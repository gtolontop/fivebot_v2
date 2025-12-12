import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { ModerationService } from '../../services/moderation.service';
import { getPrismaClient } from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('Kick a user from the server')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to kick')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for the kick')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

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

  // Check if user is trying to kick themselves
  if (user.id === interaction.user.id) {
    await interaction.editReply({
      content: '❌ You cannot kick yourself.',
    });
    return;
  }

  // Check if user is trying to kick a bot
  if (user.bot && user.id === interaction.client.user.id) {
    await interaction.editReply({
      content: '❌ You cannot kick me.',
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

    // Check role hierarchy
    if (member.roles.highest.position >= (interaction.member as any).roles.highest.position) {
      await interaction.editReply({
        content: '❌ You cannot kick this user due to role hierarchy.',
      });
      return;
    }

    // Check if member is kickable
    if (!member.kickable) {
      await interaction.editReply({
        content: '❌ I cannot kick this user. Check my role hierarchy and permissions.',
      });
      return;
    }

    // Get or create config
    let config = await moderationService.getConfig(interaction.guild.id);
    if (!config) {
      const botId = process.env.BOT_ID || interaction.client.user.id;
      config = await moderationService.createConfig({
        guildId: interaction.guild.id,
        botId,
      });
    }

    // Try to DM the user before kicking
    if (config.dmOnAction) {
      const tempCase = {
        caseNumber: await moderationService.getNextCaseNumber(interaction.guild.id),
        action: 'kick',
        reason,
      };
      await moderationService.sendUserDM(user, interaction.guild, tempCase);
    }

    // Kick the user
    await member.kick(reason);

    // Create moderation case
    const modCase = await moderationService.createCase({
      guildId: interaction.guild.id,
      userId: user.id,
      moderatorId: interaction.user.id,
      action: 'kick',
      reason,
    });

    // Send mod log
    await moderationService.sendModLog(
      interaction.guild,
      modCase,
      interaction.user,
      user
    );

    const embed = new EmbedBuilder()
      .setColor(0xFF8C00)
      .setTitle('👢 User Kicked')
      .setDescription(`Successfully kicked ${user.tag}`)
      .addFields(
        { name: 'Case Number', value: `#${modCase.caseNumber}`, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Kick Command] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to kick user. Please try again.',
    });
  }
}
