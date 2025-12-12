/**
 * /giveaway info command
 * Show detailed information about a giveaway
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';
import { GiveawayService } from '../../services/giveaway.service';

export const data = new SlashCommandBuilder()
  .setName('giveaway-info')
  .setDescription('Show detailed information about a giveaway')
  .addStringOption(option =>
    option
      .setName('message-id')
      .setDescription('The message ID of the giveaway')
      .setRequired(true)
  );

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

    // Parse data
    const entries = giveaway.entries ? JSON.parse(giveaway.entries as string) : [];
    const requirements = giveaway.requirements ? JSON.parse(giveaway.requirements as string) : {};
    const bonusEntries = giveaway.bonusEntries ? JSON.parse(giveaway.bonusEntries as string) : null;
    const winners = giveaway.winners ? JSON.parse(giveaway.winners as string) : [];

    const endTimestamp = Math.floor(new Date(giveaway.endTime).getTime() / 1000);
    const createdTimestamp = Math.floor(new Date(giveaway.createdAt).getTime() / 1000);

    const embed = new EmbedBuilder()
      .setColor(giveaway.ended ? 0x808080 : 0x00ff00)
      .setTitle(`${giveaway.ended ? '🏁' : '🎉'} ${giveaway.prize}`)
      .setDescription(`Detailed information about this giveaway`)
      .addFields(
        {
          name: '📊 Statistics',
          value:
            `**Status:** ${giveaway.ended ? 'Ended' : 'Active'}\n` +
            `**Entries:** ${entries.length}\n` +
            `**Winners:** ${giveaway.winnersCount}\n` +
            `**Host:** <@${giveaway.hostId}>`,
          inline: true,
        },
        {
          name: '⏰ Timing',
          value:
            `**Created:** <t:${createdTimestamp}:R>\n` +
            `**Ends:** <t:${endTimestamp}:R>\n` +
            `**Channel:** <#${giveaway.channelId}>`,
          inline: true,
        }
      )
      .setTimestamp();

    // Add requirements if any
    if (requirements.roleId || requirements.level || requirements.messages) {
      const reqList: string[] = [];
      if (requirements.roleId) reqList.push(`Role: <@&${requirements.roleId}>`);
      if (requirements.level) reqList.push(`Level: ${requirements.level}+`);
      if (requirements.messages) reqList.push(`Messages: ${requirements.messages}+`);

      embed.addFields({
        name: '📋 Requirements',
        value: reqList.join('\n'),
        inline: false,
      });
    }

    // Add bonus entries info
    if (bonusEntries) {
      embed.addFields({
        name: '⭐ Bonus Entries',
        value: `<@&${bonusEntries.roleId}> gets **${bonusEntries.multiplier}x** entries`,
        inline: false,
      });
    }

    // Add winners if ended
    if (giveaway.ended && winners.length > 0) {
      embed.addFields({
        name: '🏆 Winners',
        value: winners.map((w: string) => `<@${w}>`).join(', '),
        inline: false,
      });
    }

    embed.addFields({
      name: '🔗 Links',
      value: `[Jump to Giveaway](https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId})`,
      inline: false,
    });

    await interaction.editReply({ embeds: [embed] });

  } catch (error: any) {
    console.error('[Giveaway] Error fetching giveaway info:', error);
    await interaction.editReply({
      content: `❌ Failed to fetch giveaway info: ${error.message}`,
    });
  }
}
