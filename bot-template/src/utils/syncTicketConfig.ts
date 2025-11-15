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

        // Fix categories that don't have 'active' field - set to true by default
        if (ticketData.categories && Array.isArray(ticketData.categories)) {
          ticketData.categories = ticketData.categories.map((cat: any) => ({
            ...cat,
            active: cat.active !== undefined ? cat.active : true
          }));
        }
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
      // Only update if the config hasn't been customized (no categories or panels)
      // This prevents overwriting user configurations on every restart
      const hasCustomConfig = existingConfig.categories || existingConfig.panels;

      if (!hasCustomConfig) {
        // Safe to update - config hasn't been customized yet
        await prisma.ticketConfig.update({
          where: { guildId },
          data: syncData
        });
        console.log(`✅ Synced ticket config for guild ${guildId} from dashboard (uncustomized config)`);
      } else {
        // Only update specific fields that should sync from dashboard
        // Don't overwrite categories, panels, or naming that users configured
        const safeUpdateData: any = {
          botId: syncData.botId
        };

        // Only update these if they're not already set in the config
        if (!existingConfig.staffRoleId && syncData.staffRoleId) {
          safeUpdateData.staffRoleId = syncData.staffRoleId;
        }
        if (!existingConfig.categoryId && syncData.categoryId) {
          safeUpdateData.categoryId = syncData.categoryId;
        }
        if (!existingConfig.transcriptChannelId && syncData.transcriptChannelId) {
          safeUpdateData.transcriptChannelId = syncData.transcriptChannelId;
        }

        // Merge staff roles instead of overwriting
        if (staffRoles.length > 0) {
          const existingStaffRoles = existingConfig.staffRoles as string[] || [];
          const mergedStaffRoles = [...new Set([...existingStaffRoles, ...staffRoles])];
          safeUpdateData.staffRoles = mergedStaffRoles;
        }

        await prisma.ticketConfig.update({
          where: { guildId },
          data: safeUpdateData
        });
        console.log(`✅ Safely merged ticket config for guild ${guildId} (preserved custom config)`);
      }
    } else {
      // Create new config with dashboard data
      const createData: any = { ...syncData };
      if (staffRoles.length > 0) {
        createData.staffRoles = staffRoles;
      }
      await prisma.ticketConfig.create({
        data: createData
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