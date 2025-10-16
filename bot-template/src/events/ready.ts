import { Client, ActivityType, TextChannel, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { buildCommands } from '../commands';

export async function ready(client: Client, prisma: PrismaClient, botId: string, ticketEnabled: boolean = false) {
  if (!client.user) return;

  console.log(`Bot logged in as ${client.user.tag}`);
  console.log(`├─ Connected to ${client.guilds.cache.size} ${client.guilds.cache.size === 1 ? 'server' : 'servers'}`);
  console.log(`├─ Serving ${client.users.cache.size} ${client.users.cache.size === 1 ? 'user' : 'users'}`);
  console.log(`└─ Registering slash commands...`);

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

    // Notify frontend
    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
      await fetch(`${backendUrl}/events/bot-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId, status: 'ONLINE' }),
      });
    } catch (err) {
      // Ignore
    }

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
        metadata: JSON.stringify({
          guilds: client.guilds.cache.size,
          users: client.users.cache.size,
          uptime: process.uptime(),
        }),
      },
    });

    
    // Restore ticket panels ONLY if ticket system is enabled
    if (ticketEnabled) {
      await restoreTicketPanels(client, prisma);
    }
    
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

    // Get custom commands and V2 commands from config
    const config = process.env.CONFIG ? JSON.parse(process.env.CONFIG) : {};
    const customCommands = config.customCommands || {};

    // Parse embedV2Commands if needed
    let parsedEmbedV2Commands = {};
    if (config.embedV2Commands) {
      try {
        parsedEmbedV2Commands = typeof config.embedV2Commands === 'string'
          ? JSON.parse(config.embedV2Commands)
          : config.embedV2Commands;
      } catch (e) {
        console.error('Failed to parse embedV2Commands in ready:', e);
      }
    }

    // Build commands dynamically with V2 commands
    const allCommands = buildCommands(customCommands, parsedEmbedV2Commands);

    // Deploy globally
    await rest.put(
      Routes.applicationCommands(client.user?.id),
      { body: allCommands },
    );

    // Also deploy to each guild for immediate availability
    for (const guild of client.guilds.cache.values()) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(client.user?.id, guild.id),
          { body: allCommands },
        );
        console.log(`Commands deployed to guild: ${guild.name} (${guild.id})`);
      } catch (error) {
        console.error(`Failed to deploy commands to guild ${guild.name}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
}

async function restoreTicketPanels(client: Client, prisma: PrismaClient) {
  try {
    console.log('Restoring ticket panels...');
    
    // Get list of guilds this bot is in
    const botGuildIds = Array.from(client.guilds.cache.keys());
    console.log(`Bot is in ${botGuildIds.length} guilds:`, botGuildIds);
    
    // Only get panels for guilds this bot is actually in
    let panels = [];
    try {
      // TODO: Implement ticket panel restoration when TicketPanel model is added
      console.log('Ticket panel restoration not yet implemented');
      return;
    } catch (error: any) {
      if (error.code === 'P2021' || error.message?.includes("doesn't exist") || error.message?.includes("Table")) {
        console.log('Ticket system not initialized - no panels to restore');
        return;
      }
      throw error;
    }

    let restoredCount = 0;
    let failedCount = 0;

    console.log(`Found ${panels.length} panels to restore`);
    
    for (const panel of panels) {
      try {
        console.log(`Processing panel ${panel.id}:`);
        console.log(`  - Config ID: ${panel.configId}`);
        console.log(`  - Type: ${panel.type}`);
        console.log(`  - Categories: ${panel.config?.categories?.length || 0}`);
        
        if (!panel.config) {
          console.error(`No config found for panel ${panel.id}`);
          failedCount++;
          continue;
        }
        
        // Find the guild
        const guild = client.guilds.cache.get(panel.guildId);
        if (!guild) {
          console.warn(`Guild ${panel.guildId} not found for panel ${panel.id}`);
          failedCount++;
          continue;
        }

        // Find the channel
        const channel = guild!.channels.cache.get(panel.channelId) as TextChannel;
        if (!channel) {
          console.warn(`Channel ${panel.channelId} not found for panel ${panel.id}`);
          failedCount++;
          continue;
        }

        // Try to fetch the existing message
        if (!panel.messageId) {
          console.warn(`No message ID for panel ${panel.id}, deleting from database...`);
          await prisma.ticketPanel.delete({ where: { id: panel.id } });
          failedCount++;
          continue;
        }

        let existingMessage;
        try {
          existingMessage = await channel.messages.fetch(panel.messageId);
          console.log(`Fetched message type: ${typeof existingMessage}, editable: ${existingMessage?.editable}`);
        } catch (error) {
          console.warn(`Message ${panel.messageId} not found for panel ${panel.id}, deleting from database...`);
          // Delete panel from database since the message no longer exists
          await prisma.ticketPanel.delete({ where: { id: panel.id } });
          failedCount++;
          continue;
        }
        
        // Verify it's a valid Discord message
        if (!existingMessage || typeof existingMessage.edit !== 'function') {
          console.warn(`Invalid message object for panel ${panel.id}, deleting from database...`);
          await prisma.ticketPanel.delete({ where: { id: panel.id } });
          failedCount++;
          continue;
        }
        
        if (existingMessage.editable) {
          // Message exists, update its components to ensure they're interactive
          const components = [];
          
          if (panel.type === 'BUTTON' || panel.type === 'HYBRID') {
            const buttonRows = [];
            let currentRow = new ActionRowBuilder<ButtonBuilder>();
            let buttonCount = 0;

            console.log(`Creating buttons for ${panel.config.categories.length} categories`);
            
            if (panel.config.categories.length === 0) {
              console.warn(`No categories found for panel ${panel.id}`);
            }

            for (const category of panel.config.categories) {
              const button = new ButtonBuilder()
                .setCustomId(`ticket:create:${category.id}`)
                .setLabel(category.name)
                .setStyle(ButtonStyle.Secondary);
                
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
              .setCustomId('ticket:category:select')
              .setPlaceholder('Select a category...')
              .addOptions(
                panel.config.categories.map((category: any) => ({
                  label: category.name,
                  description: category.description?.substring(0, 100),
                  value: category.id,
                  emoji: category.emoji || undefined
                }))
              );
              
            components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(dropdown));
          }

          try {
            await existingMessage.edit({ components });
            restoredCount++;
            console.log(`Restored panel ${panel.id} in channel ${channel.name}`);
          } catch (error) {
            console.error(`Failed to edit message for panel ${panel.id}:`, (error as Error).message);
            failedCount++;
          }
        } else if (existingMessage && !existingMessage.editable) {
          console.warn(`Message ${panel.messageId} is not editable for panel ${panel.id} (might not be from this bot), deleting from database...`);
          await prisma.ticketPanel.delete({ where: { id: panel.id } });
          failedCount++;
        }
      } catch (error) {
        console.error(`Failed to restore panel ${panel.id}:`, error);
        failedCount++;
      }
    }

    console.log(`Ticket panels: ${restoredCount} restored, ${failedCount} deleted (no longer valid)`);
  } catch (error) {
    console.error('Failed to restore ticket panels:', error);
  }
}