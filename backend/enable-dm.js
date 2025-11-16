const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enableDM() {
  try {
    const guildId = '1312216952625954857';

    const result = await prisma.$executeRaw`
      UPDATE ai_configs
      SET require_mention = false,
          updated_at = NOW()
      WHERE guild_id = ${guildId}
      RETURNING id, require_mention;
    `;

    console.log('✅ DM responses enabled!');
    console.log('   The bot will now respond without needing @mention');

    const config = await prisma.$queryRaw`
      SELECT id, guild_id, require_mention
      FROM ai_configs
      WHERE guild_id = ${guildId};
    `;

    console.log('\n📝 Config:', config[0]);
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

enableDM();
