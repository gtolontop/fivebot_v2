import { Client, ActivityType } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { commands } from '../commands';

export async function ready(client: Client, prisma: PrismaClient, botId: string) {
  if (!client.user) return;
  
  console.log(`🚀 Bot logged in as ${client.user.tag}!`);
  console.log(`📊 Serving ${client.guilds.cache.size} guilds with ${client.users.cache.size} users`);
  
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

    console.log('✅ Bot status updated to ONLINE');
    
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
          message: `Failed to update bot status: ${error.message}`,
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

    console.log('🚀 Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(client.user?.id),
      { body: commands },
    );

    console.log('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
}