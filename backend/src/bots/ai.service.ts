import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BotsService } from './bots.service';
import OpenAI from 'openai';

@Injectable()
export class AIService {
  constructor(
    private prisma: PrismaService,
    private botsService: BotsService
  ) {}

  private parseConfigJsonFields(config: any) {
    if (!config) return null;

    // Parse JSON string fields to arrays/objects
    const jsonFields = [
      'channelPrompts',
      'threadPrompts',
      'enabledChannels',
      'disabledChannels',
      'triggerKeywords',
      'ignorePrefixes',
      'allowedFunctions',
    ];

    const parsed = { ...config };
    for (const field of jsonFields) {
      if (parsed[field] && typeof parsed[field] === 'string') {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch (error) {
          console.error(`Failed to parse ${field}:`, error);
          parsed[field] = null;
        }
      }
    }

    return parsed;
  }

  async getConfig(botId: string, userId: string, guildId?: string) {
    await this.botsService.validateBotOwnership(botId, userId);

    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // If guildId is provided, get config for that specific guild
    if (guildId) {
      const config = await this.prisma.aIConfig.findUnique({
        where: { guildId },
      });
      return this.parseConfigJsonFields(config);
    }

    // Otherwise, return the first config for this bot
    const config = await this.prisma.aIConfig.findFirst({
      where: { botId },
    });

    return this.parseConfigJsonFields(config);
  }

