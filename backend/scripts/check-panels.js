const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkPanels() {
  let connection;
  
  try {
    console.log('🔍 Checking ticket panels in database...\n');
    
    // Parse DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    const url = new URL(dbUrl);
    const config = {
      host: url.hostname,
      port: url.port || 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
    };
    
    connection = await mysql.createConnection(config);
    
    // Check ticket panels
    const [panels] = await connection.execute(`
      SELECT 
        tp.id,
        tp.guildId,
        tp.channelId,
        tp.messageId,
        tp.configId,
        tp.active,
        tp.createdAt,
        tc.id as config_id,
        tc.guildId as config_guildId
      FROM TicketPanel tp
      LEFT JOIN TicketConfig tc ON tp.configId = tc.id
      WHERE tp.active = 1
      ORDER BY tp.createdAt DESC
    `);
    
    console.log(`Found ${panels.length} active panel(s):\n`);
    
    for (const panel of panels) {
      console.log(`Panel ID: ${panel.id}`);
      console.log(`  Guild ID: ${panel.guildId}`);
      console.log(`  Channel ID: ${panel.channelId}`);
      console.log(`  Config ID: ${panel.configId}`);
      console.log(`  Created: ${panel.createdAt}`);
      console.log(`  Config exists: ${panel.config_id ? 'Yes' : 'No'}`);
      console.log('---');
    }
    
    // Check for orphan panels (no config)
    const [orphans] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM TicketPanel tp
      LEFT JOIN TicketConfig tc ON tp.configId = tc.id
      WHERE tc.id IS NULL
    `);
    
    if (orphans[0].count > 0) {
      console.log(`\n⚠️  Found ${orphans[0].count} orphan panel(s) without config`);
      
      // Clean them up
      console.log('🗑️  Cleaning orphan panels...');
      await connection.execute(`
        DELETE tp FROM TicketPanel tp
        LEFT JOIN TicketConfig tc ON tp.configId = tc.id
        WHERE tc.id IS NULL
      `);
    }
    
    console.log('\n✅ Panel check complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkPanels();