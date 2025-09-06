import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const data = new SlashCommandBuilder()
  .setName('ticketdebug')
  .setDescription('Debug ticket system configuration');

export async function execute(interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Get ticket config
      const config = await prisma.ticketConfig.findUnique({
        where: { guildId: interaction.guildId! },
        include: {
          categories: true,
          panels: true
        }
      });
      
      if (!config) {
        await interaction.editReply('No ticket configuration found for this server.');
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🎫 Ticket System Debug Info')
        .setColor(0x0099FF)
        .addFields([
          { name: 'Config ID', value: config.id, inline: true },
          { name: 'Container Type', value: config.containerType, inline: true },
          { name: 'Enabled', value: config.enabled ? 'Yes' : 'No', inline: true },
          { name: 'Staff Roles', value: (config.staffRoles as string[]).length > 0 ? (config.staffRoles as string[]).join(', ') : 'None', inline: false },
          { name: 'Support Category', value: config.supportCategoryId || 'Not set', inline: true },
          { name: 'Categories', value: config.categories.length.toString(), inline: true },
          { name: 'Panels', value: config.panels.length.toString(), inline: true }
        ]);
        
      // List categories
      if (config.categories.length > 0) {
        const categoryList = config.categories
          .map(cat => `• ${cat.name} ${cat.emoji || ''} (${cat.active ? 'Active' : 'Inactive'})`)
          .join('\n');
        embed.addFields({ name: 'Category List', value: categoryList.substring(0, 1024) });
      }
      
      // List panels
      if (config.panels.length > 0) {
        const panelList = config.panels
          .map(panel => `• ${panel.type} in <#${panel.channelId}> (${panel.active ? 'Active' : 'Inactive'})`)
          .join('\n');
        embed.addFields({ name: 'Panel List', value: panelList.substring(0, 1024) });
      }
      
      // Add fix button if no categories exist
      if (config.categories.length === 0) {
        embed.addFields({ 
          name: '⚠️ No Categories', 
          value: 'No ticket categories found. Creating default categories...' 
        });
        
        // Create default categories
        const defaultCategories = [
          { name: 'General Support', emoji: '💬' },
          { name: 'Technical Issue', emoji: '🔧' },
          { name: 'Billing', emoji: '💳' },
          { name: 'Other', emoji: '❓' }
        ];
        
        for (const [index, cat] of defaultCategories.entries()) {
          await prisma.ticketCategory.create({
            data: {
              configId: config.id,
              guildId: interaction.guildId!,
              name: cat.name,
              emoji: cat.emoji,
              order: index,
              active: true
            }
          });
        }
        
        embed.addFields({ 
          name: '✅ Categories Created', 
          value: 'Default categories have been created.' 
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in ticketdebug command:', error);
      await interaction.editReply('An error occurred while debugging the ticket system.');
    }
}