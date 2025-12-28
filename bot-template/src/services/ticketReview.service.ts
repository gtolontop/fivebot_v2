import {
  Client,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  TextChannel,
} from 'discord.js';
import { PrismaClient } from '@prisma/client';

export class TicketReviewService {
  private client: Client;
  private prisma: PrismaClient;

  constructor(client: Client, prisma: PrismaClient) {
    this.client = client;
    this.prisma = prisma;
  }

  /**
   * Send review request DM to ticket creator after ticket is closed
   */
  async sendReviewRequest(ticket: {
    id: string;
    guildId: string;
    ticketNumber: number;
    creatorId: string;
    assignedStaffId?: string | null;
  }): Promise<boolean> {
    try {
      // Check if review already exists
      const existingReview = await this.prisma.ticketReview.findUnique({
        where: { ticketId: ticket.id },
      });

      if (existingReview) {
        console.log(`[TicketReview] Review already exists for ticket ${ticket.id}`);
        return false;
      }

      // Get guild name
      const guild = this.client.guilds.cache.get(ticket.guildId);
      const guildName = guild?.name || 'Unknown Server';

      // Get user
      const user = await this.client.users.fetch(ticket.creatorId).catch(() => null);
      if (!user) {
        console.log(`[TicketReview] Could not fetch user ${ticket.creatorId}`);
        return false;
      }

      // Create rating select menu
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`ticket_review_rating:${ticket.id}:${ticket.guildId}:${ticket.ticketNumber}:${ticket.assignedStaffId || 'none'}`)
        .setPlaceholder('Select your rating')
        .addOptions([
          { label: '1 Star - Very Poor', value: '1', emoji: '1️⃣' },
          { label: '2 Stars - Poor', value: '2', emoji: '2️⃣' },
          { label: '3 Stars - Average', value: '3', emoji: '3️⃣' },
          { label: '4 Stars - Good', value: '4', emoji: '4️⃣' },
          { label: '5 Stars - Excellent', value: '5', emoji: '5️⃣' },
        ]);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('How was your support experience?')
        .setDescription(
          `Your ticket **#${ticket.ticketNumber}** in **${guildName}** has been closed.\n\n` +
          `Please take a moment to rate your experience. Your feedback helps us improve!`
        )
        .setFooter({ text: 'Thank you for your feedback!' })
        .setTimestamp();

      await user.send({ embeds: [embed], components: [row] });
      console.log(`[TicketReview] Sent review request to ${user.tag} for ticket #${ticket.ticketNumber}`);
      return true;
    } catch (error: any) {
      // User might have DMs disabled
      if (error.code === 50007) {
        console.log(`[TicketReview] Cannot send DM to user ${ticket.creatorId} (DMs disabled)`);
      } else {
        console.error(`[TicketReview] Error sending review request:`, error);
      }
      return false;
    }
  }

  /**
   * Handle rating select menu interaction
   */
  async handleRatingSelect(interaction: StringSelectMenuInteraction): Promise<void> {
    const [, ticketId, guildId, ticketNumber, staffId] = interaction.customId.split(':');
    const rating = parseInt(interaction.values[0], 10);

    // Show modal for review text
    const modal = new ModalBuilder()
      .setCustomId(`ticket_review_modal:${ticketId}:${guildId}:${ticketNumber}:${staffId}:${rating}`)
      .setTitle('Write a Review (Optional)');

    const reviewInput = new TextInputBuilder()
      .setCustomId('review_text')
      .setLabel('Your feedback (optional)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Tell us about your experience...')
      .setMaxLength(1000)
      .setRequired(false);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(reviewInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  /**
   * Handle review modal submission
   */
  async handleReviewModal(interaction: ModalSubmitInteraction): Promise<void> {
    const [, ticketId, guildId, ticketNumber, staffId, ratingStr] = interaction.customId.split(':');
    const rating = parseInt(ratingStr, 10);
    const reviewText = interaction.fields.getTextInputValue('review_text') || null;

    await interaction.deferUpdate();

    try {
      // Save the review
      const review = await this.prisma.ticketReview.create({
        data: {
          ticketId,
          guildId,
          userId: interaction.user.id,
          staffId: staffId !== 'none' ? staffId : null,
          ticketNumber: parseInt(ticketNumber, 10),
          rating,
          review: reviewText,
        },
      });

      // Update the DM message
      const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
      const thankYouEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('Thank you for your feedback!')
        .setDescription(
          `Your rating: ${stars}\n\n` +
          (reviewText ? `Your review: "${reviewText}"` : 'No additional comments.')
        )
        .setFooter({ text: 'Your feedback has been recorded.' })
        .setTimestamp();

      await interaction.editReply({ embeds: [thankYouEmbed], components: [] });

      // Send to review channel
      await this.sendToReviewChannel(review, interaction.user.tag);

      console.log(`[TicketReview] Review saved for ticket ${ticketId}: ${rating} stars`);
    } catch (error) {
      console.error(`[TicketReview] Error saving review:`, error);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('Error')
        .setDescription('Failed to save your review. Please try again later.')
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed], components: [] });
    }
  }

  /**
   * Send review to the configured review channel
   */
  async sendToReviewChannel(
    review: {
      id: string;
      ticketId: string;
      guildId: string;
      userId: string;
      staffId: string | null;
      ticketNumber: number;
      rating: number;
      review: string | null;
    },
    userTag: string
  ): Promise<void> {
    try {
      // Get ticket config for review channel
      const config = await this.prisma.ticketConfig.findUnique({
        where: { guildId: review.guildId },
      });

      if (!config?.reviewChannelId) {
        console.log(`[TicketReview] No review channel configured for guild ${review.guildId}`);
        return;
      }

      const guild = this.client.guilds.cache.get(review.guildId);
      if (!guild) return;

      const channel = await guild.channels.fetch(config.reviewChannelId).catch(() => null);
      if (!channel || !channel.isTextBased()) return;

      const stars = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
      const ratingColor = review.rating >= 4 ? 0x00ff00 : review.rating >= 3 ? 0xffaa00 : 0xff0000;

      const embed = new EmbedBuilder()
        .setColor(ratingColor)
        .setTitle(`Ticket #${review.ticketNumber} Review`)
        .addFields(
          { name: 'Rating', value: stars, inline: true },
          { name: 'User', value: `<@${review.userId}>`, inline: true }
        )
        .setFooter({ text: `Review ID: ${review.id}` })
        .setTimestamp();

      if (review.staffId) {
        embed.addFields({ name: 'Staff', value: `<@${review.staffId}>`, inline: true });
      }

      if (review.review) {
        embed.addFields({ name: 'Feedback', value: review.review, inline: false });
      }

      await (channel as TextChannel).send({ embeds: [embed] });
      console.log(`[TicketReview] Review sent to channel ${config.reviewChannelId}`);
    } catch (error) {
      console.error(`[TicketReview] Error sending to review channel:`, error);
    }
  }

  /**
   * Get staff stats for a guild
   */
  async getStaffStats(guildId: string): Promise<{
    overall: { avgRating: number; totalReviews: number };
    byStaff: Array<{ staffId: string; avgRating: number; reviewCount: number }>;
    monthly: Array<{ month: string; avgRating: number; reviewCount: number }>;
  }> {
    // Overall stats
    const overallStats = await this.prisma.ticketReview.aggregate({
      where: { guildId },
      _avg: { rating: true },
      _count: { id: true },
    });

    // Stats by staff
    const staffStats = await this.prisma.ticketReview.groupBy({
      by: ['staffId'],
      where: { guildId, staffId: { not: null } },
      _avg: { rating: true },
      _count: { id: true },
      orderBy: { _avg: { rating: 'desc' } },
      take: 10,
    });

    // Monthly stats (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyReviews = await this.prisma.ticketReview.findMany({
      where: {
        guildId,
        createdAt: { gte: sixMonthsAgo },
      },
      select: {
        rating: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by month
    const monthlyMap = new Map<string, { total: number; count: number }>();
    monthlyReviews.forEach((review) => {
      const monthKey = `${review.createdAt.getFullYear()}-${String(review.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyMap.get(monthKey) || { total: 0, count: 0 };
      monthlyMap.set(monthKey, {
        total: existing.total + review.rating,
        count: existing.count + 1,
      });
    });

    const monthly = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      avgRating: Math.round((data.total / data.count) * 100) / 100,
      reviewCount: data.count,
    }));

    return {
      overall: {
        avgRating: Math.round((overallStats._avg.rating || 0) * 100) / 100,
        totalReviews: overallStats._count.id,
      },
      byStaff: staffStats.map((s) => ({
        staffId: s.staffId!,
        avgRating: Math.round((s._avg.rating || 0) * 100) / 100,
        reviewCount: s._count.id,
      })),
      monthly,
    };
  }

  /**
   * Generate stats embed for /ticket-stats command
   */
  async generateStatsEmbed(guildId: string): Promise<EmbedBuilder> {
    const stats = await this.getStaffStats(guildId);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📊 Ticket Review Statistics')
      .setTimestamp();

    // Overall stats
    const overallStars = '⭐'.repeat(Math.round(stats.overall.avgRating));
    embed.addFields({
      name: '📈 Overall Rating',
      value: `${overallStars} **${stats.overall.avgRating}/5** (${stats.overall.totalReviews} reviews)`,
      inline: false,
    });

    // Staff leaderboard
    if (stats.byStaff.length > 0) {
      const staffList = await Promise.all(
        stats.byStaff.slice(0, 5).map(async (s, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '▫️';
          return `${medal} <@${s.staffId}> - **${s.avgRating}/5** (${s.reviewCount} reviews)`;
        })
      );

      embed.addFields({
        name: '👥 Top Staff',
        value: staffList.join('\n') || 'No staff reviews yet',
        inline: false,
      });
    }

    // Monthly trend
    if (stats.monthly.length > 0) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const trendList = stats.monthly.slice(-4).map((m) => {
        const [year, month] = m.month.split('-');
        const monthName = monthNames[parseInt(month, 10) - 1];
        const bar = '█'.repeat(Math.round(m.avgRating)) + '░'.repeat(5 - Math.round(m.avgRating));
        return `${monthName} ${year}: ${bar} **${m.avgRating}** (${m.reviewCount})`;
      });

      embed.addFields({
        name: '📅 Monthly Trend',
        value: trendList.join('\n') || 'No monthly data yet',
        inline: false,
      });

      // Compare current vs previous month
      if (stats.monthly.length >= 2) {
        const current = stats.monthly[stats.monthly.length - 1];
        const previous = stats.monthly[stats.monthly.length - 2];
        const diff = current.avgRating - previous.avgRating;
        const trend = diff > 0 ? `📈 +${diff.toFixed(2)}` : diff < 0 ? `📉 ${diff.toFixed(2)}` : '➡️ No change';

        embed.addFields({
          name: '📊 Month-over-Month',
          value: trend,
          inline: true,
        });
      }
    }

    embed.setFooter({ text: 'Stats based on all ticket reviews' });

    return embed;
  }
}
