import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { ModerationService } from '../../services/moderation.service';
import { getPrismaClient } from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Ban a user from the server')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to ban')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('duration')
      .setDescription('Ban duration (e.g., 7d, permanent if not specified)')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for the ban')
      .setRequired(false)
  )
  .addIntegerOption(option =>
    option
      .setName('delete-messages')
      .setDescription('Delete messages from the last X days (0-7)')
      .setMinValue(0)
      .setMaxValue(7)
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const user = interaction.options.getUser('user', true);
  const durationStr = interaction.options.getString('duration');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const deleteMessageDays = interaction.options.getInteger('delete-messages') || 0;

  if (!interaction.guild || !interaction.member) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  // Check if user is trying to ban themselves
  if (user.id === interaction.user.id) {
    await interaction.editReply({
      content: '❌ You cannot ban yourself.',
    });
    return;
  }

  // Check if user is trying to ban the bot
  if (user.id === interaction.client.user.id) {
    await interaction.editReply({
      content: '❌ You cannot ban me.',
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

    // Parse duration if provided
    let durationMinutes: number | undefined;
    if (durationStr) {
      const parsed = moderationService.parseDuration(durationStr);
      if (!parsed) {
        await interaction.editReply({
          content: '❌ Invalid duration format. Use format like: 7d, 30d, 1w',
        });
        return;
      }
      durationMinutes = parsed;
    }

    // Check if user is in the server
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) {
      // Check role hierarchy
      if (member.roles.highest.position >= (interaction.member as any).roles.highest.position) {
        await interaction.editReply({
          content: '❌ You cannot ban this user due to role hierarchy.',
        });
        return;
      }

      // Check if member is bannable
      if (!member.bannable) {
        await interaction.editReply({
          content: '❌ I cannot ban this user. Check my role hierarchy and permissions.',
        });
        return;
      }
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

    // Try to DM the user before banning
    if (config.dmOnAction && member) {
      const tempCase = {
        caseNumber: await moderationService.getNextCaseNumber(interaction.guild.id),
        action: 'ban',
        reason,
        duration: durationMinutes,
      };
      await moderationService.sendUserDM(user, interaction.guild, tempCase);
    }

    // Ban the user
    await interaction.guild.members.ban(user.id, {
      reason,
      deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60,
    });

    // Create moderation case
    const modCase = await moderationService.createCase({
      guildId: interaction.guild.id,
      userId: user.id,
      moderatorId: interaction.user.id,
      action: 'ban',
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

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🔨 User Banned')
      .setDescription(`Successfully banned ${user.tag}`)
      .addFields(
        { name: 'Case Number', value: `#${modCase.caseNumber}`, inline: true },
        {
          name: 'Duration',
          value: durationStr || 'Permanent',
          inline: true,
        },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    if (deleteMessageDays > 0) {
      embed.addFields({
        name: 'Messages Deleted',
        value: `Last ${deleteMessageDays} day${deleteMessageDays !== 1 ? 's' : ''}`,
        inline: true,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Ban Command] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to ban user. Please try again.',
    });
  }
}
