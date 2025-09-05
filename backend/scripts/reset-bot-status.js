const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetBotStatuses() {
  try {
    console.log('🔧 Resetting all bot statuses to OFFLINE...');
    
    // Reset all bots that are stuck in STARTING or STOPPING states
    const result = await prisma.bot.updateMany({
      where: {
        status: {
          in: ['STARTING', 'STOPPING']
        }
      },
      data: {
        status: 'OFFLINE'
      }
    });

    console.log(`✅ Reset ${result.count} bot(s) to OFFLINE status`);

    // Also clear any pending commands
    const commandResult = await prisma.botCommand.deleteMany({
      where: {
        status: 'PENDING'
      }
    });

    console.log(`🗑️  Cleared ${commandResult.count} pending command(s)`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting bot statuses:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetBotStatuses();