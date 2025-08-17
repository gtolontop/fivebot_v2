require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createBotMetricsTable() {
  try {
    console.log('🚀 Creating bot_metrics table...');
    
    // Create the table using raw SQL
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS bot_metrics (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        bot_id VARCHAR(191) NOT NULL,
        date DATE NOT NULL,
        commands_used INT NOT NULL DEFAULT 0,
        messages_processed INT NOT NULL DEFAULT 0,
        guilds_count INT NOT NULL DEFAULT 0,
        users_count INT NOT NULL DEFAULT 0,
        uptime_seconds INT NOT NULL DEFAULT 0,
        avg_response_time_ms INT NOT NULL DEFAULT 0,
        errors_count INT NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        
        UNIQUE INDEX bot_metrics_bot_id_date_key (bot_id, date),
        INDEX bot_metrics_bot_id_idx (bot_id),
        
        CONSTRAINT bot_metrics_bot_id_fkey 
        FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE ON UPDATE CASCADE
      )
    `;
    
    console.log('✅ Table bot_metrics created successfully!');
    
    // Create some sample data for existing bots
    const bots = await prisma.bot.findMany({
      select: { id: true, name: true, status: true }
    });
    
    if (bots.length > 0) {
      console.log(`📊 Creating sample metrics for ${bots.length} bots...`);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Create metrics for the last 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        for (const bot of bots) {
          const isOnline = bot.status === 'ONLINE';
          
          await prisma.botMetrics.create({
            data: {
              botId: bot.id,
              date: date,
              commandsUsed: isOnline ? Math.floor(Math.random() * 100) + 10 : 0,
              messagesProcessed: isOnline ? Math.floor(Math.random() * 500) + 50 : 0,
              guildsCount: isOnline ? Math.floor(Math.random() * 10) + 1 : 0,
              usersCount: isOnline ? Math.floor(Math.random() * 1000) + 100 : 0,
              uptimeSeconds: isOnline ? Math.floor(Math.random() * 86400) + 3600 : 0,
              avgResponseTime: isOnline ? Math.floor(Math.random() * 200) + 50 : 0,
              errorsCount: Math.floor(Math.random() * 5)
            }
          });
        }
      }
      
      console.log('✅ Sample metrics created for the last 7 days!');
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating bot_metrics table:', error);
    
    // If table already exists, just create sample data
    if (error.message?.includes('already exists')) {
      console.log('📝 Table already exists, creating sample data...');
      // Add sample data creation logic here if needed
    }
  } finally {
    await prisma.$disconnect();
  }
}

createBotMetricsTable();