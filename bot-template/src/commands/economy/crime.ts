/**
 * /crime command
 * Attempt crime with success/fail chance
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EconomyService } from '../../services/economy.service';
import prisma from '../../services/prisma-singleton.service';

const DEFAULT_CRIME_RESPONSES = {
  success: [
    'You robbed a bank and got away with',
    'You pickpocketed a rich person and stole',
    'You hacked an ATM and withdrew',
    'You broke into a jewelry store and took',
    'You sold illegal items and earned',
  ],
  fail: [
    'You tried to rob a bank but got caught! Fine:',
    'You got caught pickpocketing! Fine:',
    'Police caught you red-handed! Fine:',
    'You failed to escape! Fine:',
    'You got arrested! Fine:',
  ],
};

export const data = new SlashCommandBuilder()
  .setName('crime')
  .setDescription('Attempt a crime for money (risky!)');

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    if (!interaction.guildId) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        flags: 64,
      });
    }

    const botId = interaction.client.user.id;

    // Get config and user economy
    const config = await EconomyService.getOrCreateConfig(interaction.guildId, botId);

    if (!config.crimeEnabled) {
      return interaction.reply({
        content: '❌ Crime is currently disabled on this server.',
        flags: 64,
      });
    }

    const userEconomy = await EconomyService.getOrCreateUserEconomy(
      interaction.guildId,
      botId,
      interaction.user.id
    );

    // Check cooldown
    if (EconomyService.isCooldownActive(userEconomy.lastCrime, config.crimeCooldown)) {
      const remaining = EconomyService.getRemainingCooldown(
        userEconomy.lastCrime,
        config.crimeCooldown
      );
      return interaction.reply({
        content: `⏰ The heat is on! Wait **${EconomyService.formatCooldown(remaining)}** before attempting another crime.`,
        flags: 64,
      });
    }

    const currencySymbol = config.currencyEmoji || config.currencySymbol;

    // Determine success or failure
    const success = Math.random() * 100 < config.crimeSuccessRate;

    // Get responses
    let crimeResponses = DEFAULT_CRIME_RESPONSES;
    if (config.crimeResponses) {
      try {
        const parsed = JSON.parse(config.crimeResponses as any);
        if (parsed.success && parsed.fail) {
          crimeResponses = parsed;
        }
      } catch (e) {
        // Use default if parsing fails
      }
    }

    let embed: EmbedBuilder;

    if (success) {
      // Success - earn money
      const amount =
        Math.floor(Math.random() * (config.crimeMaxAmount - config.crimeMinAmount + 1)) +
        config.crimeMinAmount;

      const randomResponse =
        crimeResponses.success[Math.floor(Math.random() * crimeResponses.success.length)];

      await EconomyService.addMoney(
        interaction.guildId,
        botId,
        interaction.user.id,
        amount,
        'CRIME',
        'Crime success'
      );

      await prisma.userEconomy.update({
        where: { id: userEconomy.id },
        data: {
          lastCrime: new Date(),
          crimeCount: { increment: 1 },
          crimeSuccesses: { increment: 1 },
        },
      });

      embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ Crime Successful!')
        .setDescription(`${randomResponse} ${currencySymbol} **${amount.toLocaleString()}**`)
        .setFooter({
          text: `Success rate: ${config.crimeSuccessRate}% • Successes: ${userEconomy.crimeSuccesses + 1}/${userEconomy.crimeCount + 1}`,
        })
        .setTimestamp();
    } else {
      // Failure - pay fine
      const fine = Math.floor((userEconomy.balance * config.crimeFinePercent) / 100);
      const actualFine = Math.min(fine, userEconomy.balance);

      const randomResponse =
        crimeResponses.fail[Math.floor(Math.random() * crimeResponses.fail.length)];

      if (actualFine > 0) {
        await EconomyService.removeMoney(
          interaction.guildId,
          interaction.user.id,
          actualFine,
          'CRIME',
          'Crime fine'
        );
      }

      await prisma.userEconomy.update({
        where: { id: userEconomy.id },
        data: {
          lastCrime: new Date(),
          crimeCount: { increment: 1 },
        },
      });

      embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Crime Failed!')
        .setDescription(
          `${randomResponse} ${currencySymbol} **${actualFine.toLocaleString()}**`
        )
        .setFooter({
          text: `Success rate: ${config.crimeSuccessRate}% • Successes: ${userEconomy.crimeSuccesses}/${userEconomy.crimeCount + 1}`,
        })
        .setTimestamp();
    }

    await interaction.reply({ embeds: [embed] });
  } catch (error: any) {
    console.error('[Economy] Crime error:', error);
    await interaction.reply({
      content: `❌ An error occurred: ${error.message}`,
      flags: 64,
    });
  }
}
