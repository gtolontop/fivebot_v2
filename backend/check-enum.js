const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEnum() {
  try {
    const result = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"AIModel")) AS model_name;
    `;
    console.log('Available AIModel values:');
    result.forEach(r => console.log(`  - ${r.model_name}`));
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkEnum();
