/**
 * /inventory command
 * Show user's inventory
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EconomyService } from '../../services/economy.service';

export const data = new SlashCommandBuilder()
  .setName('inventory')
  .setDescription('View your or another user\'s inventory')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to check inventory for')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    if (!interaction.guildId) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        flags: 64,
      });
    }

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const botId = interaction.client.user.id;

    // Get config and inventory
    const config = await EconomyService.getOrCreateConfig(interaction.guildId, botId);
    const inventory = await EconomyService.getInventory(interaction.guildId, targetUser.id);

    const currencySymbol = config.currencyEmoji || config.currencySymbol;

    if (inventory.length === 0) {
      return interaction.reply({
        content: `${targetUser.id === interaction.user.id ? 'Your' : `${targetUser.username}'s`} inventory is empty.`,
        flags: 64,
      });
    }

    // Build inventory description
    let description = '';
    let totalValue = 0;

    for (const invItem of inventory) {
      const item = invItem.item;
      const emoji = item.emoji || '📦';
      const quantity = invItem.quantity;

      description += `${emoji} **${item.name}** x${quantity}\n`;

      if (item.description) {
        description += `   ➜ ${item.description}\n`;
      }

      // Add expiry info if applicable
      if (invItem.expiresAt) {
        const expiresIn = Math.ceil((invItem.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));
        description += `   ⏰ Expires in ${expiresIn} hours\n`;
      }

      description += `   💰 Value: ${currencySymbol} ${item.price.toLocaleString()} each\n\n`;
      totalValue += item.price * quantity;
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x00aaff)
      .setTitle(`🎒 ${targetUser.username}'s Inventory`)
      .setDescription(description)
      .setThumbnail(targetUser.displayAvatarURL())
      .setFooter({
        text: `Total Items: ${inventory.length} • Total Value: ${currencySymbol} ${totalValue.toLocaleString()}`,
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error: any) {
    console.error('[Economy] Inventory error:', error);
    await interaction.reply({
      content: `❌ An error occurred: ${error.message}`,
      flags: 64,
    });
  }
}
