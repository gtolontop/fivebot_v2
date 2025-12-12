/**
 * /work command
 * Work to earn money with cooldown
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EconomyService } from '../../services/economy.service';

const DEFAULT_WORK_RESPONSES = [
  'You worked as a developer and earned',
  'You delivered packages and earned',
  'You worked at a restaurant and earned',
  'You did freelance work and earned',
  'You worked at a store and earned',
  'You completed a project and earned',
  'You helped someone and earned',
  'You sold some items and earned',
];

export const data = new SlashCommandBuilder()
  .setName('work')
  .setDescription('Work to earn money');

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
    if (EconomyService.isCooldownActive(userEconomy.lastWork, config.workCooldown)) {
      const remaining = EconomyService.getRemainingCooldown(
        userEconomy.lastWork,
        config.workCooldown
      );
      return interaction.reply({
        content: `⏰ You're too tired to work! Rest for **${EconomyService.formatCooldown(remaining)}**`,
        flags: 64,
      });
    }

    const currencySymbol = config.currencyEmoji || config.currencySymbol;

    // Calculate random earnings
    const amount =
      Math.floor(Math.random() * (config.workMaxAmount - config.workMinAmount + 1)) +
      config.workMinAmount;

    // Get random work response
    let workResponses = DEFAULT_WORK_RESPONSES;
    if (config.workResponses) {
      try {
        const parsed = JSON.parse(config.workResponses as any);
        if (Array.isArray(parsed) && parsed.length > 0) {
          workResponses = parsed;
        }
      } catch (e) {
        // Use default if parsing fails
      }
    }

    const randomResponse =
      workResponses[Math.floor(Math.random() * workResponses.length)];

    // Add money and update stats
    await EconomyService.addMoney(
      interaction.guildId,
      botId,
      interaction.user.id,
      amount,
      'WORK',
      'Work earnings'
    );

    await EconomyService.getOrCreateUserEconomy(
      interaction.guildId,
      botId,
      interaction.user.id
    ).then((ue) =>
      prisma.userEconomy.update({
        where: { id: ue.id },
        data: {
          lastWork: new Date(),
          workCount: { increment: 1 },
        },
      })
    );

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('💼 Work Complete!')
      .setDescription(`${randomResponse} ${currencySymbol} **${amount.toLocaleString()}**`)
      .setFooter({
        text: `Total work sessions: ${userEconomy.workCount + 1} • Come back in ${EconomyService.formatCooldown(config.workCooldown)}`,
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error: any) {
    console.error('[Economy] Work error:', error);
    await interaction.reply({
      content: `❌ An error occurred: ${error.message}`,
      flags: 64,
    });
  }
}

// Add prisma import at top of file
import prisma from '../../services/prisma-singleton.service';
