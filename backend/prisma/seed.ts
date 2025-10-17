import { PrismaClient } from '@prisma/client';
import { seedModules } from './seeds/modules.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting database seeding...');

  await seedModules();

  console.log('✅ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
