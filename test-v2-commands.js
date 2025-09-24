// Test script to check V2 commands configuration
const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function checkV2Commands() {
  try {
    // Get the bot configuration
    const botConfig = await prisma.botConfig.findUnique({
      where: { botId: '5ad66b0d-b8e6-4f81-92e3-b32a518a8764' }
    });

    if (!botConfig) {
      console.log('Bot configuration not found');
      return;
    }

    console.log('\n=== Bot Configuration ===');
    console.log('Bot ID:', botConfig.botId);
    console.log('embedV2Commands field exists:', 'embedV2Commands' in botConfig);
    console.log('embedV2Commands value:', botConfig.embedV2Commands);
    
    if (botConfig.embedV2Commands) {
      console.log('\n=== Parsing embedV2Commands ===');
      try {
        const parsed = typeof botConfig.embedV2Commands === 'string' 
          ? JSON.parse(botConfig.embedV2Commands) 
          : botConfig.embedV2Commands;
        console.log('Parsed successfully:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.error('Failed to parse:', e.message);
      }
    }

    // Check if the column exists in the database schema
    const columns = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'bot_configs' 
      AND COLUMN_NAME = 'embed_v2_commands'
    `;
    
    console.log('\n=== Database Column Info ===');
    console.log(columns);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkV2Commands();