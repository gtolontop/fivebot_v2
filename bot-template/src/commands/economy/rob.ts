/**
 * /rob command
 * Rob another user with success/fail chance
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EconomyService } from '../../services/economy.service';
import prisma from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('rob')
  .setDescription('Attempt to rob another user (risky!)')
  .addUserOption((option) =>
    option.setName('user').setDescription('The user to rob').setRequired(true)
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
    const botId = interaction.client.user.id;

    // Validation
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: '❌ You cannot rob yourself!',
        flags: 64,
      });
    }

    if (targetUser.bot) {
      return interaction.reply({
        content: '❌ You cannot rob bots!',
        flags: 64,
      });
    }

    // Get config and user economy
    const config = await EconomyService.getOrCreateConfig(interaction.guildId, botId);

    if (!config.robEnabled) {
      return interaction.reply({
        content: '❌ Robbery is currently disabled on this server.',
        flags: 64,
      });
    }

    const userEconomy = await EconomyService.getOrCreateUserEconomy(
      interaction.guildId,
      botId,
      interaction.user.id
    );

    const targetEconomy = await EconomyService.getOrCreateUserEconomy(
      interaction.guildId,
      botId,
      targetUser.id
    );

    // Check cooldown
    if (EconomyService.isCooldownActive(userEconomy.lastRob, config.robCooldown)) {
      const remaining = EconomyService.getRemainingCooldown(
        userEconomy.lastRob,
        config.robCooldown
      );
      return interaction.reply({
        content: `⏰ You're too well-known! Wait **${EconomyService.formatCooldown(remaining)}** before robbing again.`,
        flags: 64,
      });
    }

    // Check target has enough money
    if (targetEconomy.balance < config.robMinAmount) {
      return interaction.reply({
        content: `❌ ${targetUser.username} doesn't have enough money to rob! (Minimum: ${config.robMinAmount})`,
        flags: 64,
      });
    }

    const currencySymbol = config.currencyEmoji || config.currencySymbol;

    // Determine success or failure
    const success = Math.random() * 100 < config.robSuccessRate;

    let embed: EmbedBuilder;

    if (success) {
      // Success - rob money
      const maxSteal = Math.floor((targetEconomy.balance * config.robMaxPercent) / 100);
      const amount =
        Math.floor(Math.random() * (maxSteal - config.robMinAmount + 1)) + config.robMinAmount;

      // Transfer money
      await prisma.$transaction([
        prisma.userEconomy.update({
          where: { id: targetEconomy.id },
          data: {
            balance: { decrement: amount },
            timesRobbed: { increment: 1 },
          },
        }),
        prisma.economyTransaction.create({
          data: {
            economyId: targetEconomy.id,
            type: 'ROBBED',
            amount: -amount,
            balanceBefore: targetEconomy.balance,
            balanceAfter: targetEconomy.balance - amount,
            targetUserId: interaction.user.id,
            description: `Robbed by ${interaction.user.username}`,
          },
        }),
        prisma.userEconomy.update({
          where: { id: userEconomy.id },
          data: {
            balance: { increment: amount },
            lastRob: new Date(),
            robCount: { increment: 1 },
            robSuccesses: { increment: 1 },
          },
        }),
        prisma.economyTransaction.create({
          data: {
            economyId: userEconomy.id,
            type: 'ROB',
            amount,
            balanceBefore: userEconomy.balance,
            balanceAfter: userEconomy.balance + amount,
            targetUserId: targetUser.id,
            description: `Robbed ${targetUser.username}`,
          },
        }),
      ]);

      embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('💰 Robbery Successful!')
        .setDescription(
          `You successfully robbed **${targetUser.username}** and stole ${currencySymbol} **${amount.toLocaleString()}**!`
        )
        .setFooter({
          text: `Success rate: ${config.robSuccessRate}% • Successes: ${userEconomy.robSuccesses + 1}/${userEconomy.robCount + 1}`,
        })
        .setTimestamp();
    } else {
      // Failure - pay fine to victim
      const fine = Math.floor((userEconomy.balance * config.robMaxPercent) / 100);
      const actualFine = Math.min(fine, userEconomy.balance);

      if (actualFine > 0) {
        await prisma.$transaction([
          prisma.userEconomy.update({
            where: { id: userEconomy.id },
            data: {
              balance: { decrement: actualFine },
              lastRob: new Date(),
              robCount: { increment: 1 },
            },
          }),
          prisma.economyTransaction.create({
            data: {
              economyId: userEconomy.id,
              type: 'ROB',
              amount: -actualFine,
              balanceBefore: userEconomy.balance,
              balanceAfter: userEconomy.balance - actualFine,
              targetUserId: targetUser.id,
              description: `Failed to rob ${targetUser.username}`,
            },
          }),
          prisma.userEconomy.update({
            where: { id: targetEconomy.id },
            data: { balance: { increment: actualFine } },
          }),
          prisma.economyTransaction.create({
            data: {
              economyId: targetEconomy.id,
              type: 'ROBBED',
              amount: actualFine,
              balanceBefore: targetEconomy.balance,
              balanceAfter: targetEconomy.balance + actualFine,
              targetUserId: interaction.user.id,
              description: `Caught ${interaction.user.username} robbing`,
            },
          }),
        ]);
      } else {
        await prisma.userEconomy.update({
          where: { id: userEconomy.id },
          data: {
            lastRob: new Date(),
            robCount: { increment: 1 },
          },
        });
      }

      embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Robbery Failed!')
        .setDescription(
          `**${targetUser.username}** caught you trying to rob them! You paid ${currencySymbol} **${actualFine.toLocaleString()}** as compensation.`
        )
        .setFooter({
          text: `Success rate: ${config.robSuccessRate}% • Successes: ${userEconomy.robSuccesses}/${userEconomy.robCount + 1}`,
        })
        .setTimestamp();
    }

    await interaction.reply({ embeds: [embed] });
  } catch (error: any) {
    console.error('[Economy] Rob error:', error);
    await interaction.reply({
      content: `❌ An error occurred: ${error.message}`,
      flags: 64,
    });
  }
}
