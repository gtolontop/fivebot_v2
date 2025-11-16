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
        where: { guildId: interaction.guildId! }
      }) as any;
      
      if (!config) {
        await interaction.editReply('No ticket configuration found for this server.');
        return;
      }
      
      // Get categories and panels separately
      const categories = await prisma.ticketCategory.findMany({
        where: {
          guildId: interaction.guildId!,
          botId: config.botId
        }
      });

      const panels = await prisma.ticketPanel.findMany({
        where: {
          guildId: interaction.guildId!,
          botId: config.botId
        }
      });

      const staffRoles = config.staffRoles ? (Array.isArray(config.staffRoles) ? config.staffRoles : JSON.parse(config.staffRoles as string)) : [];

      const embed = new EmbedBuilder()
        .setTitle('🎫 Ticket System Debug Info')
        .setColor(0x0099FF)
        .addFields([
          { name: 'Config ID', value: config.id, inline: true },
          { name: 'Container Type', value: config.containerType, inline: true },
          { name: 'Enabled', value: config.enabled ? 'Yes' : 'No', inline: true },
          { name: 'Staff Roles', value: (staffRoles as string[]).length > 0 ? (staffRoles as string[]).join(', ') : 'None', inline: false },
          { name: 'Support Category', value: config.supportCategoryId || 'Not set', inline: true },
          { name: 'Categories', value: categories.length.toString(), inline: true },
          { name: 'Panels', value: panels.length.toString(), inline: true }
        ]);

      // List categories
      if (categories.length > 0) {
        const categoryList = categories
          .map((cat: any) => `• ${cat.name} ${cat.emoji || ''} (${cat.active ? 'Active' : 'Inactive'})`)
          .join('\n');
        embed.addFields({ name: 'Category List', value: categoryList.substring(0, 1024) });
      }

      // List panels
      if (panels.length > 0) {
        const panelList = panels
          .map((panel: any) => `• ${panel.type} in <#${panel.channelId}> (${panel.active ? 'Active' : 'Inactive'})`)
          .join('\n');
        embed.addFields({ name: 'Panel List', value: panelList.substring(0, 1024) });
      }

      // Add fix button if no categories exist
      if (categories.length === 0) {
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
        
        for (const cat of defaultCategories) {
          await prisma.ticketCategory.create({
            data: {
              guildId: interaction.guildId!,
              botId: config.botId,
              name: cat.name,
              emoji: cat.emoji,
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