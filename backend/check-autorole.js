const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAutoRole() {
  try {
    // Find the bot
    const bot = await prisma.bot.findFirst({
      where: {
        name: { contains: 'fivelink.lol AI' }
      },
      include: { config: true }
    });

    if (!bot) {
      console.log('❌ Bot not found');
      return;
    }

    console.log('✅ Bot found!');
    console.log('Bot ID:', bot.id);
    console.log('Bot Name:', bot.name);
    console.log('\n📋 Current Auto-Role Configuration:');
    console.log('- autoRoleEnabled:', bot.config?.autoRoleEnabled);
    console.log('- autoRoleId:', bot.config?.autoRoleId);
    console.log('- autoRoleIds:', bot.config?.autoRoleIds);

    if (!bot.config?.autoRoleEnabled) {
      console.log('\n⚠️  Auto-role is DISABLED in the database!');
      console.log('You need to enable it in the web interface and save the configuration.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAutoRole();
