const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugTicketPanel() {
  try {
    // Vérifier les bots actifs
    const bots = await prisma.bot.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        status: true,
        instanceId: true
      }
    });
    
    console.log('=== BOTS ACTIFS ===');
    console.log(JSON.stringify(bots, null, 2));
    
    // Vérifier les panels de tickets
    const panels = await prisma.ticketPanel.findMany({
      include: {
        categories: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log('\n=== DERNIERS PANELS DE TICKETS ===');
    console.log(JSON.stringify(panels, null, 2));
    
    // Vérifier les logs récents
    const logs = await prisma.jobLog.findMany({
      where: {
        OR: [
          { jobType: 'SEND_TICKET_PANEL' },
          { message: { contains: 'ticket' } },
          { message: { contains: 'panel' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log('\n=== LOGS RÉCENTS (TICKETS/PANELS) ===');
    logs.forEach(log => {
      console.log(`[${log.createdAt}] ${log.jobType} - ${log.status}: ${log.message}`);
      if (log.metadata) {
        console.log('  Metadata:', JSON.stringify(log.metadata));
      }
    });
    
    // Vérifier les configurations des bots
    const botConfigs = await prisma.botConfig.findMany({
      where: {
        bot: { isActive: true }
      },
      select: {
        botId: true,
        ticketEnabled: true,
        ticketData: true
      }
    });
    
    console.log('\n=== CONFIGURATIONS DES BOTS (TICKETS) ===');
    botConfigs.forEach(config => {
      console.log(`Bot ${config.botId}:`);
      console.log(`  Tickets activés: ${config.ticketEnabled}`);
      if (config.ticketData) {
        console.log('  Data:', typeof config.ticketData === 'string' ? config.ticketData : JSON.stringify(config.ticketData));
      }
    });
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTicketPanel();