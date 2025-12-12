/**
 * /daily command
 * Claim daily reward with streak bonus
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EconomyService } from '../../services/economy.service';

export const data = new SlashCommandBuilder()
  .setName('daily')
  .setDescription('Claim your daily reward with streak bonus');

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
    const userEconomy = await EconomyService.getOrCreateUserEconomy(
      interaction.guildId,
      botId,
      interaction.user.id
    );

    // Check cooldown
    if (EconomyService.isCooldownActive(userEconomy.lastDaily, config.dailyCooldown)) {
      const remaining = EconomyService.getRemainingCooldown(
        userEconomy.lastDaily,
        config.dailyCooldown
      );
      return interaction.reply({
        content: `⏰ You already claimed your daily reward! Come back in **${EconomyService.formatCooldown(remaining)}**`,
        flags: 64,
      });
    }

    const currencySymbol = config.currencyEmoji || config.currencySymbol;

    // Update streak
    const newStreak = await EconomyService.updateDailyStreak(userEconomy);

    // Calculate bonus
    let bonus = 0;
    if (config.dailyStreakEnabled && newStreak > 1) {
      const bonusPercent = Math.min(
        (newStreak - 1) * config.streakBonusPercent,
        config.maxStreakBonus
      );
      bonus = Math.floor((config.dailyAmount * bonusPercent) / 100);
    }

    const totalAmount = config.dailyAmount + bonus;

    // Add money
    await EconomyService.addMoney(
      interaction.guildId,
      botId,
      interaction.user.id,
      totalAmount,
      'DAILY',
      `Daily reward (Streak: ${newStreak})`
    );

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('📅 Daily Reward Claimed!')
      .setDescription(
        `You received ${currencySymbol} **${config.dailyAmount.toLocaleString()}**${
          bonus > 0 ? ` + ${currencySymbol} **${bonus.toLocaleString()}** streak bonus!` : '!'
        }`
      )
      .addFields(
        {
          name: 'Current Streak',
          value: `🔥 ${newStreak} day${newStreak !== 1 ? 's' : ''}`,
          inline: true,
        },
        {
          name: 'Longest Streak',
          value: `⭐ ${userEconomy.longestStreak} day${userEconomy.longestStreak !== 1 ? 's' : ''}`,
          inline: true,
        }
      )
      .setFooter({ text: 'Come back tomorrow to continue your streak!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error: any) {
    console.error('[Economy] Daily error:', error);
    await interaction.reply({
      content: `❌ An error occurred: ${error.message}`,
      flags: 64,
    });
  }
}
