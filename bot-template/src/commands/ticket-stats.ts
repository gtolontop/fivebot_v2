import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  EmbedBuilder
} from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { TicketReviewService } from '../services/ticketReview.service';

const prisma = new PrismaClient();

export const data = new SlashCommandBuilder()
  .setName('ticket-stats')
  .setDescription('View ticket review statistics (Staff only)');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId) {
    await interaction.editReply('❌ This command can only be used in a server.');
    return;
  }

  // Check if user is staff
  const ticketConfig = await prisma.ticketConfig.findUnique({
    where: { guildId: interaction.guildId }
  });

  if (!ticketConfig) {
    await interaction.editReply('❌ Ticket system is not configured for this server.');
    return;
  }

  const member = interaction.member as GuildMember;
  const staffRoles = ticketConfig.staffRoles ? JSON.parse(ticketConfig.staffRoles as string) : [];
  const hasStaffRole = ticketConfig.staffRoleId
    ? member.roles.cache.has(ticketConfig.staffRoleId)
    : staffRoles.some((roleId: string) => member.roles.cache.has(roleId));

  if (!hasStaffRole) {
    await interaction.editReply('❌ This command is only available for staff members.');
    return;
  }

  try {
    const reviewService = new TicketReviewService(interaction.client, prisma);
    const statsEmbed = await reviewService.generateStatsEmbed(interaction.guildId);

    await interaction.editReply({ embeds: [statsEmbed] });
  } catch (error) {
    console.error('[TicketStats] Error generating stats:', error);
    await interaction.editReply('❌ Failed to generate statistics. Please try again.');
  }
}
