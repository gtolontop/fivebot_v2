/**
 * /money-leaderboard command
 * Show richest users
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EconomyService } from '../../services/economy.service';

export const data = new SlashCommandBuilder()
  .setName('money-leaderboard')
  .setDescription('View the richest users on the server')
  .addIntegerOption((option) =>
    option
      .setName('limit')
      .setDescription('Number of users to show (default: 10)')
      .setRequired(false)
      .setMinValue(5)
      .setMaxValue(25)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    if (!interaction.guildId) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        flags: 64,
      });
    }

    const limit = interaction.options.getInteger('limit') || 10;
    const botId = interaction.client.user.id;

    // Get config and leaderboard
    const config = await EconomyService.getOrCreateConfig(interaction.guildId, botId);
    const leaderboard = await EconomyService.getLeaderboard(interaction.guildId, limit);

    const currencySymbol = config.currencyEmoji || config.currencySymbol;

    if (leaderboard.length === 0) {
      return interaction.reply({
        content: '❌ No users found in the economy system yet.',
        flags: 64,
      });
    }

    // Build leaderboard description
    let description = '';
    for (let i = 0; i < leaderboard.length; i++) {
      const user = leaderboard[i];
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      const total = user.balance + user.bankBalance;

      try {
        const discordUser = await interaction.client.users.fetch(user.userId);
        description += `${medal} **${discordUser.username}** - ${currencySymbol} ${total.toLocaleString()}\n`;
        description += `   ➜ Wallet: ${currencySymbol} ${user.balance.toLocaleString()} | Bank: ${currencySymbol} ${user.bankBalance.toLocaleString()}\n`;
      } catch (error) {
        description += `${medal} **Unknown User** - ${currencySymbol} ${total.toLocaleString()}\n`;
      }
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('💰 Money Leaderboard')
      .setDescription(description)
      .setFooter({ text: `Top ${leaderboard.length} users • Total wealth displayed` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error: any) {
    console.error('[Economy] Leaderboard error:', error);
    await interaction.reply({
      content: `❌ An error occurred: ${error.message}`,
      flags: 64,
    });
  }
}
