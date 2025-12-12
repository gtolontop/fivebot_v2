import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { ModerationService } from '../../services/moderation.service';
import { getPrismaClient } from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('softban')
  .setDescription('Ban then immediately unban a user (clears messages)')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to softban')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for the softban')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

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

  // Check if user is trying to softban themselves
  if (user.id === interaction.user.id) {
    await interaction.editReply({
      content: '❌ You cannot softban yourself.',
    });
    return;
  }

  // Check if user is trying to softban the bot
  if (user.id === interaction.client.user.id) {
    await interaction.editReply({
      content: '❌ You cannot softban me.',
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

    // Check if user is in the server
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) {
      // Check role hierarchy
      if (member.roles.highest.position >= (interaction.member as any).roles.highest.position) {
        await interaction.editReply({
          content: '❌ You cannot softban this user due to role hierarchy.',
        });
        return;
      }

      // Check if member is bannable
      if (!member.bannable) {
        await interaction.editReply({
          content: '❌ I cannot softban this user. Check my role hierarchy and permissions.',
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

    // Try to DM the user before softbanning
    if (config.dmOnAction && member) {
      const tempCase = {
        caseNumber: await moderationService.getNextCaseNumber(interaction.guild.id),
        action: 'softban',
        reason,
      };
      await moderationService.sendUserDM(user, interaction.guild, tempCase);
    }

    // Ban the user (delete 7 days of messages)
    await interaction.guild.members.ban(user.id, {
      reason: `[SOFTBAN] ${reason}`,
      deleteMessageSeconds: 7 * 24 * 60 * 60,
    });

    // Immediately unban
    await interaction.guild.members.unban(user.id, `[SOFTBAN] ${reason}`);

    // Create moderation case
    const modCase = await moderationService.createCase({
      guildId: interaction.guild.id,
      userId: user.id,
      moderatorId: interaction.user.id,
      action: 'softban',
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
      .setColor(0xFF69B4)
      .setTitle('🧹 User Softbanned')
      .setDescription(`Successfully softbanned ${user.tag}`)
      .addFields(
        { name: 'Case Number', value: `#${modCase.caseNumber}`, inline: true },
        { name: 'Messages Deleted', value: 'Last 7 days', inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setFooter({ text: 'User can rejoin the server immediately' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Softban Command] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to softban user. Please try again.',
    });
  }
}
