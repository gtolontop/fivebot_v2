/**
 * /giveaway end command
 * End a giveaway early
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { GiveawayService } from '../../services/giveaway.service';

export const data = new SlashCommandBuilder()
  .setName('giveaway-end')
  .setDescription('End a giveaway early')
  .addStringOption(option =>
    option
      .setName('message-id')
      .setDescription('The message ID of the giveaway')
      .setRequired(true)
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

    // End the giveaway
    await giveawayService.endGiveaway(giveaway.id, interaction.client);

    await interaction.editReply({
      content: '✅ Giveaway ended successfully! Winners have been selected.',
    });

  } catch (error: any) {
    console.error('[Giveaway] Error ending giveaway:', error);
    await interaction.editReply({
      content: `❌ Failed to end giveaway: ${error.message}`,
    });
  }
}
