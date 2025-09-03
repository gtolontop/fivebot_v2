const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('🗑️  RESETTING DATABASE...\n');
  
  try {
    // Get all table names
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME != '_prisma_migrations'
    `;
    
    console.log('Found tables:', tables.map(t => t.TABLE_NAME).join(', '));
    
    // Disable foreign key checks
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;
    
    // Drop all tables except migrations
    for (const table of tables) {
      console.log(`Dropping table: ${table.TABLE_NAME}`);
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${table.TABLE_NAME}\``);
    }
    
    // Re-enable foreign key checks
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;
    
    console.log('\n✅ All tables dropped successfully!');
    console.log('\nNow run:');
    console.log('1. npx prisma migrate dev --name init');
    console.log('2. npx prisma generate');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'P2010') {
      console.log('\n🔧 Try running this SQL in phpMyAdmin instead:');
      console.log('SET FOREIGN_KEY_CHECKS = 0;');
      console.log('DROP DATABASE s82_fivebotmariadb;');
      console.log('CREATE DATABASE s82_fivebotmariadb;');
      console.log('SET FOREIGN_KEY_CHECKS = 1;');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Add safety prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  WARNING: This will DELETE ALL DATA!');
console.log('Type "RESET" to confirm: ');

rl.question('> ', (answer) => {
  if (answer === 'RESET') {
    resetDatabase();
  } else {
    console.log('Cancelled.');
    process.exit(0);
  }
  rl.close();
});