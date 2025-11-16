const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createAIConfig() {
  try {
    const guildId = '1312216952625954857';

    // Find first bot (simpler approach)
    const bot = await prisma.bot.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!bot) {
      console.error('❌ No bot found');
      process.exit(1);
    }

    console.log(`✅ Found bot: ${bot.name} (${bot.id})`);
    console.log(`   Creating AI config for guild: ${guildId}`);

    const config = await prisma.aIConfig.upsert({
      where: {
        guildId: guildId
      },
      update: {
        enabled: true,
        model: 'GPT_5_NANO'
      },
      create: {
        guildId: guildId,
        botId: bot.id,
        enabled: true,
        model: 'GPT_5_NANO',
        responseMode: 'MENTION',
        personality: 'FRIENDLY',
        systemPrompt: 'You are a helpful Discord bot assistant.',
        temperature: 0.7,
        maxTokens: 2048,
        requireMention: true,
        enableInTickets: false,
        enableInThreads: true,
        typingIndicator: true,
        useEmbeds: false,
        conversationHistory: true,
        contextWindow: 10,
        useRAG: false,
        rateLimitPerUser: 10,
        rateLimitPerChannel: 30,
        blockNSFW: true,
        contentFilter: true,
        functionCalling: false,
        logConversations: true
      }
    });

    console.log('✅ AI Config created:', config.id);
    console.log('   Guild:', config.guildId);
    console.log('   Bot:', config.botId);
    console.log('   Model:', config.model);
    console.log('   Enabled:', config.enabled);
    console.log('\n⚠️  NOTE: You need to add your OpenAI API key in the web interface!');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createAIConfig();
