/**
 * /pay command
 * Transfer money to another user
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EconomyService } from '../../services/economy.service';

export const data = new SlashCommandBuilder()
  .setName('pay')
  .setDescription('Transfer money to another user')
  .addUserOption((option) =>
    option.setName('user').setDescription('The user to pay').setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName('amount')
      .setDescription('Amount to transfer')
      .setRequired(true)
      .setMinValue(1)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    if (!interaction.guildId) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        flags: 64,
      });
    }

    const targetUser = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    const botId = interaction.client.user.id;

    // Validation
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: '❌ You cannot pay yourself!',
        flags: 64,
      });
    }

    if (targetUser.bot) {
      return interaction.reply({
        content: '❌ You cannot pay bots!',
        flags: 64,
      });
    }

    if (amount <= 0) {
      return interaction.reply({
        content: '❌ Amount must be positive!',
        flags: 64,
      });
    }

    // Get config
    const config = await EconomyService.getOrCreateConfig(interaction.guildId, botId);
    const currencySymbol = config.currencyEmoji || config.currencySymbol;

    // Get user economies
    const userEconomy = await EconomyService.getOrCreateUserEconomy(
      interaction.guildId,
      botId,
      interaction.user.id
    );

    // Check balance
    if (userEconomy.balance < amount) {
      return interaction.reply({
        content: `❌ You don't have enough money! Your balance: ${currencySymbol} ${userEconomy.balance.toLocaleString()}`,
        flags: 64,
      });
    }

    // Ensure target user exists in economy
    await EconomyService.getOrCreateUserEconomy(interaction.guildId, botId, targetUser.id);

    // Transfer money
    await EconomyService.transferMoney(interaction.guildId, interaction.user.id, targetUser.id, amount);

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('💸 Payment Successful!')
      .setDescription(
        `You paid **${targetUser.username}** ${currencySymbol} **${amount.toLocaleString()}**`
      )
      .addFields({
        name: 'Your New Balance',
        value: `${currencySymbol} ${(userEconomy.balance - amount).toLocaleString()}`,
        inline: true,
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error: any) {
    console.error('[Economy] Pay error:', error);
    await interaction.reply({
      content: `❌ An error occurred: ${error.message}`,
      flags: 64,
    });
  }
}
