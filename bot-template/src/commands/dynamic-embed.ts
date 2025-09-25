import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '../services/config.service';

const prisma = new PrismaClient();
const COMP_V2_FLAG = 1 << 15;

// This function will be called to register dynamic embeds
export async function registerDynamicEmbeds(botId: string): Promise<any[]> {
  try {
    const configService = new ConfigService(prisma, botId);
    const config = await configService.getConfig();
    const embedV2Commands = (config as any).embedV2Commands || {};
    
    const dynamicCommands = [];
    
    // Add dynamic commands that are enabled but not preset
    const presetCommands = ['rules', 'pricing', 'server-info', 'user-profile', 'team', 'announcement', 'embed-builder'];
    
    for (const [name, data] of Object.entries(embedV2Commands)) {
      if (!presetCommands.includes(name) && (data as any).enabled) {
        dynamicCommands.push({
          data: new SlashCommandBuilder()
            .setName(name)
            .setDescription((data as any).description || `Display ${name} embed`),
          execute: createExecutor(name)
        });
      }
    }
    
    return dynamicCommands;
  } catch (error) {
    console.error('Error registering dynamic embeds:', error);
    return [];
  }
}

// Create an executor function for a specific embed
function createExecutor(embedName: string) {
  return async function execute(interaction: ChatInputCommandInteraction) {
    try {
      const botId = process.env.BOT_ID || interaction.client.user?.id;
      if (!botId) {
        await interaction.reply({ content: '❌ Bot configuration error', ephemeral: true });
        return;
      }

      const configService = new ConfigService(prisma, botId);
      const config = await configService.getConfig();
      const embedV2Commands = (config as any).embedV2Commands || {};
      
      if (!embedV2Commands[embedName] || !embedV2Commands[embedName].enabled) {
        await interaction.reply({ content: '❌ This embed is not enabled', ephemeral: true });
        return;
      }
      
      const embedData = embedV2Commands[embedName].embedV2Data || [];
      
      if (embedData.length === 0) {
        await interaction.reply({ 
          content: '❌ This embed has no content yet. Please configure it first.', 
          ephemeral: true 
        });
        return;
      }

      // Send the V2 embed
      await interaction.reply({
        flags: COMP_V2_FLAG,
        components: embedData
      });
    } catch (error) {
      console.error(`Error in dynamic embed ${embedName}:`, error);
      await interaction.reply({ 
        content: '❌ An error occurred while displaying this embed', 
        ephemeral: true 
      });
    }
  };
}