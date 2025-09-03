const { PrismaClient } = require('@prisma/client');

async function emergencyFix() {
  console.log('🚨 EMERGENCY DATABASE LOCK FIX 🚨\n');
  
  const prisma = new PrismaClient({
    log: ['query', 'error']
  });
  
  try {
    // 1. Show all current processes
    console.log('1. Checking current database processes...\n');
    const processes = await prisma.$queryRaw`
      SELECT ID, USER, HOST, DB, COMMAND, TIME, STATE, INFO 
      FROM INFORMATION_SCHEMA.PROCESSLIST 
      WHERE DB = 's82_fivebotmariadb' AND COMMAND != 'Sleep'
    `;
    
    console.table(processes);
    
    // 2. Show InnoDB status
    console.log('\n2. Checking for locks...\n');
    try {
      const innodbStatus = await prisma.$queryRaw`SHOW ENGINE INNODB STATUS`;
      console.log('InnoDB Status:', innodbStatus[0]?.Status?.substring(0, 500) + '...');
    } catch (e) {
      console.log('Could not get InnoDB status');
    }
    
    // 3. Kill all connections except our own
    console.log('\n3. Killing all other connections to the database...\n');
    const currentConnection = await prisma.$queryRaw`SELECT CONNECTION_ID() as id`;
    const myId = currentConnection[0].id;
    
    for (const proc of processes) {
      if (proc.ID !== myId) {
        try {
          await prisma.$executeRawUnsafe(`KILL ${proc.ID}`);
          console.log(`✅ Killed process ${proc.ID}`);
        } catch (e) {
          console.log(`❌ Could not kill process ${proc.ID}`);
        }
      }
    }
    
    // 4. Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 5. Force update with IGNORE
    console.log('\n4. Force updating bot status...\n');
    try {
      const result = await prisma.$executeRawUnsafe(`
        UPDATE IGNORE bots 
        SET status = 'OFFLINE', updated_at = NOW() 
        WHERE id = '9b2be1f9-a3d0-43be-b350-a673b9d309c9'
      `);
      console.log(`✅ Bot status updated! (${result} rows affected)`);
    } catch (e) {
      console.log('❌ Could not update bot status:', e.message);
    }
    
    // 6. Clear any locks on bot_commands
    try {
      await prisma.$executeRawUnsafe(`
        DELETE FROM bot_commands 
        WHERE bot_id = '9b2be1f9-a3d0-43be-b350-a673b9d309c9' 
        AND status IN ('PENDING', 'PROCESSING')
      `);
      console.log('✅ Cleared pending bot commands');
    } catch (e) {
      console.log('❌ Could not clear bot commands');
    }
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error);
    console.log('\n🔧 MANUAL FIX REQUIRED:');
    console.log('1. Stop all Node.js processes (Task Manager)');
    console.log('2. Restart MariaDB/MySQL service');
    console.log('3. If that fails, restart your computer');
  } finally {
    await prisma.$disconnect();
  }
  
  console.log('\n✅ Emergency fix completed. Please try starting the bot again.');
  console.log('\nIf the problem persists:');
  console.log('1. Add DISABLE_STATUS_UPDATES=true to backend/.env');
  console.log('2. Restart the backend');
  console.log('3. Try starting the bot');
}

emergencyFix();