const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyTables() {
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'AI%'
      ORDER BY table_name;
    `;

    console.log('✅ AI Tables found:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));

    const moduleAI = await prisma.module.findUnique({
      where: { slug: 'ai-assistant' }
    });

    if (moduleAI) {
      console.log('\n✅ AI Module exists:', moduleAI.name);
    } else {
      console.log('\n❌ AI Module NOT found');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

verifyTables();
