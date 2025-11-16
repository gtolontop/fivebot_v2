const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('📦 Reading migration file...');
    const migrationPath = path.join(__dirname, 'prisma/migrations/20251115000000_add_ai_module/migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL into statements (handle DO blocks specially)
    const statements = [];
    let current = '';
    let inDoBlock = false;

    migrationSQL.split('\n').forEach(line => {
      if (line.trim().startsWith('DO $$')) {
        inDoBlock = true;
        current += line + '\n';
      } else if (inDoBlock && line.trim().startsWith('END $$;')) {
        current += line + '\n';
        statements.push(current.trim());
        current = '';
        inDoBlock = false;
      } else if (inDoBlock) {
        current += line + '\n';
      } else if (line.trim().startsWith('--') || line.trim() === '') {
        // Skip comments and empty lines
      } else if (line.trim().endsWith(';')) {
        current += line;
        statements.push(current.trim());
        current = '';
      } else {
        current += line + '\n';
      }
    });

    console.log(`🚀 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt) {
        console.log(`  [${i + 1}/${statements.length}] ${stmt.substring(0, 50)}...`);
        await prisma.$executeRawUnsafe(stmt);
      }
    }

    console.log('✅ AI migration applied successfully!');
    console.log('📊 Verifying tables created...');

    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%AI%'
      ORDER BY table_name;
    `;

    console.log('Created tables:', tables);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

applyMigration();
