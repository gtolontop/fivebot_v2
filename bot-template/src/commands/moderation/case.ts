import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { ModerationService } from '../../services/moderation.service';
import { getPrismaClient } from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('case')
  .setDescription('View details of a moderation case')
  .addIntegerOption(option =>
    option
      .setName('case-number')
      .setDescription('The case number to view')
      .setRequired(true)
      .setMinValue(1)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const caseNumber = interaction.options.getInteger('case-number', true);

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

    // Get case
    const modCase = await moderationService.getCase(interaction.guild.id, caseNumber);

    if (!modCase) {
      await interaction.editReply({
        content: `❌ Case #${caseNumber} not found.`,
      });
      return;
    }

    // Fetch user and moderator
    const user = await interaction.client.users.fetch(modCase.userId).catch(() => null);
    const moderator = await interaction.client.users.fetch(modCase.moderatorId).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📋 Case #${modCase.caseNumber}`)
      .addFields(
        {
          name: 'Action',
          value: modCase.action.toUpperCase(),
          inline: true,
        },
        {
          name: 'Status',
          value: modCase.resolved ? '✅ Resolved' : '⏳ Active',
          inline: true,
        },
        {
          name: 'User',
          value: user ? `${user.tag} (${user.id})` : `Unknown (${modCase.userId})`,
          inline: false,
        },
        {
          name: 'Moderator',
          value: moderator ? moderator.tag : `Unknown (${modCase.moderatorId})`,
          inline: true,
        },
        {
          name: 'Reason',
          value: modCase.reason || 'No reason provided',
          inline: false,
        }
      )
      .setTimestamp(new Date(modCase.createdAt))
      .setFooter({ text: `Created` });

    if (modCase.duration) {
      const hours = Math.floor(modCase.duration / 60);
      const minutes = modCase.duration % 60;
      let durationStr = '';
      if (hours > 0) durationStr += `${hours}h `;
      if (minutes > 0) durationStr += `${minutes}m`;

      embed.addFields({
        name: 'Duration',
        value: durationStr.trim(),
        inline: true,
      });
    }

    if (modCase.expiresAt) {
      embed.addFields({
        name: 'Expires',
        value: `<t:${Math.floor(new Date(modCase.expiresAt).getTime() / 1000)}:R>`,
        inline: true,
      });
    }

    if (modCase.notes) {
      embed.addFields({
        name: 'Notes',
        value: modCase.notes,
        inline: false,
      });
    }

    if (modCase.resolved && modCase.resolvedBy) {
      const resolver = await interaction.client.users.fetch(modCase.resolvedBy).catch(() => null);
      embed.addFields({
        name: 'Resolved By',
        value: resolver ? resolver.tag : `Unknown (${modCase.resolvedBy})`,
        inline: true,
      });

      if (modCase.resolvedAt) {
        embed.addFields({
          name: 'Resolved At',
          value: `<t:${Math.floor(new Date(modCase.resolvedAt).getTime() / 1000)}:f>`,
          inline: true,
        });
      }
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Case Command] Error:', error);
    await interaction.editReply({
      content: '❌ Failed to fetch case details. Please try again.',
    });
  }
}