  async createConfig(botId: string, userId: string, data: any) {
    await this.botsService.validateBotOwnership(botId, userId);

    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
      include: {
        config: true,
      },
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // Encrypt API key if provided
    let encryptedApiKey = data.apiKey;
    if (data.apiKey) {
      // TODO: Implement proper encryption
      encryptedApiKey = data.apiKey;
    }

    const config = await this.prisma.aIConfig.upsert({
      where: { guildId: data.guildId },
      create: {
        guildId: data.guildId,
        botId: bot.id,
        enabled: data.enabled ?? false,
        apiKey: encryptedApiKey,
        model: data.model ?? 'gpt-5-nano',
        responseMode: data.responseMode ?? 'mention',
        personality: data.personality ?? 'friendly',
        customPersonality: data.customPersonality,
        systemPrompt: data.systemPrompt,
        dmSystemPrompt: data.dmSystemPrompt,
        channelPrompts: data.channelPrompts ? JSON.stringify(data.channelPrompts) : null,
        threadPrompts: data.threadPrompts ? JSON.stringify(data.threadPrompts) : null,
        enableVision: data.enableVision ?? false,
        includeUserContext: data.includeUserContext ?? true,
        includeChannelContext: data.includeChannelContext ?? true,
        temperature: data.temperature ?? 0.7,
        maxTokens: data.maxTokens ?? 500,
        enabledChannels: data.enabledChannels ? JSON.stringify(data.enabledChannels) : null,
        disabledChannels: data.disabledChannels ? JSON.stringify(data.disabledChannels) : null,
        enableInTickets: data.enableInTickets ?? true,
        enableInThreads: data.enableInThreads ?? false,
        triggerKeywords: data.triggerKeywords ? JSON.stringify(data.triggerKeywords) : null,
        ignorePrefixes: data.ignorePrefixes ? JSON.stringify(data.ignorePrefixes) : JSON.stringify(['!', '/', '.']),
        requireMention: data.requireMention ?? false,
        typingIndicator: data.typingIndicator ?? true,
        responseDelay: data.responseDelay ?? 0,
        maxResponseLength: data.maxResponseLength ?? 2000,
        useEmbeds: data.useEmbeds ?? true,
        embedColor: data.embedColor,
        showThinking: data.showThinking ?? false,
        conversationHistory: data.conversationHistory ?? true,
        contextWindow: data.contextWindow ?? 10,
        useRAG: data.useRAG ?? false,
        rateLimitPerUser: data.rateLimitPerUser ?? 999,
        rateLimitPerChannel: data.rateLimitPerChannel ?? 9999,
        blockNSFW: data.blockNSFW ?? true,
        contentFilter: data.contentFilter ?? true,
        monthlyTokenLimit: data.monthlyTokenLimit,
        alertOnLimit: data.alertOnLimit ?? true,
        alertChannelId: data.alertChannelId,
        functionCalling: data.functionCalling ?? false,
        allowedFunctions: data.allowedFunctions ? JSON.stringify(data.allowedFunctions) : null,
        logConversations: data.logConversations ?? true,
      },
      update: {
        enabled: data.enabled ?? false,
        apiKey: encryptedApiKey,
        model: data.model ?? 'gpt-5-nano',
        responseMode: data.responseMode ?? 'mention',
        personality: data.personality ?? 'friendly',
        customPersonality: data.customPersonality,
        systemPrompt: data.systemPrompt,
        dmSystemPrompt: data.dmSystemPrompt,
        channelPrompts: data.channelPrompts ? JSON.stringify(data.channelPrompts) : null,
        threadPrompts: data.threadPrompts ? JSON.stringify(data.threadPrompts) : null,
        enableVision: data.enableVision ?? false,
        includeUserContext: data.includeUserContext ?? true,
        includeChannelContext: data.includeChannelContext ?? true,
        temperature: data.temperature ?? 0.7,
        maxTokens: data.maxTokens ?? 500,
        enabledChannels: data.enabledChannels ? JSON.stringify(data.enabledChannels) : null,
        disabledChannels: data.disabledChannels ? JSON.stringify(data.disabledChannels) : null,
        enableInTickets: data.enableInTickets ?? true,
        enableInThreads: data.enableInThreads ?? false,
        triggerKeywords: data.triggerKeywords ? JSON.stringify(data.triggerKeywords) : null,
        ignorePrefixes: data.ignorePrefixes ? JSON.stringify(data.ignorePrefixes) : JSON.stringify(['!', '/', '.']),
        requireMention: data.requireMention ?? false,
        typingIndicator: data.typingIndicator ?? true,
        responseDelay: data.responseDelay ?? 0,
        maxResponseLength: data.maxResponseLength ?? 2000,
        useEmbeds: data.useEmbeds ?? true,
        embedColor: data.embedColor,
        showThinking: data.showThinking ?? false,
        conversationHistory: data.conversationHistory ?? true,
        contextWindow: data.contextWindow ?? 10,
        useRAG: data.useRAG ?? false,
        rateLimitPerUser: data.rateLimitPerUser ?? 999,
        rateLimitPerChannel: data.rateLimitPerChannel ?? 9999,
        blockNSFW: data.blockNSFW ?? true,
        contentFilter: data.contentFilter ?? true,
        monthlyTokenLimit: data.monthlyTokenLimit,
        alertOnLimit: data.alertOnLimit ?? true,
        alertChannelId: data.alertChannelId,
        functionCalling: data.functionCalling ?? false,
        allowedFunctions: data.allowedFunctions ? JSON.stringify(data.allowedFunctions) : null,
        logConversations: data.logConversations ?? true,
      },
    });

    return this.parseConfigJsonFields(config);
  }

  async updateConfig(botId: string, userId: string, data: any) {
    await this.botsService.validateBotOwnership(botId, userId);

    const config = await this.getConfig(botId, userId);
    if (!config) {
      throw new NotFoundException('AI config not found');
    }

    // Encrypt API key if provided
    if (data.apiKey) {
      // TODO: Implement proper encryption
      data.apiKey = data.apiKey;
    }

    // Convert arrays to JSON strings
    const updateData: any = { ...data };
    if (data.enabledChannels) updateData.enabledChannels = JSON.stringify(data.enabledChannels);
    if (data.disabledChannels) updateData.disabledChannels = JSON.stringify(data.disabledChannels);
    if (data.triggerKeywords) updateData.triggerKeywords = JSON.stringify(data.triggerKeywords);
    if (data.ignorePrefixes) updateData.ignorePrefixes = JSON.stringify(data.ignorePrefixes);
    if (data.allowedFunctions) updateData.allowedFunctions = JSON.stringify(data.allowedFunctions);
    if (data.channelPrompts) updateData.channelPrompts = JSON.stringify(data.channelPrompts);
    if (data.threadPrompts) updateData.threadPrompts = JSON.stringify(data.threadPrompts);

    const updated = await this.prisma.aIConfig.update({
      where: { id: config.id },
      data: updateData,
    });

    return this.parseConfigJsonFields(updated);
  }

