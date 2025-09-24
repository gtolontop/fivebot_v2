// Test what config is passed to the bot when starting
const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function checkBotStartConfig() {
  try {
    const botId = '5ad66b0d-b8e6-4f81-92e3-b32a518a8764';
    
    // Get bot info like the queue service does
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      include: { config: true },
    });

    if (!bot) {
      console.log('Bot not found');
      return;
    }

    console.log('\n=== Bot Info ===');
    console.log('Bot Name:', bot.name);
    console.log('Bot Status:', bot.status);
    
    console.log('\n=== Config Object ===');
    console.log('Config exists:', !!bot.config);
    
    if (bot.config) {
      console.log('Config keys:', Object.keys(bot.config));
      console.log('embedV2Commands in config:', 'embedV2Commands' in bot.config);
      console.log('embedV2Commands value:', bot.config.embedV2Commands);
      
      console.log('\n=== What would be passed as CONFIG env ===');
      const configString = JSON.stringify(bot.config || {});
      console.log('CONFIG length:', configString.length);
      console.log('CONFIG preview (first 500 chars):', configString.substring(0, 500));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBotStartConfig();