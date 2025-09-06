import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Synchronizes ticket configuration from BotConfig.ticketData to TicketConfig table
 */
export async function syncTicketConfigFromDashboard(guildId: string, botId: string) {
  try {
    // Get the dashboard configuration from BotConfig
    const botConfig = await prisma.botConfig.findUnique({
      where: { botId },
      select: { ticketData: true }
    });

    if (!botConfig || !botConfig.ticketData) {
      console.log('No dashboard ticket configuration found');
      return;
    }

    const dashboardConfig = botConfig.ticketData as any;
    
    // Map dashboard settings to TicketConfig
    const ticketConfigData = {
      enabled: dashboardConfig.settings?.enabled ?? true,
      containerType: dashboardConfig.settings?.useThreads ? 'THREAD' : 'CHANNEL',
      staffRoles: dashboardConfig.settings?.staffRoles || [],
      supportCategoryId: dashboardConfig.settings?.supportCategoryId || null,
      logChannelId: dashboardConfig.settings?.logChannelId || null,
      autoCloseHours: dashboardConfig.settings?.autoCloseHours || 48,
      warningHours: dashboardConfig.settings?.warningHours || 24,
      maxTicketsPerUser: dashboardConfig.settings?.maxTicketsPerUser || 3,
      cooldownMinutes: dashboardConfig.settings?.cooldownMinutes || 5,
      namingPattern: dashboardConfig.settings?.namingPattern || 'ticket-{counter}',
    };

    // Update or create TicketConfig
    const ticketConfig = await prisma.ticketConfig.upsert({
      where: { guildId },
      update: ticketConfigData,
      create: {
        guildId,
        ...ticketConfigData
      }
    });

    console.log(`Ticket configuration synchronized for guild ${guildId}`);
    
    // Sync categories if they exist
    if (dashboardConfig.categories && Array.isArray(dashboardConfig.categories)) {
      // Delete existing categories
      await prisma.ticketCategory.deleteMany({
        where: { configId: ticketConfig.id }
      });

      // Create new categories from dashboard
      for (const [index, category] of dashboardConfig.categories.entries()) {
        await prisma.ticketCategory.create({
          data: {
            configId: ticketConfig.id,
            guildId: guildId,
            name: category.name,
            emoji: category.emoji || null,
            description: category.description || null,
            order: index,
            active: category.enabled ?? true
          }
        });
      }
      
      console.log(`Synchronized ${dashboardConfig.categories.length} categories`);
    }

    return ticketConfig;
  } catch (error) {
    console.error('Error synchronizing ticket configuration:', error);
    throw error;
  }
}

// Run sync on bot startup
export async function initializeTicketConfigSync(guildIds: string[], botId: string) {
  console.log('Initializing ticket configuration sync...');
  
  for (const guildId of guildIds) {
    try {
      await syncTicketConfigFromDashboard(guildId, botId);
    } catch (error) {
      console.error(`Failed to sync config for guild ${guildId}:`, error);
    }
  }
  
  console.log('Ticket configuration sync completed');
}