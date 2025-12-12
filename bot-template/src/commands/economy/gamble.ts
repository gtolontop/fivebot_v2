/**
 * /gamble command
 * Gamble money (slots, coinflip, dice)
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EconomyService } from '../../services/economy.service';
import prisma from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('gamble')
  .setDescription('Gamble your money')
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('Type of gamble')
      .setRequired(true)
      .addChoices(
        { name: '🎰 Slots', value: 'slots' },
        { name: '🪙 Coinflip', value: 'coinflip' },
        { name: '🎲 Dice', value: 'dice' }
      )
  )
  .addIntegerOption((option) =>
    option
      .setName('amount')
      .setDescription('Amount to gamble')
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

    const type = interaction.options.getString('type', true);
    const amount = interaction.options.getInteger('amount', true);
    const botId = interaction.client.user.id;

    // Get config and user economy
    const config = await EconomyService.getOrCreateConfig(interaction.guildId, botId);

    if (!config.gamblingEnabled) {
      return interaction.reply({
        content: '❌ Gambling is currently disabled on this server.',
        flags: 64,
      });
    }

    const userEconomy = await EconomyService.getOrCreateUserEconomy(
      interaction.guildId,
      botId,
      interaction.user.id
    );

    const currencySymbol = config.currencyEmoji || config.currencySymbol;

    // Check min/max bet
    if (amount < config.gamblingMinBet) {
      return interaction.reply({
        content: `❌ Minimum bet is ${currencySymbol} ${config.gamblingMinBet.toLocaleString()}`,
        flags: 64,
      });
    }

    if (config.gamblingMaxBet && amount > config.gamblingMaxBet) {
      return interaction.reply({
        content: `❌ Maximum bet is ${currencySymbol} ${config.gamblingMaxBet.toLocaleString()}`,
        flags: 64,
      });
    }

    // Check balance
    if (userEconomy.balance < amount) {
      return interaction.reply({
        content: `❌ You don't have enough money! Your balance: ${currencySymbol} ${userEconomy.balance.toLocaleString()}`,
        flags: 64,
      });
    }

    let embed: EmbedBuilder;
    let won = false;
    let winnings = 0;

    switch (type) {
      case 'slots':
        ({ embed, won, winnings } = await handleSlots(interaction, amount, currencySymbol));
        break;
      case 'coinflip':
        ({ embed, won, winnings } = await handleCoinflip(interaction, amount, currencySymbol));
        break;
      case 'dice':
        ({ embed, won, winnings } = await handleDice(interaction, amount, currencySymbol));
        break;
      default:
        return interaction.reply({
          content: '❌ Invalid gamble type!',
          flags: 64,
        });
    }

    // Update balance
    if (won) {
      await EconomyService.addMoney(
        interaction.guildId,
        botId,
        interaction.user.id,
        winnings,
        'GAMBLE_WIN',
        `${type} win`
      );
      await prisma.userEconomy.update({
        where: { id: userEconomy.id },
        data: { gamblingWins: { increment: 1 } },
      });
    } else {
      await EconomyService.removeMoney(
        interaction.guildId,
        interaction.user.id,
        amount,
        'GAMBLE_LOSE',
        `${type} loss`
      );
      await prisma.userEconomy.update({
        where: { id: userEconomy.id },
        data: { gamblingLosses: { increment: 1 } },
      });
    }

    await interaction.reply({ embeds: [embed] });
  } catch (error: any) {
    console.error('[Economy] Gamble error:', error);
    await interaction.reply({
      content: `❌ An error occurred: ${error.message}`,
      flags: 64,
    });
  }
}

async function handleSlots(
  interaction: ChatInputCommandInteraction,
  amount: number,
  currencySymbol: string
): Promise<{ embed: EmbedBuilder; won: boolean; winnings: number }> {
  const symbols = ['🍒', '🍋', '🍊', '🍉', '⭐', '💎', '7️⃣'];
  const slot1 = symbols[Math.floor(Math.random() * symbols.length)];
  const slot2 = symbols[Math.floor(Math.random() * symbols.length)];
  const slot3 = symbols[Math.floor(Math.random() * symbols.length)];

  let won = false;
  let multiplier = 0;

  // Check wins
  if (slot1 === slot2 && slot2 === slot3) {
    // All three match
    if (slot1 === '💎') multiplier = 10;
    else if (slot1 === '7️⃣') multiplier = 8;
    else if (slot1 === '⭐') multiplier = 5;
    else multiplier = 3;
    won = true;
  } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
    // Two match
    multiplier = 1.5;
    won = true;
  }

  const winnings = Math.floor(amount * multiplier);

  const embed = new EmbedBuilder()
    .setTitle('🎰 Slot Machine')
    .setDescription(`[ ${slot1} | ${slot2} | ${slot3} ]`)
    .setColor(won ? 0x00ff00 : 0xff0000)
    .addFields({
      name: won ? '✅ You Won!' : '❌ You Lost!',
      value: won
        ? `You won ${currencySymbol} **${winnings.toLocaleString()}** (${multiplier}x)`
        : `You lost ${currencySymbol} **${amount.toLocaleString()}**`,
      inline: false,
    })
    .setTimestamp();

  return { embed, won, winnings };
}

async function handleCoinflip(
  interaction: ChatInputCommandInteraction,
  amount: number,
  currencySymbol: string
): Promise<{ embed: EmbedBuilder; won: boolean; winnings: number }> {
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const won = Math.random() < 0.5;
  const winnings = amount * 2;

  const embed = new EmbedBuilder()
    .setTitle('🪙 Coinflip')
    .setDescription(`The coin landed on **${result}**!`)
    .setColor(won ? 0x00ff00 : 0xff0000)
    .addFields({
      name: won ? '✅ You Won!' : '❌ You Lost!',
      value: won
        ? `You won ${currencySymbol} **${winnings.toLocaleString()}** (2x)`
        : `You lost ${currencySymbol} **${amount.toLocaleString()}**`,
      inline: false,
    })
    .setTimestamp();

  return { embed, won, winnings };
}

async function handleDice(
  interaction: ChatInputCommandInteraction,
  amount: number,
  currencySymbol: string
): Promise<{ embed: EmbedBuilder; won: boolean; winnings: number }> {
  const userRoll = Math.floor(Math.random() * 6) + 1;
  const botRoll = Math.floor(Math.random() * 6) + 1;
  const won = userRoll > botRoll;
  const tie = userRoll === botRoll;

  let winnings = 0;
  let multiplier = 0;

  if (won) {
    if (userRoll === 6 && botRoll === 1) {
      multiplier = 3;
    } else {
      multiplier = 2;
    }
    winnings = amount * multiplier;
  }

  const embed = new EmbedBuilder()
    .setTitle('🎲 Dice Roll')
    .setDescription(`You rolled **${userRoll}**\nBot rolled **${botRoll}**`)
    .setColor(won ? 0x00ff00 : tie ? 0xffaa00 : 0xff0000)
    .addFields({
      name: tie ? '🤝 Tie!' : won ? '✅ You Won!' : '❌ You Lost!',
      value: tie
        ? 'No one wins, you keep your bet!'
        : won
        ? `You won ${currencySymbol} **${winnings.toLocaleString()}** (${multiplier}x)`
        : `You lost ${currencySymbol} **${amount.toLocaleString()}**`,
      inline: false,
    })
    .setTimestamp();

  return { embed, won: tie ? false : won, winnings: tie ? 0 : winnings };
}
