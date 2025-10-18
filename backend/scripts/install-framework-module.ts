import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function installFrameworkModuleOnAllBots() {
  console.log('🔧 Installation du module framework sur tous les bots...\n');

  try {
    // Get framework module
    const frameworkModule = await prisma.module.findUnique({
      where: { slug: 'framework' },
    });

    if (!frameworkModule) {
      console.error('❌ Module framework non trouvé dans la base de données');
      console.log('Veuillez exécuter les seeds: npm run seed');
      return;
    }

    console.log(`✅ Module framework trouvé: ${frameworkModule.name} (ID: ${frameworkModule.id})\n`);

    // Get all active bots
    const bots = await prisma.bot.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        botModules: {
          where: { moduleId: frameworkModule.id },
          select: { id: true },
        },
      },
    });

    console.log(`📊 ${bots.length} bot(s) actif(s) trouvé(s)\n`);

    let installedCount = 0;
    let alreadyInstalledCount = 0;

    for (const bot of bots) {
      if (bot.modules.length > 0) {
        console.log(`⏭️  Bot "${bot.name}" a déjà le module framework installé`);
        alreadyInstalledCount++;
        continue;
      }

      try {
        await prisma.botModule.create({
          data: {
            botId: bot.id,
            moduleId: frameworkModule.id,
            enabled: true,
          },
        });
        console.log(`✅ Module framework installé sur le bot "${bot.name}"`);
        installedCount++;
      } catch (error) {
        console.error(`❌ Erreur lors de l'installation sur le bot "${bot.name}":`, error);
      }
    }

    console.log('\n📊 Résumé:');
    console.log(`  - Bots avec framework déjà installé: ${alreadyInstalledCount}`);
    console.log(`  - Nouveaux bots avec framework installé: ${installedCount}`);
    console.log(`  - Total: ${bots.length} bots`);
    console.log('\n✅ Migration terminée avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

installFrameworkModuleOnAllBots()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
