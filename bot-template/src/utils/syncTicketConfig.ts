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
          enabled: true,
          containerType: 'CHANNEL', // Default to CHANNEL mode
          staffRoles: [],
          namingPattern: 'ticket-{counter}',
          startingNumber: 1,
          autoCloseHours: 48,
          warningHours: 24,
          maxTicketsPerUser: 3,
          cooldownMinutes: 5,
          allowedFileTypes: [],
          maxFileSize: 8388608
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