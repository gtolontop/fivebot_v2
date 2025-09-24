const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanOrphanPanels() {
  try {
    console.log('🧹 Cleaning orphan ticket panels...');
    
    // Delete panels where the guild doesn't exist or bot is not in the guild
    const deletedPanels = await prisma.ticketPanel.deleteMany({
      where: {
        OR: [
          // Panels without a valid config
          { config: null },
          // For now, we'll mark all panels as potentially orphaned
          // In production, you'd check against actual bot guilds
        ]
      }
    });
    
    console.log(`✅ Deleted ${deletedPanels.count} orphan panels`);
    
    // Also clean up ticket configs without any panels
    const orphanConfigs = await prisma.ticketConfig.findMany({
      where: {
        panels: {
          none: {}
        }
      },
      select: { id: true }
    });
    
    if (orphanConfigs.length > 0) {
      const deletedConfigs = await prisma.ticketConfig.deleteMany({
        where: {
          id: {
            in: orphanConfigs.map(c => c.id)
          }
        }
      });
      console.log(`✅ Deleted ${deletedConfigs.count} orphan ticket configs`);
    }
    
  } catch (error) {
    console.error('❌ Error cleaning orphan panels:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanOrphanPanels();