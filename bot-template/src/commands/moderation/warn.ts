import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { ModerationService } from '../../services/moderation.service';
import { getPrismaClient } from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('warn')
  .setDescription('Warn a user')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to warn')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for the warning')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason', true);

  if (!interaction.guild || !interaction.member) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  // Check if user is trying to warn themselves
  if (user.id === interaction.user.id) {
    await interaction.editReply({
      content: '❌ You cannot warn yourself.',
    });
    return;
  }

  // Check if user is trying to warn a bot
  if (user.bot) {
    await interaction.editReply({
      content: '❌ You cannot warn bots.',
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

    // Get or create config
    let config = await moderationService.getConfig(interaction.guild.id);
    if (!config) {
      const botId = process.env.BOT_ID || interaction.client.user.id;
      config = await moderationService.createConfig({
        guildId: interaction.guild.id,
        botId,
      });
    }

    if (!config.enabled) {
      await interaction.editReply({
        content: '❌ Moderation system is disabled for this server.',
      });
      return;
    }

    // Create moderation case
    const modCase = await moderationService.createCase({
      guildId: interaction.guild.id,
      userId: user.id,
      moderatorId: interaction.user.id,
      action: 'warn',
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

    // Check warning threshold
    const warnings = await moderationService.getUserWarnings(interaction.guild.id, user.id);
    const warningCount = warnings.length;

    const embed = new EmbedBuilder()
      .setColor(0xFFFF00)
      .setTitle('⚠️ User Warned')
      .setDescription(`Successfully warned ${user.tag}`)
      .addFields(
        { name: 'Case Number', value: `#${modCase.caseNumber}`, inline: true },
        { name: 'Warning Count', value: `${warningCount}`, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    // Check if warning threshold is reached
    if (config.warnThreshold && warningCount >= config.warnThreshold && config.warnActionType) {
      embed.addFields({
        name: '⚠️ Threshold Reached',
        value: `User has reached ${warningCount} warnings. Consider taking action: ${config.warnActionType}`,
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Warn Command] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to warn user. Please try again.',
    });
  }
}
