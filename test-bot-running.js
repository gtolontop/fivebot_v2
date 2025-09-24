// Check if bot is running and test V2 commands
const { PrismaClient } = require('./backend/node_modules/@prisma/client');

async function checkBotStatus() {
  const prisma = new PrismaClient();
  const botId = '5ad66b0d-b8e6-4f81-92e3-b32a518a8764';
  
  try {
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      include: { 
        config: true,
        hosts: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    console.log('\n=== Bot Status ===');
    console.log('Name:', bot.name);
    console.log('Status:', bot.status);
    console.log('Last Updated:', bot.updatedAt);
    
    if (bot.hosts.length > 0) {
      console.log('\n=== Host Status ===');
      console.log('Host Status:', bot.hosts[0].status);
      console.log('Started At:', bot.hosts[0].startedAt);
    }
    
    // Check recent logs
    const recentLogs = await prisma.jobLog.findMany({
      where: { 
        botId,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('\n=== Recent Job Logs ===');
    recentLogs.forEach(log => {
      console.log(`[${log.createdAt.toISOString()}] ${log.jobType} - ${log.status}: ${log.message}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBotStatus();