/**
 * /give-money command
 * Admin command to give money to users
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { EconomyService } from '../../services/economy.service';

export const data = new SlashCommandBuilder()
  .setName('give-money')
  .setDescription('Give money to a user (Admin only)')
  .addUserOption((option) =>
    option.setName('user').setDescription('The user to give money to').setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName('amount')
      .setDescription('Amount to give')
      .setRequired(true)
      .setMinValue(1)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    if (!interaction.guildId) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        flags: 64,
      });
    }

    // Check if user has admin permissions
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ You need Administrator permission to use this command!',
        flags: 64,
      });
    }

    const targetUser = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    const botId = interaction.client.user.id;

    // Validation
    if (targetUser.bot) {
      return interaction.reply({
        content: '❌ You cannot give money to bots!',
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

    // Ensure target user exists in economy
    await EconomyService.getOrCreateUserEconomy(interaction.guildId, botId, targetUser.id);

    // Add money
    await EconomyService.addMoney(
      interaction.guildId,
      botId,
      targetUser.id,
      amount,
      'ADMIN_ADD',
      `Admin gift from ${interaction.user.username}`
    );

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('💰 Money Granted')
      .setDescription(
        `Successfully gave ${currencySymbol} **${amount.toLocaleString()}** to **${targetUser.username}**`
      )
      .addFields(
        {
          name: 'Admin',
          value: interaction.user.username,
          inline: true,
        },
        {
          name: 'Recipient',
          value: targetUser.username,
          inline: true,
        },
        {
          name: 'Amount',
          value: `${currencySymbol} ${amount.toLocaleString()}`,
          inline: true,
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Optionally notify the user
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('💰 You Received Money!')
        .setDescription(
          `An administrator gave you ${currencySymbol} **${amount.toLocaleString()}** in **${interaction.guild?.name}**!`
        )
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] });
    } catch (error) {
      // User has DMs disabled, ignore
    }
  } catch (error: any) {
    console.error('[Economy] Give money error:', error);
    await interaction.reply({
      content: `❌ An error occurred: ${error.message}`,
      flags: 64,
    });
  }
}
