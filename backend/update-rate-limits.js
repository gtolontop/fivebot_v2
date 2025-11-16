const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateRateLimits() {
  try {
    const guildId = '1312216952625954857';

    // Mettre à jour les rate limits pour qu'ils soient désactivés
    const result = await prisma.aIConfig.updateMany({
      where: { guildId },
      data: {
        rateLimitPerUser: 999,
        rateLimitPerChannel: 9999,
      },
    });

    console.log('✅ Rate limits mis à jour!');
    console.log('   Résultat:', result);

    // Vérifier
    const config = await prisma.aIConfig.findUnique({
      where: { guildId },
      select: {
        id: true,
        guildId: true,
        rateLimitPerUser: true,
        rateLimitPerChannel: true,
      },
    });

    console.log('\n📝 Config actuelle:', config);
    console.log('\n🎉 Rate limits pratiquement désactivés (999/h par user, 9999/h par canal)');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Erreur:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updateRateLimits();
