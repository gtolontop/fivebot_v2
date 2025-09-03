const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTicketConfig() {
  try {
    const configs = await prisma.botConfig.findMany({
      include: {
        bot: {
          select: {
            name: true,
            isActive: true
          }
        }
      }
    });
    
    console.log('=== CONFIGURATION DES BOTS ===\n');
    
    for (const config of configs) {
      console.log(`Bot: ${config.bot.name} (Active: ${config.bot.isActive})`);
      console.log(`  Tickets enabled: ${config.ticketEnabled}`);
      console.log(`  TicketData type: ${typeof config.ticketData}`);
      if (config.ticketData) {
        const data = typeof config.ticketData === 'string' 
          ? JSON.parse(config.ticketData) 
          : config.ticketData;
        console.log(`  TicketData.ticketEnabled: ${data.ticketEnabled || false}`);
      }
      console.log('---');
    }
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTicketConfig();