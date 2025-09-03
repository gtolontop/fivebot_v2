const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTicketConfig() {
  try {
    // Trouver le bot "wee"
    const bot = await prisma.bot.findFirst({
      where: { name: 'wee' },
      include: { config: true }
    });
    
    if (!bot) {
      console.log('Bot "wee" non trouvé');
      return;
    }
    
    console.log(`Bot trouvé: ${bot.name} (ID: ${bot.id})`);
    console.log(`État actuel: Active=${bot.isActive}, Status=${bot.status}`);
    
    // Activer le bot
    await prisma.bot.update({
      where: { id: bot.id },
      data: { 
        isActive: true,
        status: 'ONLINE'
      }
    });
    
    console.log('✓ Bot activé');
    
    // Mettre à jour la configuration pour activer les tickets
    if (bot.config) {
      // Récupérer les données de tickets actuelles
      let ticketData = {};
      if (bot.config.ticketData) {
        try {
          ticketData = JSON.parse(bot.config.ticketData);
        } catch (e) {
          console.log('Impossible de parser ticketData existant');
        }
      }
      
      // S'assurer que ticketEnabled est true
      ticketData.ticketEnabled = true;
      
      await prisma.botConfig.update({
        where: { botId: bot.id },
        data: {
          ticketData: JSON.stringify(ticketData)
        }
      });
      console.log('✓ Tickets activés dans la configuration (ticketData.ticketEnabled = true)');
    }
    
    console.log('\nConfiguration mise à jour avec succès!');
    console.log('Le bot devrait maintenant pouvoir envoyer des panels de tickets.');
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTicketConfig();