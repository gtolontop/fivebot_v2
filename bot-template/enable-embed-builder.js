const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enableEmbedBuilder() {
  try {
    const botId = '5ad66b0d-b8e6-4f81-92e3-b32a518a8764';
    
    // Get current config
    const config = await prisma.botConfig.findUnique({
      where: { botId }
    });
    
    if (!config) {
      console.error('Bot config not found');
      return;
    }
    
    // Parse existing V2 commands config
    let embedV2Commands = {};
    if (config.embedV2Commands) {
      try {
        embedV2Commands = JSON.parse(config.embedV2Commands);
      } catch (e) {
        console.log('No existing V2 commands config');
      }
    }
    
    // Enable the embed-builder command
    embedV2Commands['embed-builder'] = {
      name: "embed-builder",
      description: "Interactive V2 embed builder",
      enabled: true,
      useEmbedV2: true,
      embedV2Data: []
    };
    
    // Update the config
    await prisma.botConfig.update({
      where: { botId },
      data: {
        embedV2Commands: JSON.stringify(embedV2Commands)
      }
    });
    
    console.log('✅ Embed builder command enabled successfully');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enableEmbedBuilder();