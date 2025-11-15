-- CreateEnum for AI models
DO $$ BEGIN
 CREATE TYPE "AIModel" AS ENUM ('GPT_5_NANO', 'GPT_4O_MINI', 'GPT_4O', 'O1_MINI', 'O1_PREVIEW', 'CLAUDE_3_5_SONNET', 'CLAUDE_3_OPUS', 'CLAUDE_3_HAIKU');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum for message roles
DO $$ BEGIN
 CREATE TYPE "AIMessageRole" AS ENUM ('SYSTEM', 'USER', 'ASSISTANT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateTable AIConfig
CREATE TABLE IF NOT EXISTS "AIConfig" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "model" TEXT NOT NULL DEFAULT 'GPT_5_NANO',
    "apiKey" TEXT,
    "apiKeyEncrypted" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 2048,
    "systemPrompt" TEXT,
    "contextWindow" INTEGER NOT NULL DEFAULT 10,
    "allowedChannelIds" TEXT[],
    "allowedRoleIds" TEXT[],
    "bannedUserIds" TEXT[],
    "rateLimitPerUser" INTEGER NOT NULL DEFAULT 10,
    "rateLimitWindow" INTEGER NOT NULL DEFAULT 60,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 3,
    "requireMention" BOOLEAN NOT NULL DEFAULT true,
    "respondToThreads" BOOLEAN NOT NULL DEFAULT true,
    "respondToDMs" BOOLEAN NOT NULL DEFAULT false,
    "enableConversationMemory" BOOLEAN NOT NULL DEFAULT true,
    "conversationExpiryMinutes" INTEGER NOT NULL DEFAULT 60,
    "typingIndicator" BOOLEAN NOT NULL DEFAULT true,
    "embedResponses" BOOLEAN NOT NULL DEFAULT false,
    "embedColor" TEXT DEFAULT '#5865F2',
    "includeBotName" BOOLEAN NOT NULL DEFAULT true,
    "includeTimestamp" BOOLEAN NOT NULL DEFAULT false,
    "includeUsername" BOOLEAN NOT NULL DEFAULT true,
    "moderationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "moderationBlockNSFW" BOOLEAN NOT NULL DEFAULT true,
    "moderationLogChannel" TEXT,
    "ragEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ragMaxDocuments" INTEGER NOT NULL DEFAULT 5,
    "ragChunkSize" INTEGER NOT NULL DEFAULT 1000,
    "ragSimilarityThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "autoSummarizeThreads" BOOLEAN NOT NULL DEFAULT false,
    "autoSummarizeThreshold" INTEGER NOT NULL DEFAULT 50,
    "commandsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "commandPrefix" TEXT DEFAULT '!ai',
    "allowFunctionCalling" BOOLEAN NOT NULL DEFAULT false,
    "functionCallWhitelist" TEXT[],
    "logConversations" BOOLEAN NOT NULL DEFAULT true,
    "logUsageStats" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable AIUsage
CREATE TABLE IF NOT EXISTS "AIUsage" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseTime" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable AIConversation
CREATE TABLE IF NOT EXISTS "AIConversation" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable AIConversationMessage
CREATE TABLE IF NOT EXISTS "AIConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AIMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "AIConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable AIDocument
CREATE TABLE IF NOT EXISTS "AIDocument" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" TEXT,
    "metadata" JSONB,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" TIMESTAMP(3),
    "useCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AIDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AIConfig_guildId_key" ON "AIConfig"("guildId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIConfig_botId_idx" ON "AIConfig"("botId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIUsage_configId_idx" ON "AIUsage"("configId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIUsage_guildId_idx" ON "AIUsage"("guildId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIUsage_userId_idx" ON "AIUsage"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIUsage_timestamp_idx" ON "AIUsage"("timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIConversation_configId_idx" ON "AIConversation"("configId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIConversation_guildId_idx" ON "AIConversation"("guildId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIConversation_userId_idx" ON "AIConversation"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIConversation_channelId_idx" ON "AIConversation"("channelId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIConversation_expiresAt_idx" ON "AIConversation"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIConversationMessage_conversationId_idx" ON "AIConversationMessage"("conversationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIConversationMessage_timestamp_idx" ON "AIConversationMessage"("timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIDocument_configId_idx" ON "AIDocument"("configId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIDocument_guildId_idx" ON "AIDocument"("guildId");

-- AddForeignKey
ALTER TABLE "AIConfig" ADD CONSTRAINT "AIConfig_botId_fkey" FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AIConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AIConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversationMessage" ADD CONSTRAINT "AIConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIDocument" ADD CONSTRAINT "AIDocument_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AIConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add AI category to ModuleCategory enum
ALTER TYPE "ModuleCategory" ADD VALUE IF NOT EXISTS 'AI';

-- Insert AI module into modules table
INSERT INTO "modules" (
  "id",
  "slug",
  "name",
  "description",
  "long_description",
  "category",
  "price",
  "icon",
  "version",
  "author",
  "tags",
  "features",
  "is_core",
  "is_active",
  "created_at",
  "updated_at"
) VALUES (
  gen_random_uuid(),
  'ai-assistant',
  'AI Assistant',
  'Advanced AI-powered chatbot with GPT-4, Claude, and custom models. Conversation memory, RAG knowledge base, and intelligent responses.',
  'Transform your Discord server with cutting-edge AI technology. The AI Assistant module provides intelligent conversation capabilities using state-of-the-art language models including GPT-4, Claude 3.5, and more. Features include conversation memory, RAG (Retrieval-Augmented Generation) for custom knowledge bases, content moderation, rate limiting, and extensive customization options. Perfect for support servers, community engagement, and automated assistance.',
  'AI',
  0,
  '🤖',
  '1.0.0',
  'FiveBot',
  '["AI", "Chatbot", "GPT", "Claude", "OpenAI", "Assistant", "Conversation", "Machine Learning"]',
  '["Multiple AI Models (GPT-4, Claude, etc.)", "Conversation Memory & Context", "RAG Knowledge Base", "Content Moderation", "Rate Limiting & Cooldowns", "Channel & Role Permissions", "Custom System Prompts", "Typing Indicators", "Thread Support", "DM Support", "Usage Analytics", "Token Tracking"]',
  false,
  true,
  NOW(),
  NOW()
) ON CONFLICT (slug) DO NOTHING;
