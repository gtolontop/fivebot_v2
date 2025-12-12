/**
 * /giveaway reroll command
 * Reroll winners for a giveaway
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { GiveawayService } from '../../services/giveaway.service';

export const data = new SlashCommandBuilder()
  .setName('giveaway-reroll')
  .setDescription('Reroll winners for a giveaway')
  .addStringOption(option =>
    option
      .setName('message-id')
      .setDescription('The message ID of the giveaway')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option
      .setName('winners')
      .setDescription('Number of winners to reroll (defaults to original count)')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(20)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  try {
    const messageId = interaction.options.getString('message-id', true);
    const winnersCount = interaction.options.getInteger('winners');
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

    if (!giveaway.ended) {
      await interaction.editReply({
        content: '❌ This giveaway has not ended yet. Use `/giveaway-end` to end it first.',
      });
      return;
    }

    // Reroll the giveaway
    const count = winnersCount || giveaway.winnersCount;
    await giveawayService.rerollGiveaway(giveaway.id, count, interaction.client);

    await interaction.editReply({
      content: `✅ Rerolled ${count} winner(s)! New winners have been announced.`,
    });

  } catch (error: any) {
    console.error('[Giveaway] Error rerolling giveaway:', error);
    await interaction.editReply({
      content: `❌ Failed to reroll giveaway: ${error.message}`,
    });
  }
}
