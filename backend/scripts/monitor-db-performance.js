const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../.env' });

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function monitorPerformance() {
  console.log('🔍 Monitoring Database Performance...\n');
  console.log('Press Ctrl+C to stop\n');

  const interval = setInterval(async () => {
    try {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`\n[${timestamp}] Checking...`);

      // Check slow queries
      const slowQueries = await prisma.$queryRaw`
        SELECT 
          ID,
          USER,
          HOST,
          DB,
          COMMAND,
          TIME,
          STATE,
          LEFT(INFO, 100) as QUERY_PREVIEW
        FROM information_schema.PROCESSLIST
        WHERE COMMAND != 'Sleep'
          AND TIME > 2
        ORDER BY TIME DESC
        LIMIT 5
      `;

      if (slowQueries.length > 0) {
        console.log('⚠️  Slow Queries Detected:');
        slowQueries.forEach(q => {
          console.log(`  - Thread ${q.ID}: ${q.TIME}s - ${q.STATE} - ${q.QUERY_PREVIEW || 'N/A'}`);
        });
      }

      // Check connection count
      const connectionCount = await prisma.$queryRaw`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN COMMAND = 'Sleep' THEN 1 ELSE 0 END) as sleeping,
               SUM(CASE WHEN COMMAND != 'Sleep' THEN 1 ELSE 0 END) as active
        FROM information_schema.PROCESSLIST
      `;

      console.log(`📊 Connections: Total=${connectionCount[0].total}, Active=${connectionCount[0].active}, Sleeping=${connectionCount[0].sleeping}`);

      // Check for lock waits
      const lockWaits = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM information_schema.innodb_lock_waits
      `;

      if (lockWaits[0].count > 0) {
        console.log(`🔒 Lock Waits: ${lockWaits[0].count}`);
      }

      // Check InnoDB status for deadlocks
      const innodbStatus = await prisma.$queryRaw`SHOW ENGINE INNODB STATUS`;
      const statusText = innodbStatus[0].Status;
      
      // Check for recent deadlocks
      if (statusText.includes('LATEST DETECTED DEADLOCK')) {
        const deadlockMatch = statusText.match(/LATEST DETECTED DEADLOCK[\s\S]*?WE ROLL BACK TRANSACTION/);
        if (deadlockMatch) {
          console.log('⚠️  Recent deadlock detected!');
        }
      }

    } catch (error) {
      console.error('❌ Monitoring error:', error.message);
    }
  }, 5000); // Check every 5 seconds

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nStopping monitor...');
    clearInterval(interval);
    await prisma.$disconnect();
    process.exit(0);
  });
}

monitorPerformance();