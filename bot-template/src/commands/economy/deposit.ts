/**
 * /deposit command
 * Deposit money to bank
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EconomyService } from '../../services/economy.service';

export const data = new SlashCommandBuilder()
  .setName('deposit')
  .setDescription('Deposit money into your bank')
  .addStringOption((option) =>
    option
      .setName('amount')
      .setDescription('Amount to deposit (or "all" for everything)')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    if (!interaction.guildId) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        flags: 64,
      });
    }

    const amountInput = interaction.options.getString('amount', true);
    const botId = interaction.client.user.id;

    // Get config and user economy
    const config = await EconomyService.getOrCreateConfig(interaction.guildId, botId);

    if (!config.bankEnabled) {
      return interaction.reply({
        content: '❌ Bank is currently disabled on this server.',
        flags: 64,
      });
    }

    const userEconomy = await EconomyService.getOrCreateUserEconomy(
      interaction.guildId,
      botId,
      interaction.user.id
    );

    const currencySymbol = config.currencyEmoji || config.currencySymbol;

    // Calculate amount
    let amount: number;
    if (amountInput.toLowerCase() === 'all') {
      amount = userEconomy.balance;
    } else {
      amount = parseInt(amountInput);
      if (isNaN(amount) || amount <= 0) {
        return interaction.reply({
          content: '❌ Please provide a valid amount or "all"',
          flags: 64,
        });
      }
    }

    // Check balance
    if (userEconomy.balance < amount) {
      return interaction.reply({
        content: `❌ You don't have enough money to deposit! Your wallet: ${currencySymbol} ${userEconomy.balance.toLocaleString()}`,
        flags: 64,
      });
    }

    // Check bank limit
    if (config.maxBankBalance) {
      const newBankBalance = userEconomy.bankBalance + amount;
      if (newBankBalance > config.maxBankBalance) {
        return interaction.reply({
          content: `❌ This would exceed the bank limit of ${currencySymbol} ${config.maxBankBalance.toLocaleString()}!\nYou can deposit up to ${currencySymbol} ${(config.maxBankBalance - userEconomy.bankBalance).toLocaleString()}`,
          flags: 64,
        });
      }
    }

    // Deposit money
    const updated = await EconomyService.deposit(interaction.guildId, interaction.user.id, amount);

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🏦 Deposit Successful!')
      .setDescription(
        `You deposited ${currencySymbol} **${amount.toLocaleString()}** into your bank`
      )
      .addFields(
        {
          name: 'Wallet',
          value: `${currencySymbol} ${updated.balance.toLocaleString()}`,
          inline: true,
        },
        {
          name: 'Bank',
          value: `${currencySymbol} ${updated.bankBalance.toLocaleString()}`,
          inline: true,
        },
        {
          name: 'Total',
          value: `${currencySymbol} ${(updated.balance + updated.bankBalance).toLocaleString()}`,
          inline: true,
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error: any) {
    console.error('[Economy] Deposit error:', error);
    await interaction.reply({
      content: `❌ An error occurred: ${error.message}`,
      flags: 64,
    });
  }
}
