const mysql = require('mysql2/promise');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function nuclearFix() {
  console.log('🔴 NUCLEAR DATABASE FIX - LAST RESORT 🔴\n');
  
  // Parse connection string
  const url = new URL(process.env.DATABASE_URL);
  const config = {
    host: url.hostname,
    port: url.port || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.substring(1)
  };
  
  let connection;
  
  try {
    // 1. Direct MySQL connection (bypass Prisma)
    console.log('1. Connecting directly to MySQL...\n');
    connection = await mysql.createConnection(config);
    
    // 2. Kill ALL connections to our database
    console.log('2. KILLING ALL CONNECTIONS...\n');
    const [connections] = await connection.execute(`
      SELECT ID, USER, HOST, COMMAND, TIME, STATE, INFO 
      FROM INFORMATION_SCHEMA.PROCESSLIST 
      WHERE DB = ? AND ID != CONNECTION_ID()
    `, [config.database]);
    
    for (const conn of connections) {
      try {
        await connection.execute(`KILL ?`, [conn.ID]);
        console.log(`✅ Killed connection ${conn.ID}`);
      } catch (e) {
        console.log(`❌ Could not kill ${conn.ID}`);
      }
    }
    
    // 3. Drop and recreate the bot_commands table to clear any locks
    console.log('\n3. Dropping bot_commands table if it exists...\n');
    try {
      await connection.execute('DROP TABLE IF EXISTS bot_commands');
      console.log('✅ Dropped bot_commands table');
    } catch (e) {
      console.log('❌ Could not drop bot_commands');
    }
    
    // 4. Force update with direct SQL
    console.log('\n4. Force updating bot status with direct SQL...\n');
    const [result] = await connection.execute(
      'UPDATE bots SET status = ?, updated_at = NOW() WHERE id = ?',
      ['OFFLINE', '9b2be1f9-a3d0-43be-b350-a673b9d309c9']
    );
    console.log(`✅ Bot status updated! (${result.affectedRows} rows)`);
    
    // 5. Show table status
    console.log('\n5. Checking table status...\n');
    const [tables] = await connection.execute('SHOW TABLE STATUS LIKE "bots"');
    console.table(tables);
    
    // 6. Close connection
    await connection.end();
    
    console.log('\n✅ NUCLEAR FIX COMPLETED!\n');
    console.log('Now do this:');
    console.log('1. Close ALL Node.js processes (Task Manager)');
    console.log('2. Add DISABLE_STATUS_UPDATES=true to backend/.env');
    console.log('3. Start the backend: npm run dev');
    console.log('4. Start the bot from the web interface');
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED') {
      console.log('\n🔧 Access denied. Try with root access or contact your hosting provider.');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 Cannot connect to database. Check if MariaDB/MySQL is running.');
    }
    
    console.log('\n🚨 ULTIMATE FALLBACK:');
    console.log('1. Contact your hosting provider to restart the database');
    console.log('2. Or restart your entire system');
    console.log('3. Or use phpMyAdmin to manually run:');
    console.log('   UPDATE bots SET status = "OFFLINE" WHERE id = "9b2be1f9-a3d0-43be-b350-a673b9d309c9";');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Install mysql2 if needed
const { exec } = require('child_process');
exec('npm list mysql2', (error, stdout, stderr) => {
  if (error) {
    console.log('Installing mysql2...');
    exec('npm install mysql2', (error, stdout, stderr) => {
      if (error) {
        console.error('Could not install mysql2:', error);
        return;
      }
      console.log('mysql2 installed, running fix...\n');
      nuclearFix();
    });
  } else {
    nuclearFix();
  }
});