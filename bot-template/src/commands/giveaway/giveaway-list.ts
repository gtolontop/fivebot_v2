/**
 * /giveaway list command
 * List all active giveaways
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';
import { GiveawayService } from '../../services/giveaway.service';

export const data = new SlashCommandBuilder()
  .setName('giveaway-list')
  .setDescription('List all active giveaways in this server');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId) {
    await interaction.editReply({
      content: '❌ This command can only be used in a server.',
    });
    return;
  }

  try {
    const giveawayService = new GiveawayService();
    const giveaways = await giveawayService.getActiveGiveaways(interaction.guildId);

    if (giveaways.length === 0) {
      await interaction.editReply({
        content: '📭 There are no active giveaways in this server.',
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`🎉 Active Giveaways (${giveaways.length})`)
      .setDescription('Here are all the active giveaways in this server:')
      .setTimestamp();

    for (const giveaway of giveaways) {
      const endTimestamp = Math.floor(new Date(giveaway.endTime).getTime() / 1000);
      const entries = giveaway.entries ? JSON.parse(giveaway.entries as string).length : 0;

      embed.addFields({
        name: `🎁 ${giveaway.prize}`,
        value:
          `**Channel:** <#${giveaway.channelId}>\n` +
          `**Winners:** ${giveaway.winnersCount}\n` +
          `**Entries:** ${entries}\n` +
          `**Ends:** <t:${endTimestamp}:R>\n` +
          `**Message ID:** \`${giveaway.messageId}\``,
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error: any) {
    console.error('[Giveaway] Error listing giveaways:', error);
    await interaction.editReply({
      content: `❌ Failed to list giveaways: ${error.message}`,
    });
  }
}
