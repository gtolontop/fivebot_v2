/**
 * /balance command
 * Show user's balance (wallet + bank)
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EconomyService } from '../../services/economy.service';

export const data = new SlashCommandBuilder()
  .setName('balance')
  .setDescription('Check your or another user\'s balance')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to check balance for')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    if (!interaction.guildId) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        flags: 64, // Ephemeral
      });
    }

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const botId = interaction.client.user.id;

    // Get config and user economy
    const config = await EconomyService.getOrCreateConfig(interaction.guildId, botId);
    const userEconomy = await EconomyService.getOrCreateUserEconomy(
      interaction.guildId,
      botId,
      targetUser.id
    );

    const currencySymbol = config.currencyEmoji || config.currencySymbol;
    const total = userEconomy.balance + userEconomy.bankBalance;

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`${currencySymbol} ${targetUser.username}'s Balance`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        {
          name: 'Wallet',
          value: `${currencySymbol} ${userEconomy.balance.toLocaleString()}`,
          inline: true,
        },
        {
          name: 'Bank',
          value: `${currencySymbol} ${userEconomy.bankBalance.toLocaleString()}`,
          inline: true,
        },
        {
          name: 'Total',
          value: `${currencySymbol} ${total.toLocaleString()}`,
          inline: true,
        }
      )
      .setFooter({ text: `💰 Total Earned: ${currencySymbol} ${userEconomy.totalEarned.toLocaleString()} • Spent: ${currencySymbol} ${userEconomy.totalSpent.toLocaleString()}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error: any) {
    console.error('[Economy] Balance error:', error);
    await interaction.reply({
      content: `❌ An error occurred: ${error.message}`,
      flags: 64,
    });
  }
}
