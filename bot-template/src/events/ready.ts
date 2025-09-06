import { Client, ActivityType, TextChannel, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { commands } from '../commands';

export async function ready(client: Client, prisma: PrismaClient, botId: string) {
  if (!client.user) return;
  
  console.log(`Bot logged in as ${client.user.tag}`);
  console.log(`Connected to ${client.guilds.cache.size} servers`);
  console.log(`Serving ${client.users.cache.size} users`);
  
  // Deploy slash commands
  await deployCommands(client);
  
  // Set bot activity
  client.user.setActivity('Ready to serve!', { type: ActivityType.Playing });
  
  try {
    // Update bot status to online
    await prisma.bot.update({
      where: { id: botId },
      data: { status: 'ONLINE' },
    });

    // Update host status
    await prisma.host.updateMany({
      where: { 
        botId,
        status: 'STARTING',
      },
      data: { 
        status: 'UP',
        startedAt: new Date(),
      },
    });

    // Log successful startup
    await prisma.jobLog.create({
      data: {
        botId,
        jobId: `startup-${Date.now()}`,
        jobType: 'BOT_STARTUP',
        status: 'COMPLETED',
        message: `Bot successfully started and connected to Discord`,
        metadata: {
          guilds: client.guilds.cache.size,
          users: client.users.cache.size,
          uptime: process.uptime(),
        },
      },
    });

    console.log('Bot ready');
    
    // Restore ticket panels
    await restoreTicketPanels(client, prisma);
    
  } catch (error) {
    console.error('❌ Failed to update bot status:', error);
    
    // Log the error
    try {
      await prisma.jobLog.create({
        data: {
          botId,
          jobId: `startup-error-${Date.now()}`,
          jobType: 'BOT_STARTUP',
          status: 'FAILED',
          message: `Failed to update bot status: ${(error as Error).message}`,
        },
      });
    } catch (logError) {
      console.error('Failed to log startup error:', logError);
    }
  }

  // Set up periodic heartbeat
  setInterval(async () => {
    try {
      await prisma.bot.update({
        where: { id: botId },
        data: { updatedAt: new Date() },
      });
    } catch (error) {
      console.error('Heartbeat failed:', error);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}

async function deployCommands(client: Client) {
  try {
    const { REST, Routes } = require('discord.js');
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

    console.log('Registering slash commands...');

    await rest.put(
      Routes.applicationCommands(client.user?.id),
      { body: commands },
    );

    console.log('Slash commands registered');
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
}

async function restoreTicketPanels(client: Client, prisma: PrismaClient) {
  try {
    console.log('Restoring ticket panels...');
    
    // Get all active panels from database
    const panels = await prisma.ticketPanel.findMany({
      where: { active: true },
      include: {
        config: {
          include: {
            categories: {
              where: { active: true },
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    let restoredCount = 0;
    let failedCount = 0;

    for (const panel of panels) {
      try {
        // Find the guild
        const guild = client.guilds.cache.get(panel.guildId);
        if (!guild) {
          console.warn(`Guild ${panel.guildId} not found for panel ${panel.id}`);
          failedCount++;
          continue;
        }

        // Find the channel
        const channel = guild.channels.cache.get(panel.channelId) as TextChannel;
        if (!channel) {
          console.warn(`Channel ${panel.channelId} not found for panel ${panel.id}`);
          failedCount++;
          continue;
        }

        // Try to fetch the existing message
        const existingMessage = await channel.messages.fetch(panel.messageId).catch(() => null);
        
        if (existingMessage) {
          // Message exists, update its components to ensure they're interactive
          const components = [];
          
          if (panel.type === 'BUTTON' || panel.type === 'HYBRID') {
            const buttonRows = [];
            let currentRow = new ActionRowBuilder<ButtonBuilder>();
            let buttonCount = 0;

            for (const category of panel.config.categories) {
              const button = new ButtonBuilder()
                .setCustomId(`ticket_create:${category.id}`)
                .setLabel(category.name)
                .setStyle(category.buttonStyle as any);
                
              if (category.emoji) button.setEmoji(category.emoji);
              if (category.description && category.description.length <= 100) {
                button.setLabel(`${category.name} - ${category.description}`);
              }
              
              currentRow.addComponents(button);
              buttonCount++;
              
              if (buttonCount === 5) {
                buttonRows.push(currentRow);
                currentRow = new ActionRowBuilder<ButtonBuilder>();
                buttonCount = 0;
              }
            }
            
            if (buttonCount > 0) buttonRows.push(currentRow);
            components.push(...buttonRows);
          }
          
          if (panel.type === 'DROPDOWN' || panel.type === 'HYBRID') {
            const dropdown = new StringSelectMenuBuilder()
              .setCustomId('ticket_category_select')
              .setPlaceholder('Select a category...')
              .addOptions(
                panel.config.categories.map(category => ({
                  label: category.name,
                  description: category.description?.substring(0, 100),
                  value: category.id,
                  emoji: category.emoji || undefined
                }))
              );
              
            components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(dropdown));
          }

          await existingMessage.edit({ components });
          restoredCount++;
        } else {
          // Message doesn't exist, mark panel as needing recreation
          console.warn(`Message ${panel.messageId} not found for panel ${panel.id}`);
          failedCount++;
        }
      } catch (error) {
        console.error(`Failed to restore panel ${panel.id}:`, error);
        failedCount++;
      }
    }

    console.log(`Ticket panels restored: ${restoredCount} successful, ${failedCount} failed`);
  } catch (error) {
    console.error('Failed to restore ticket panels:', error);
  }
}