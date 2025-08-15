const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    
    // Parse DATABASE_URL or use individual env vars
    const dbUrl = process.env.DATABASE_URL;
    let config;
    
    if (dbUrl) {
      // Parse mysql://user:password@host:port/database
      const url = new URL(dbUrl);
      config = {
        host: url.hostname,
        port: url.port || 3306,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.slice(1), // Remove leading slash
      };
      
      console.log(`Host: ${config.host}`);
      console.log(`User: ${config.user}`);
      console.log(`Database: ${config.database}`);
    } else {
      config = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      };
    }
    
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');
    
    // Migration queries
    const migrations = [
      {
        name: 'Add should_auto_restart column to bots table',
        query: 'ALTER TABLE bots ADD COLUMN should_auto_restart BOOLEAN DEFAULT TRUE',
      },
      {
        name: 'Add welcome_thumbnail_url column to bot_configs table',
        query: 'ALTER TABLE bot_configs ADD COLUMN welcome_thumbnail_url VARCHAR(255)',
      },
      {
        name: 'Set auto-restart true for online bots',
        query: "UPDATE bots SET should_auto_restart = true WHERE status = 'ONLINE' AND is_active = true",
      },
      {
        name: 'Set auto-restart false for offline bots',
        query: "UPDATE bots SET should_auto_restart = false WHERE status = 'OFFLINE' AND is_active = true",
      },
    ];
    
    // Run migrations
    for (const migration of migrations) {
      try {
        console.log(`🔄 Running: ${migration.name}...`);
        await connection.execute(migration.query);
        console.log(`✅ Completed: ${migration.name}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  Column already exists: ${migration.name}`);
        } else {
          console.error(`❌ Failed: ${migration.name}`, error.message);
          throw error;
        }
      }
    }
    
    console.log('🎉 All migrations completed successfully!');
    
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