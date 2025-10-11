import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * For now, just ensure ticket config exists with proper defaults
 */
export async function syncTicketConfigFromDashboard(guildId: string, botId: string) {
  try {
    // Check if ticket config exists
    const existingConfig = await prisma.ticketConfig.findUnique({
      where: { guildId }
    });

    if (!existingConfig) {
      // Create default config if it doesn't exist
      await prisma.ticketConfig.create({
        data: {
          guildId,
          botId,
          categoryId: null,
          staffRoleId: null,
          transcriptChannelId: null,
          namingFormat: 'ticket-{counter}',
          maxTickets: 3,
          categories: null,
          panels: null
        }
      });
      console.log(`Created default ticket config for guild ${guildId}`);
    }
    
    return existingConfig;
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