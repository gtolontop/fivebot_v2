import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugTicketConfig(botId: string) {
  try {
    console.log('=== Debugging Ticket Configuration ===');
    console.log('Bot ID:', botId);
    
    // Get bot configuration
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      include: { config: true }
    });
    
    if (!bot) {
      console.error('Bot not found');
      return;
    }
    
    console.log('\n--- Bot Status ---');
    console.log('Name:', bot.name);
    console.log('Status:', bot.status);
    console.log('Active:', bot.isActive);
    
    if (!bot.config) {
      console.error('Bot has no configuration');
      return;
    }
    
    console.log('\n--- Bot Configuration ---');
    console.log('Config ID:', bot.config.id);
    console.log('Welcome Enabled:', bot.config.welcomeEnabled);
    console.log('Moderation Enabled:', bot.config.moderationEnabled);
    
    console.log('\n--- Ticket Data ---');
    if (bot.config.ticketData) {
      console.log('ticketData type:', typeof bot.config.ticketData);
      console.log('Raw ticketData:', bot.config.ticketData);
      
      try {
        const ticketData = typeof bot.config.ticketData === 'string' 
          ? JSON.parse(bot.config.ticketData) 
          : bot.config.ticketData;
          
        console.log('\nParsed ticketData:');
        console.log(JSON.stringify(ticketData, null, 2));
        
        console.log('\nTicket Enabled:', ticketData.ticketEnabled || false);
        console.log('Ticket Category ID:', ticketData.ticketCategoryId || 'not set');
        console.log('Staff Role ID:', ticketData.ticketStaffRoleId || 'not set');
        console.log('Transcript Channel ID:', ticketData.ticketTranscriptChannelId || 'not set');
      } catch (e) {
        console.error('Failed to parse ticketData:', e);
      }
    } else {
      console.log('No ticketData found in configuration');
    }
    
    console.log('\n--- What would be passed to bot container ---');
    const configToPass = { ...bot.config };
    if (configToPass.ticketData && typeof configToPass.ticketData === 'string') {
      try {
        configToPass.ticketData = JSON.parse(configToPass.ticketData);
      } catch (e) {
        console.error('Failed to parse ticketData for container:', e);
      }
    }
    console.log('CONFIG env would contain:');
    console.log(JSON.stringify(configToPass, null, 2));
    
  } catch (error) {
    console.error('Error debugging ticket config:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get bot ID from command line
const botId = process.argv[2];
if (!botId) {
  console.error('Usage: npm run debug:ticket <bot-id>');
  process.exit(1);
}

debugTicketConfig(botId);