  async deleteConfig(botId: string, userId: string) {
    await this.botsService.validateBotOwnership(botId, userId);

    const config = await this.getConfig(botId, userId);
    if (!config) {
      throw new NotFoundException('AI config not found');
    }

    await this.prisma.aIConfig.delete({
      where: { id: config.id },
    });

    return { message: 'AI configuration deleted successfully' };
  }

  async getUsageStats(botId: string, userId: string, days: number = 30) {
    await this.botsService.validateBotOwnership(botId, userId);

    const config = await this.getConfig(botId, userId);
    if (!config) {
      throw new NotFoundException('AI config not found');
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const usage = await this.prisma.aIUsage.findMany({
      where: {
        configId: config.id,
        createdAt: { gte: since },
      },
    });

    const conversations = await this.prisma.aIConversation.count({
      where: {
        configId: config.id,
        createdAt: { gte: since },
      },
    });

    const totalTokens = usage.reduce((sum, u) => sum + u.totalTokens, 0);
    const totalCost = usage.reduce((sum, u) => sum + u.cost, 0);
    const avgResponseTime = usage.length > 0
      ? usage.reduce((sum, u) => sum + u.responseTime, 0) / usage.length
      : 0;
    const errors = usage.filter(u => u.error).length;

    // Daily breakdown
    const dailyStats = new Map<string, any>();
    usage.forEach(u => {
      const date = u.createdAt.toISOString().split('T')[0];
      if (!dailyStats.has(date)) {
        dailyStats.set(date, {
          date,
          requests: 0,
          tokens: 0,
          cost: 0,
          errors: 0,
        });
      }
      const day = dailyStats.get(date)!;
      day.requests++;
      day.tokens += u.totalTokens;
      day.cost += u.cost;
      if (u.error) day.errors++;
    });

    // User stats
    const userStats = new Map<string, any>();
    usage.forEach(u => {
      if (!userStats.has(u.userId)) {
        userStats.set(u.userId, {
          userId: u.userId,
          requests: 0,
          tokens: 0,
          cost: 0,
        });
      }
      const user = userStats.get(u.userId)!;
      user.requests++;
      user.tokens += u.totalTokens;
      user.cost += u.cost;
    });

    // Model stats
    const modelStats = new Map<string, any>();
    usage.forEach(u => {
      if (!modelStats.has(u.model)) {
        modelStats.set(u.model, {
          model: u.model,
          requests: 0,
          tokens: 0,
          cost: 0,
        });
      }
      const model = modelStats.get(u.model)!;
      model.requests++;
      model.tokens += u.totalTokens;
      model.cost += u.cost;
    });

    return {
      summary: {
        totalRequests: usage.length,
        totalConversations: conversations,
        totalTokens,
        totalCost,
        avgResponseTime: Math.round(avgResponseTime),
        errors,
        errorRate: usage.length > 0 ? (errors / usage.length) * 100 : 0,
      },
      daily: Array.from(dailyStats.values()).sort((a, b) => a.date.localeCompare(b.date)),
      users: Array.from(userStats.values()).sort((a, b) => b.requests - a.requests),
      models: Array.from(modelStats.values()),
    };
  }

  async getUsage(botId: string, userId: string, limit: number = 50, offset: number = 0) {
    await this.botsService.validateBotOwnership(botId, userId);

    const config = await this.getConfig(botId, userId);
    if (!config) {
      throw new NotFoundException('AI config not found');
    }

    const [usage, total] = await Promise.all([
      this.prisma.aIUsage.findMany({
        where: { configId: config.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.aIUsage.count({
        where: { configId: config.id },
      }),
    ]);

    return {
      usage,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + usage.length < total,
      },
    };
  }

  async getConversations(
    botId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0,
    channelId?: string
  ) {
    await this.botsService.validateBotOwnership(botId, userId);

    const config = await this.getConfig(botId, userId);
    if (!config) {
      throw new NotFoundException('AI config not found');
    }

    const where: any = { configId: config.id };
    if (channelId) where.channelId = channelId;

    const [conversations, total] = await Promise.all([
      this.prisma.aIConversation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.aIConversation.count({ where }),
    ]);

    return {
      conversations: conversations.map(c => ({
        ...c,
        context: c.context ? JSON.parse(c.context as string) : null,
        documentsUsed: c.documentsUsed ? JSON.parse(c.documentsUsed as string) : null,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + conversations.length < total,
      },
    };
  }

  async getDocuments(botId: string, userId: string) {
    await this.botsService.validateBotOwnership(botId, userId);

    const config = await this.getConfig(botId, userId);
    if (!config) {
      throw new NotFoundException('AI config not found');
    }

    const documents = await this.prisma.aIDocument.findMany({
      where: { configId: config.id },
      orderBy: [{ priority: 'desc' }, { title: 'asc' }],
    });

    return documents.map(doc => ({
      ...doc,
      tags: doc.tags ? JSON.parse(doc.tags as string) : [],
      embedding: doc.embedding ? JSON.parse(doc.embedding as string) : null,
      metadata: doc.metadata ? JSON.parse(doc.metadata as string) : null,
    }));
  }

  async createDocument(botId: string, userId: string, data: any) {
    await this.botsService.validateBotOwnership(botId, userId);

    const config = await this.getConfig(botId, userId);
    if (!config) {
      throw new NotFoundException('AI config not found');
    }

    const document = await this.prisma.aIDocument.create({
      data: {
        configId: config.id,
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        priority: data.priority ?? 0,
        enabled: data.enabled ?? true,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });

    return document;
  }

  async updateDocument(botId: string, userId: string, docId: string, data: any) {
    await this.botsService.validateBotOwnership(botId, userId);

    const config = await this.getConfig(botId, userId);
    if (!config) {
      throw new NotFoundException('AI config not found');
    }

    const document = await this.prisma.aIDocument.findFirst({
      where: {
        id: docId,
        configId: config.id,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const updateData: any = { ...data };
    if (data.tags) updateData.tags = JSON.stringify(data.tags);
    if (data.metadata) updateData.metadata = JSON.stringify(data.metadata);
    if (data.embedding) updateData.embedding = JSON.stringify(data.embedding);

    const updated = await this.prisma.aIDocument.update({
      where: { id: docId },
      data: updateData,
    });

    return updated;
  }

  async deleteDocument(botId: string, userId: string, docId: string) {
    await this.botsService.validateBotOwnership(botId, userId);

    const config = await this.getConfig(botId, userId);
    if (!config) {
      throw new NotFoundException('AI config not found');
    }

    const document = await this.prisma.aIDocument.findFirst({
      where: {
        id: docId,
        configId: config.id,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.prisma.aIDocument.delete({
      where: { id: docId },
    });

    return { message: 'Document deleted successfully' };
  }

  async testConfiguration(botId: string, userId: string, data: any) {
    await this.botsService.validateBotOwnership(botId, userId);

    if (!data.apiKey) {
      throw new Error('API key is required for testing');
    }

    try {
      const openai = new OpenAI({ apiKey: data.apiKey });

      const response = await openai.chat.completions.create({
        model: this.getModelName(data.model || 'GPT_5_NANO'),
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Respond with a brief greeting.',
          },
          {
            role: 'user',
            content: 'Hello',
          },
        ],
        max_tokens: 50,
      });

      return {
        success: true,
        message: 'API key is valid',
        response: response.choices[0]?.message?.content,
        usage: response.usage,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'API key test failed',
        error: error.message,
      };
    }
  }

  private getModelName(model: string): string {
    const modelMap: { [key: string]: string } = {
      GPT_4: 'gpt-4',
      GPT_4_TURBO: 'gpt-4-turbo-preview',
      GPT_5_NANO: 'gpt-3.5-turbo', // Placeholder - use GPT-3.5 for now
      GPT_35_TURBO: 'gpt-3.5-turbo',
    };
    return modelMap[model] || 'gpt-3.5-turbo';
  }
}
