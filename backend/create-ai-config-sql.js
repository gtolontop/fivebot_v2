const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createAIConfig() {
  try {
    const guildId = '1312216952625954857';

    // Find first bot
    const bot = await prisma.bot.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!bot) {
      console.error('❌ No bot found');
      process.exit(1);
    }

    console.log(`✅ Found bot: ${bot.name} (${bot.id})`);
    console.log(`   Creating AI config for guild: ${guildId}`);

    // Use raw SQL to insert
    const result = await prisma.$executeRaw`
      INSERT INTO ai_configs (
        id, guild_id, bot_id, enabled, model, response_mode, personality,
        system_prompt, temperature, max_tokens, require_mention,
        enable_in_tickets, enable_in_threads, typing_indicator,
        use_embeds, conversation_history, context_window, use_rag,
        rate_limit_per_user, rate_limit_per_channel,
        block_nsfw, content_filter, function_calling, log_conversations,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        ${guildId},
        ${bot.id},
        true,
        'GPT_5_NANO'::"AIModel",
        'MENTION',
        'FRIENDLY',
        'You are a helpful Discord bot assistant.',
        0.7,
        2048,
        true,
        false,
        true,
        true,
        false,
        true,
        10,
        false,
        10,
        30,
        true,
        true,
        false,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (guild_id) DO UPDATE SET
        enabled = true,
        model = 'GPT_5_NANO'::"AIModel",
        updated_at = NOW()
      RETURNING id, guild_id, bot_id, model, enabled;
    `;

    console.log('✅ AI Config created!');
    console.log('   Result:', result);

    // Query to verify
    const config = await prisma.$queryRaw`
      SELECT id, guild_id, bot_id, model, enabled
      FROM ai_configs
      WHERE guild_id = ${guildId};
    `;

    console.log('   Config:', config[0]);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createAIConfig();
