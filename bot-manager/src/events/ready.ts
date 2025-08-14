import { Client } from 'discord.js';
import { PrismaClient } from '@prisma/client';

export async function ready(client: Client, prisma: PrismaClient) {
  console.log(`🤖 FiveBot Manager logged in as ${client.user?.tag}!`);
  console.log(`📊 Serving ${client.guilds.cache.size} guilds`);
  
  // Set bot status
  client.user?.setActivity('🚀 Managing Discord Bots', { type: 3 }); // Type 3 = Watching
  
  // Log startup to database
  try {
    await prisma.auditLog.create({
      data: {
        action: 'BOT_MANAGER_STARTED',
        resource: 'system',
        metadata: {
          guilds: client.guilds.cache.size,
          users: client.users.cache.size,
          uptime: process.uptime(),
        },
      },
    });
    
    console.log('✅ Bot startup logged to database');
  } catch (error) {
    console.error('❌ Failed to log startup:', error);
  }
  
  // Set up periodic tasks
  setInterval(async () => {
    try {
      // Update bot status with current stats
      const botCount = await prisma.bot.count({ where: { isActive: true } });
      const userCount = await prisma.user.count();
      
      client.user?.setActivity(`🤖 ${botCount} bots • 👥 ${userCount} users`, { type: 3 });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}