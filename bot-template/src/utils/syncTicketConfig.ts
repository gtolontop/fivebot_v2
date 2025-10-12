import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Sync ticket configuration from BotConfig to TicketConfig
 * This ensures the dashboard settings are properly reflected in the ticket system
 */
export async function syncTicketConfigFromDashboard(guildId: string, botId: string) {
  try {
    // Get bot config from dashboard
    const botConfig = await prisma.botConfig.findUnique({
      where: { botId }
    });

    if (!botConfig) {
      console.log(`No bot config found for bot ${botId}`);
      return null;
    }

    // Parse ticket data if it exists
    let ticketData: any = {};
    if (botConfig.ticketData) {
      try {
        ticketData = JSON.parse(botConfig.ticketData);
      } catch (e) {
        console.error('Failed to parse ticketData:', e);
      }
    }

    // Extract staff roles - support both single role and multiple roles
    let staffRoles: string[] = [];
    if (botConfig.ticketStaffRoleId) {
      staffRoles.push(botConfig.ticketStaffRoleId);
    }
    // Add additional staff roles from ticketData if they exist
    if (ticketData.staffRoles && Array.isArray(ticketData.staffRoles)) {
      staffRoles = [...new Set([...staffRoles, ...ticketData.staffRoles])];
    }

    // Prepare sync data
    const syncData = {
      guildId,
      botId,
      categoryId: botConfig.ticketCategoryId || ticketData.supportCategoryId || null,
      staffRoleId: botConfig.ticketStaffRoleId || null,
      transcriptChannelId: botConfig.ticketTranscriptChannelId || ticketData.transcriptChannelId || null,
      namingFormat: ticketData.namingPattern || 'ticket-{counter}',
      maxTickets: ticketData.maxTicketsPerUser || 3,
      categories: ticketData.categories ? JSON.stringify(ticketData.categories) : null,
      panels: ticketData.panels ? JSON.stringify(ticketData.panels) : null
    };

    // Check if ticket config exists
    const existingConfig = await prisma.ticketConfig.findUnique({
      where: { guildId }
    });

    if (existingConfig) {
      // Update existing config with dashboard data
      await prisma.ticketConfig.update({
        where: { guildId },
        data: syncData
      });
      console.log(`✅ Synced ticket config for guild ${guildId} from dashboard`);
    } else {
      // Create new config with dashboard data
      await prisma.ticketConfig.create({
        data: syncData
      });
      console.log(`✅ Created ticket config for guild ${guildId} with dashboard data`);
    }

    return syncData;
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