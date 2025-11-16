const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const configSchema = {
  type: 'object',
  properties: {
    apiKey: {
      type: 'string',
      title: '🔑 API Key',
      description: 'Your OpenAI or Claude API key (will be encrypted)',
      'ui:widget': 'password'
    },
    model: {
      type: 'string',
      title: '🤖 AI Model',
      enum: ['GPT_5_NANO', 'GPT_4O_MINI', 'GPT_4O', 'O1_MINI', 'O1_PREVIEW', 'CLAUDE_3_5_SONNET', 'CLAUDE_3_OPUS', 'CLAUDE_3_HAIKU'],
      enumNames: ['GPT-5 Nano', 'GPT-4o Mini', 'GPT-4o', 'O1 Mini', 'O1 Preview', 'Claude 3.5 Sonnet', 'Claude 3 Opus', 'Claude 3 Haiku'],
      default: 'GPT_4O_MINI'
    },
    systemPrompt: {
      type: 'string',
      title: '📝 System Prompt',
      description: 'Instructions for the AI behavior and personality',
      'ui:widget': 'textarea',
      'ui:options': { rows: 5 }
    },
    temperature: {
      type: 'number',
      title: '🌡️ Temperature',
      description: 'Creativity level (0 = focused, 2 = creative)',
      minimum: 0,
      maximum: 2,
      default: 0.7,
      multipleOf: 0.1
    },
    maxTokens: {
      type: 'integer',
      title: '📊 Max Tokens',
      description: 'Maximum response length',
      minimum: 100,
      maximum: 8000,
      default: 2048
    },
    contextWindow: {
      type: 'integer',
      title: '💬 Context Window',
      description: 'Number of previous messages to remember',
      minimum: 1,
      maximum: 50,
      default: 10
    },
    allowedChannelIds: {
      type: 'array',
      title: '📢 Allowed Channels',
      description: 'Channel IDs where AI can respond (empty = all channels)',
      items: { type: 'string' }
    },
    allowedRoleIds: {
      type: 'array',
      title: '👥 Allowed Roles',
      description: 'Role IDs that can use AI (empty = everyone)',
      items: { type: 'string' }
    },
    bannedUserIds: {
      type: 'array',
      title: '🚫 Banned Users',
      description: 'User IDs blocked from using AI',
      items: { type: 'string' }
    },
    requireMention: {
      type: 'boolean',
      title: '@ Require Mention',
      description: 'Only respond when bot is mentioned',
      default: true
    },
    respondToThreads: {
      type: 'boolean',
      title: '🧵 Respond in Threads',
      description: 'Allow AI to respond in threads',
      default: true
    },
    respondToDMs: {
      type: 'boolean',
      title: '📨 Respond to DMs',
      description: 'Allow AI to respond in direct messages',
      default: false
    },
    rateLimitPerUser: {
      type: 'integer',
      title: '⏱️ Rate Limit (messages)',
      description: 'Max messages per user in time window',
      minimum: 1,
      maximum: 100,
      default: 10
    },
    rateLimitWindow: {
      type: 'integer',
      title: '⏱️ Rate Limit Window (seconds)',
      description: 'Time window for rate limiting',
      minimum: 10,
      maximum: 3600,
      default: 60
    },
    cooldownSeconds: {
      type: 'integer',
      title: '⏳ Cooldown (seconds)',
      description: 'Delay between messages from same user',
      minimum: 0,
      maximum: 60,
      default: 3
    },
    enableConversationMemory: {
      type: 'boolean',
      title: '🧠 Conversation Memory',
      description: 'Remember previous messages in conversation',
      default: true
    },
    conversationExpiryMinutes: {
      type: 'integer',
      title: '⏰ Memory Expiry (minutes)',
      description: 'How long to remember conversations',
      minimum: 5,
      maximum: 1440,
      default: 60
    },
    typingIndicator: {
      type: 'boolean',
      title: '⌨️ Typing Indicator',
      description: 'Show typing animation while generating response',
      default: true
    },
    embedResponses: {
      type: 'boolean',
      title: '📋 Embed Responses',
      description: 'Format responses as Discord embeds',
      default: false
    },
    embedColor: {
      type: 'string',
      title: '🎨 Embed Color',
      description: 'Hex color for embeds (e.g., #5865F2)',
      default: '#5865F2',
      pattern: '^#[0-9A-Fa-f]{6}$'
    },
    includeBotName: {
      type: 'boolean',
      title: '🤖 Include Bot Name',
      description: 'Show bot name in responses',
      default: true
    },
    includeTimestamp: {
      type: 'boolean',
      title: '🕐 Include Timestamp',
      description: 'Show timestamp in responses',
      default: false
    },
    includeUsername: {
      type: 'boolean',
      title: '👤 Include Username',
      description: 'Show username in context',
      default: true
    },
    moderationEnabled: {
      type: 'boolean',
      title: '🛡️ Content Moderation',
      description: 'Enable content filtering',
      default: true
    },
    moderationBlockNSFW: {
      type: 'boolean',
      title: '🔞 Block NSFW Content',
      description: 'Block inappropriate content',
      default: true
    },
    moderationLogChannel: {
      type: 'string',
      title: '📝 Moderation Log Channel',
      description: 'Channel ID for moderation logs'
    },
    ragEnabled: {
      type: 'boolean',
      title: '📚 RAG Knowledge Base',
      description: 'Enable custom knowledge base search',
      default: false
    },
    ragMaxDocuments: {
      type: 'integer',
      title: '📄 Max RAG Documents',
      description: 'Maximum documents to search',
      minimum: 1,
      maximum: 20,
      default: 5
    },
    ragSimilarityThreshold: {
      type: 'number',
      title: '🎯 RAG Similarity Threshold',
      description: 'Minimum similarity score (0-1)',
      minimum: 0,
      maximum: 1,
      default: 0.7,
      multipleOf: 0.1
    },
    autoSummarizeThreads: {
      type: 'boolean',
      title: '📑 Auto-Summarize Threads',
      description: 'Automatically summarize long threads',
      default: false
    },
    autoSummarizeThreshold: {
      type: 'integer',
      title: '📊 Summarize Threshold',
      description: 'Message count to trigger summary',
      minimum: 10,
      maximum: 200,
      default: 50
    },
    commandsEnabled: {
      type: 'boolean',
      title: '⚡ AI Commands',
      description: 'Enable AI-specific commands',
      default: true
    },
    commandPrefix: {
      type: 'string',
      title: '🔧 Command Prefix',
      description: 'Prefix for AI commands',
      default: '!ai',
      maxLength: 10
    },
    logConversations: {
      type: 'boolean',
      title: '📊 Log Conversations',
      description: 'Save conversation history',
      default: true
    },
    logUsageStats: {
      type: 'boolean',
      title: '📈 Log Usage Stats',
      description: 'Track token usage and costs',
      default: true
    }
  },
  required: ['apiKey', 'model']
};

async function updateConfig() {
  try {
    const result = await prisma.module.update({
      where: { slug: 'ai-assistant' },
      data: { configSchema: JSON.stringify(configSchema) }
    });
    console.log('✅ Config schema updated for:', result.name);
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updateConfig();
