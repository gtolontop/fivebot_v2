const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetBotStatus() {
  const botId = '9b2be1f9-a3d0-43be-b350-a673b9d309c9';
  
  try {
    console.log('Resetting bot status...');
    
    // Force disconnect any existing connections
    await prisma.$disconnect();
    
    // Create new connection
    const freshPrisma = new PrismaClient();
    
    // Use raw query with NOWAIT to fail fast if locked
    const result = await freshPrisma.$executeRawUnsafe(`
      UPDATE bots 
      SET status = 'OFFLINE', updated_at = NOW() 
      WHERE id = '${botId}'
    `);
    
    console.log(`✅ Bot status reset to OFFLINE (${result} rows affected)`);
    
    // Also clear any pending commands
    await freshPrisma.$executeRawUnsafe(`
      UPDATE bot_commands 
      SET status = 'FAILED', error = 'Reset due to lock issues'
      WHERE bot_id = '${botId}' AND status IN ('PENDING', 'PROCESSING')
    `);
    
    await freshPrisma.$disconnect();
    
  } catch (error) {
    console.error('Error:', error);
    
    if (error.code === 'P2034' || error.message?.includes('Lock wait timeout')) {
      console.log('\n⚠️  Database is locked. Trying to find and kill blocking queries...\n');
      
      try {
        // Show current processes
        const processes = await prisma.$queryRawUnsafe(`
          SELECT ID, USER, HOST, DB, COMMAND, TIME, STATE, INFO 
          FROM INFORMATION_SCHEMA.PROCESSLIST 
          WHERE TIME > 5 AND COMMAND != 'Sleep'
        `);
        
        console.log('Long running queries:', processes);
        
        // Kill any queries running for more than 30 seconds
        for (const proc of processes) {
          if (proc.TIME > 30) {
            console.log(`Killing process ${proc.ID}...`);
            try {
              await prisma.$executeRawUnsafe(`KILL ${proc.ID}`);
            } catch (e) {
              console.log(`Could not kill process ${proc.ID}`);
            }
          }
        }
        
      } catch (e) {
        console.error('Could not check processes:', e);
      }
      
      console.log('\nPlease try restarting your MySQL/MariaDB service:');
      console.log('1. Open Services (services.msc)');
      console.log('2. Find "MySQL" or "MariaDB"');
      console.log('3. Right-click and choose "Restart"');
    }
  } finally {
    await prisma.$disconnect();
  }
}

resetBotStatus();