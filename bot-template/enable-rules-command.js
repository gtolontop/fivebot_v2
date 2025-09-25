const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enableRulesCommand() {
  try {
    // Replace with your bot ID
    const botId = '5ad66b0d-b8e6-4f81-92e3-b32a518a8764';
    
    // Get current config
    const config = await prisma.botConfig.findUnique({
      where: { botId }
    });
    
    if (!config) {
      console.error('Bot config not found');
      return;
    }
    
    // Parse existing V2 commands config or create new one
    let embedV2Commands = {};
    if (config.embedV2Commands) {
      try {
        embedV2Commands = JSON.parse(config.embedV2Commands);
      } catch (e) {
        console.log('No existing V2 commands config, creating new one');
      }
    }
    
    // Enable the rules command
    embedV2Commands.rules = {
      name: "rules",
      description: "Display server rules with beautiful V2 embed",
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
    
    console.log('✅ Rules command enabled successfully');
    console.log('Updated V2 commands config:', embedV2Commands);
    
  } catch (error) {
    console.error('Error enabling rules command:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enableRulesCommand();