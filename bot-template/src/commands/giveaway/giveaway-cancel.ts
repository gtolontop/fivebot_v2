/**
 * /giveaway cancel command
 * Cancel a giveaway without picking winners
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import { GiveawayService } from '../../services/giveaway.service';

export const data = new SlashCommandBuilder()
  .setName('giveaway-cancel')
  .setDescription('Cancel a giveaway without picking winners')
  .addStringOption(option =>
    option
      .setName('message-id')
      .setDescription('The message ID of the giveaway')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Reason for cancellation')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId || !interaction.guild) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  try {
    const messageId = interaction.options.getString('message-id', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const giveawayService = new GiveawayService();

    // Find the giveaway
    const giveaway = await giveawayService.getGiveawayByMessageId(messageId);

    if (!giveaway) {
      await interaction.editReply({
        content: '❌ Giveaway not found. Please check the message ID.',
      });
      return;
    }

    if (giveaway.guildId !== interaction.guildId) {
      await interaction.editReply({
        content: '❌ This giveaway does not belong to this server.',
      });
      return;
    }

    if (giveaway.ended) {
      await interaction.editReply({
        content: '❌ This giveaway has already ended.',
      });
      return;
    }

    // Mark as cancelled
    await giveawayService.cancelGiveaway(giveaway.id);

    // Update the giveaway message
    try {
      const channel = await interaction.guild.channels.fetch(giveaway.channelId) as TextChannel;
      const message = await channel.messages.fetch(giveaway.messageId);

      const cancelledEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`❌ ${giveaway.prize} [CANCELLED]`)
        .setDescription(
          `This giveaway has been cancelled.\n\n` +
          `**Reason:** ${reason}\n` +
          `**Cancelled by:** ${interaction.user}`
        )
        .setFooter({ text: 'Giveaway Cancelled' })
        .setTimestamp();

      await message.edit({
        embeds: [cancelledEmbed],
        components: [],
      });
    } catch (error) {
      console.error('[Giveaway] Error updating cancelled message:', error);
    }

    await interaction.editReply({
      content: '✅ Giveaway cancelled successfully.',
    });

  } catch (error: any) {
    console.error('[Giveaway] Error cancelling giveaway:', error);
    await interaction.editReply({
      content: `❌ Failed to cancel giveaway: ${error.message}`,
    });
  }
}
