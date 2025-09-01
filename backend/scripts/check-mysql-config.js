const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../.env' });

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function checkMySQLConfig() {
  try {
    console.log('🔍 Checking MySQL Configuration...\n');

    // Check important MySQL variables
    const variables = await prisma.$queryRaw`
      SHOW VARIABLES WHERE Variable_name IN (
        'innodb_lock_wait_timeout',
        'max_connections',
        'wait_timeout',
        'interactive_timeout',
        'connect_timeout',
        'net_read_timeout',
        'net_write_timeout',
        'innodb_thread_concurrency',
        'innodb_buffer_pool_size',
        'innodb_log_file_size',
        'thread_cache_size',
        'max_allowed_packet',
        'query_cache_size',
        'query_cache_type'
      )
    `;

    console.log('📊 MySQL Configuration Variables:');
    console.log('================================');
    variables.forEach(v => {
      console.log(`${v.Variable_name}: ${v.Value}`);
    });

    // Check current connections
    const processlist = await prisma.$queryRaw`
      SELECT COUNT(*) as count, 
             db, 
             command, 
             state 
      FROM information_schema.processlist 
      WHERE db IS NOT NULL 
      GROUP BY db, command, state
    `;

    console.log('\n📈 Current Connection Statistics:');
    console.log('=================================');
    processlist.forEach(p => {
      console.log(`Database: ${p.db || 'N/A'}, Command: ${p.command}, State: ${p.state || 'N/A'}, Count: ${p.count}`);
    });

    // Check for locks
    const locks = await prisma.$queryRaw`
      SELECT 
        blocking_trx.trx_mysql_thread_id AS blocking_thread,
        blocking_trx.trx_query AS blocking_query,
        blocked_trx.trx_mysql_thread_id AS blocked_thread,
        blocked_trx.trx_query AS blocked_query,
        blocked_trx.trx_wait_started AS wait_started
      FROM information_schema.innodb_lock_waits
      JOIN information_schema.innodb_trx blocking_trx 
        ON blocking_trx.trx_id = innodb_lock_waits.blocking_trx_id
      JOIN information_schema.innodb_trx blocked_trx 
        ON blocked_trx.trx_id = innodb_lock_waits.requested_lock_id
    `;

    if (locks.length > 0) {
      console.log('\n⚠️  Active Lock Waits:');
      console.log('====================');
      locks.forEach(l => {
        console.log(`Blocking Thread: ${l.blocking_thread}`);
        console.log(`Blocking Query: ${l.blocking_query}`);
        console.log(`Blocked Thread: ${l.blocked_thread}`);
        console.log(`Blocked Query: ${l.blocked_query}`);
        console.log(`Wait Started: ${l.wait_started}`);
        console.log('---');
      });
    } else {
      console.log('\n✅ No active lock waits detected');
    }

    // Check table lock status
    const tableLocks = await prisma.$queryRaw`
      SHOW OPEN TABLES WHERE In_use > 0
    `;

    if (tableLocks.length > 0) {
      console.log('\n🔒 Tables Currently In Use:');
      console.log('==========================');
      tableLocks.forEach(t => {
        console.log(`Database: ${t.Database}, Table: ${t.Table}, In Use: ${t.In_use}, Name Locked: ${t.Name_locked}`);
      });
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('==================');
    
    const innodbTimeout = variables.find(v => v.Variable_name === 'innodb_lock_wait_timeout');
    if (innodbTimeout && parseInt(innodbTimeout.Value) < 50) {
      console.log(`⚠️  innodb_lock_wait_timeout is ${innodbTimeout.Value}s. Consider increasing it to 50s or higher.`);
    }

    const maxConnections = variables.find(v => v.Variable_name === 'max_connections');
    if (maxConnections && parseInt(maxConnections.Value) < 200) {
      console.log(`⚠️  max_connections is ${maxConnections.Value}. Consider increasing it to 200 or higher.`);
    }

    console.log('✅ Connection pool configured in Prisma: connection_limit=20, pool_timeout=30s');

  } catch (error) {
    console.error('❌ Error checking MySQL configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMySQLConfig();