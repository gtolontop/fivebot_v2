const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePrompt() {
  try {
    const guildId = '1312216952625954857';

    const result = await prisma.$executeRaw`
      UPDATE ai_configs
      SET system_prompt = 'You are a simple and concise Discord assistant. Keep responses to 1-2 sentences max. Be direct and straight to the point. No bullet lists or complex formatting.',
          updated_at = NOW()
      WHERE guild_id = ${guildId}
      RETURNING id, system_prompt;
    `;

    console.log('✅ System prompt mis à jour!');
    console.log('   Résultat:', result);

    // Vérifier
    const config = await prisma.$queryRaw`
      SELECT id, guild_id, system_prompt
      FROM ai_configs
      WHERE guild_id = ${guildId};
    `;

    console.log('\n📝 Config actuelle:', config[0]);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Erreur:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updatePrompt();
