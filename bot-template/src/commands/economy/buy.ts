/**
 * /buy command
 * Buy item from shop
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { EconomyService } from '../../services/economy.service';
import prisma from '../../services/prisma-singleton.service';

export const data = new SlashCommandBuilder()
  .setName('buy')
  .setDescription('Buy an item from the shop')
  .addStringOption((option) =>
    option.setName('item').setDescription('The item name to purchase').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    if (!interaction.guildId) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        flags: 64,
      });
    }

    const itemName = interaction.options.getString('item', true);
    const botId = interaction.client.user.id;

    // Get config
    const config = await EconomyService.getOrCreateConfig(interaction.guildId, botId);
    const currencySymbol = config.currencyEmoji || config.currencySymbol;

    // Find item by name (case insensitive)
    const shopItems = await EconomyService.getShopItems(interaction.guildId);
    const item = shopItems.find(
      (i: any) => i.name.toLowerCase() === itemName.toLowerCase()
    );

    if (!item) {
      return interaction.reply({
        content: `❌ Item "${itemName}" not found in the shop. Use \`/shop\` to see available items.`,
        flags: 64,
      });
    }

    // Check if item is active
    if (!item.isActive) {
      return interaction.reply({
        content: '❌ This item is no longer available.',
        flags: 64,
      });
    }

    // Check stock
    if (item.maxStock !== null && item.currentStock !== null && item.currentStock <= 0) {
      return interaction.reply({
        content: '❌ This item is out of stock!',
        flags: 64,
      });
    }

    // Get user economy
    const userEconomy = await EconomyService.getOrCreateUserEconomy(
      interaction.guildId,
      botId,
      interaction.user.id
    );

    // Check balance
    if (userEconomy.balance < item.price) {
      return interaction.reply({
        content: `❌ You don't have enough money! This item costs ${currencySymbol} ${item.price.toLocaleString()}, but you only have ${currencySymbol} ${userEconomy.balance.toLocaleString()}`,
        flags: 64,
      });
    }

    // Check max owned
    const ownedCount = await prisma.userInventory.count({
      where: {
        economyId: userEconomy.id,
        itemId: item.id,
      },
    });

    if (ownedCount >= item.maxOwned) {
      return interaction.reply({
        content: `❌ You can only own ${item.maxOwned} of this item!`,
        flags: 64,
      });
    }

    // Check required level (if implemented)
    if (item.requiredLevel && item.requiredLevel > 0) {
      // Level system not implemented yet
      // You can add level checking here if you implement a leveling system
    }

    // Check required role
    if (item.requiredRoleId && interaction.member) {
      const member = interaction.member;
      const hasRole = Array.isArray((member as any).roles)
        ? (member as any).roles.includes(item.requiredRoleId)
        : (member as any).roles?.cache?.has(item.requiredRoleId);

      if (!hasRole) {
        return interaction.reply({
          content: '❌ You don\'t have the required role to purchase this item!',
          flags: 64,
        });
      }
    }

    // Buy item
    await EconomyService.buyItem(interaction.guildId, interaction.user.id, item.id);

    // Handle role items
    if (item.type === 'ROLE' && item.roleId && interaction.member) {
      try {
        const guild = interaction.guild;
        if (guild) {
          const member = await guild.members.fetch(interaction.user.id);
          await member.roles.add(item.roleId);
        }
      } catch (error) {
        console.error('[Economy] Failed to assign role:', error);
      }
    }

    // Create embed
    const emoji = item.emoji || '📦';
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('✅ Purchase Successful!')
      .setDescription(`You purchased ${emoji} **${item.name}** for ${currencySymbol} **${item.price.toLocaleString()}**`)
      .addFields({
        name: 'New Balance',
        value: `${currencySymbol} ${(userEconomy.balance - item.price).toLocaleString()}`,
        inline: true,
      })
      .setFooter({ text: 'Check your inventory with /inventory' })
      .setTimestamp();

    if (item.description) {
      embed.addFields({
        name: 'Item Description',
        value: item.description,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  } catch (error: any) {
    console.error('[Economy] Buy error:', error);
    await interaction.reply({
      content: `❌ An error occurred: ${error.message}`,
      flags: 64,
    });
  }
}
