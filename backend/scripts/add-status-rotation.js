const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    
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
    console.log('✅ Connected to database');
    
    // Add status_rotation column
    try {
      await connection.execute(`
        ALTER TABLE bot_configs 
        ADD COLUMN status_rotation LONGTEXT NULL 
        AFTER ticket_data
      `);
      console.log('✅ Added status_rotation column to bot_configs table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Column status_rotation already exists');
      } else {
        throw error;
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
runMigration();