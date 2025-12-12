/**
 * /shop command
 * Browse shop items
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EconomyService } from '../../services/economy.service';

export const data = new SlashCommandBuilder()
  .setName('shop')
  .setDescription('Browse the server shop')
  .addStringOption((option) =>
    option.setName('category').setDescription('Filter by category').setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    if (!interaction.guildId) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        flags: 64,
      });
    }

    const category = interaction.options.getString('category');
    const botId = interaction.client.user.id;

    // Get config and shop items
    const config = await EconomyService.getOrCreateConfig(interaction.guildId, botId);
    const items = await EconomyService.getShopItems(interaction.guildId, category || undefined);

    const currencySymbol = config.currencyEmoji || config.currencySymbol;

    if (items.length === 0) {
      return interaction.reply({
        content: category
          ? `❌ No items found in category "${category}"`
          : '❌ The shop is currently empty.',
        flags: 64,
      });
    }

    // Group items by category
    const groupedItems: Record<string, any[]> = {};
    for (const item of items) {
      const cat = item.category || 'Other';
      if (!groupedItems[cat]) {
        groupedItems[cat] = [];
      }
      groupedItems[cat].push(item);
    }

    // Build embed fields
    const embed = new EmbedBuilder()
      .setColor(0x00aaff)
      .setTitle('🛒 Server Shop')
      .setDescription('Use `/buy <item_name>` to purchase items')
      .setTimestamp();

    for (const [cat, catItems] of Object.entries(groupedItems)) {
      let fieldValue = '';
      for (const item of catItems.slice(0, 10)) {
        // Limit to 10 items per category
        const emoji = item.emoji || '📦';
        const stock =
          item.maxStock !== null && item.currentStock !== null
            ? ` (${item.currentStock} left)`
            : '';
        const limited = item.isLimited ? ' **[LIMITED]**' : '';

        fieldValue += `${emoji} **${item.name}** - ${currencySymbol} ${item.price.toLocaleString()}${stock}${limited}\n`;
        if (item.description) {
          fieldValue += `   ➜ ${item.description}\n`;
        }
      }

      if (catItems.length > 10) {
        fieldValue += `\n*...and ${catItems.length - 10} more items*`;
      }

      embed.addFields({
        name: `📁 ${cat}`,
        value: fieldValue || 'No items',
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  } catch (error: any) {
    console.error('[Economy] Shop error:', error);
    await interaction.reply({
      content: `❌ An error occurred: ${error.message}`,
      flags: 64,
    });
  }
}
