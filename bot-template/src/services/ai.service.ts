import { Client, Message, EmbedBuilder } from 'discord.js';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

interface AIConfig {
  id: string;
  guildId: string;
  enabled: boolean;
  apiKey?: string;
  model: string;
  responseMode: string;
  personality: string;
  customPersonality?: string;
  systemPrompt?: string;
  dmSystemPrompt?: string;
  channelPrompts?: { [channelId: string]: string };
  threadPrompts?: { [threadId: string]: string };
  enableVision: boolean;
  includeUserContext: boolean;
  includeChannelContext: boolean;
  temperature: number;
  maxTokens: number;
  enabledChannels?: string[];
  disabledChannels?: string[];
  enableInTickets: boolean;
  enableInThreads: boolean;
  triggerKeywords?: string[];
  ignorePrefixes?: string[];
  requireMention: boolean;
  typingIndicator: boolean;
  responseDelay: number;
  maxResponseLength: number;
  useEmbeds: boolean;
  embedColor?: string;
  showThinking: boolean;
  conversationHistory: boolean;
  contextWindow: number;
  useRAG: boolean;
  rateLimitPerUser: number;
  rateLimitPerChannel: number;
  blockNSFW: boolean;
  contentFilter: boolean;
  monthlyTokenLimit?: number;
  alertOnLimit: boolean;
  alertChannelId?: string;
  functionCalling: boolean;
  allowedFunctions?: string[];
  logConversations: boolean;
}

interface ConversationContext {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

export class AIService {
  private client: Client;
  private prisma: PrismaClient;
  private openai: OpenAI | null = null;
  private rateLimitCache: Map<string, number[]> = new Map();
  private tokenUsageCache: Map<string, { tokens: number; resetAt: number }> = new Map();
  private conversationCache: Map<string, ConversationContext[]> = new Map();
  private processedMessages: Map<string, number> = new Map(); // messageId -> timestamp

  // Model pricing per 1M tokens (input/output)
  private readonly MODEL_PRICING = {
    'gpt-4': { input: 30, output: 60 },
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4-turbo': { input: 10, output: 30 },
    'gpt-5-nano': { input: 0.15, output: 0.3 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  };

  private readonly PERSONALITY_PROMPTS = {
    PROFESSIONAL: 'You are a professional and formal assistant. Be concise, accurate, and maintain a business-like tone.',
    FRIENDLY: 'You are a friendly and helpful assistant. Be warm, approachable, and use casual language while remaining helpful.',
    TECHNICAL: 'You are a technical expert. Provide precise, detailed technical information with examples and best practices.',
  };

  constructor(client: Client, prisma?: PrismaClient) {
    this.client = client;
    this.prisma = prisma || new PrismaClient();
  }

  async initialize(guildId: string): Promise<void> {
    const config = await this.getConfig(guildId);
    if (config?.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.decryptApiKey(config.apiKey),
      });
    }
  }

  async getConfig(guildId: string): Promise<AIConfig | null> {
    const config = await this.prisma.aIConfig.findUnique({
      where: { guildId },
    });

    if (!config) return null;

    return {
      ...config,
      enabledChannels: config.enabledChannels ? JSON.parse(config.enabledChannels as string) : [],
      disabledChannels: config.disabledChannels ? JSON.parse(config.disabledChannels as string) : [],
      triggerKeywords: config.triggerKeywords ? JSON.parse(config.triggerKeywords as string) : [],
      ignorePrefixes: config.ignorePrefixes ? JSON.parse(config.ignorePrefixes as string) : ['!', '/', '.'],
      allowedFunctions: config.allowedFunctions ? JSON.parse(config.allowedFunctions as string) : [],
      channelPrompts: config.channelPrompts ? JSON.parse(config.channelPrompts as string) : {},
      threadPrompts: config.threadPrompts ? JSON.parse(config.threadPrompts as string) : {},
      enableVision: config.enableVision ?? false,
      includeUserContext: config.includeUserContext ?? true,
      includeChannelContext: config.includeChannelContext ?? true,
    } as AIConfig;
  }

  async processMessage(message: Message): Promise<void> {
    if (message.author.bot) return;

    // Deduplication - prevent processing the same message multiple times
    const now = Date.now();
    if (this.processedMessages.has(message.id)) {
      const lastProcessed = this.processedMessages.get(message.id)!;
      if (now - lastProcessed < 5000) { // 5 second window
        console.log(`[AI] Skipping duplicate message ${message.id}`);
        return;
      }
    }
    this.processedMessages.set(message.id, now);

    // Clean up old entries (keep last 1000 messages)
    if (this.processedMessages.size > 1000) {
      const entries = Array.from(this.processedMessages.entries());
      entries.sort((a, b) => b[1] - a[1]); // Sort by timestamp desc
      this.processedMessages = new Map(entries.slice(0, 1000));
    }

    // Handle DMs - find a guild with AI config enabled where both user and bot are members
    let config: AIConfig | null = null;
    let effectiveGuildId: string | null = message.guildId;

    if (!message.guildId) {
      // It's a DM - find mutual guilds with AI config
      const mutualGuilds = this.client.guilds.cache.filter(guild =>
        guild.members.cache.has(message.author.id)
      );

      for (const [guildId, guild] of mutualGuilds) {
        const guildConfig = await this.getConfig(guildId);
        if (guildConfig && guildConfig.enabled) {
          config = guildConfig;
          effectiveGuildId = guildId;
          console.log(`[AI] Using config from guild ${guild.name} for DM with ${message.author.tag}`);
          break;
        }
      }

      if (!config) {
        console.log(`[AI] No AI config found for DM with ${message.author.tag}`);
        return;
      }
    } else {
      config = await this.getConfig(message.guildId);
      if (!config || !config.enabled) return;
    }

    // Check if should respond BEFORE validating API key
    if (!await this.shouldRespond(message, config)) return;

    // Now validate API key after we know we should respond
    if (!config.apiKey) {
      await message.reply('⚠️ AI Assistant is not configured. Please add an API key in the dashboard.');
      return;
    }

    // Check token-based rate limits
    if (!this.checkTokenRateLimit(message, config)) {
      // Silent rate limiting - user has exceeded token quota
      return;
    }

    // Show typing indicator
    if (config.typingIndicator && 'sendTyping' in message.channel) {
      await message.channel.sendTyping();
    }

    // Show thinking message
    let thinkingMessage;
    if (config.showThinking) {
      thinkingMessage = await message.reply('🤔 Thinking...');
    }

    const startTime = Date.now();

    try {

      // Get conversation context
      const context = await this.getConversationContext(message, config);

      // Get RAG documents if enabled
      let ragContext = '';
      let documentsUsed: any[] = [];
      if (config.useRAG) {
        const ragResult = await this.getRAGContext(message.content, config.id);
        ragContext = ragResult.context;
        documentsUsed = ragResult.documents;
      }

      // Build contextual system prompt
      const systemPrompt = await this.buildContextualSystemPrompt(message, config, ragContext);

      // Call OpenAI
      if (!this.openai) {
        this.openai = new OpenAI({
          apiKey: this.decryptApiKey(config.apiKey!),
        });
      }

      // GPT-5-nano has specific requirements
      const modelName = this.getModelName(config.model);
      const isGPT5Nano = modelName === 'gpt-5-nano';

      // Build user message with images if vision is enabled
      const userMessageContent = await this.buildMessageContent(message, config);

      const completionParams: any = {
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          ...context,
          { role: 'user', content: userMessageContent },
        ],
      };

      // GPT-5-nano doesn't support custom temperature (only default value 1)
      if (!isGPT5Nano) {
        completionParams.temperature = config.temperature;
      }

      // Use correct token parameter based on model
      if (isGPT5Nano) {
        completionParams.max_completion_tokens = config.maxTokens;
      } else {
        completionParams.max_tokens = config.maxTokens;
      }

      const response = await this.openai.chat.completions.create(completionParams);

      const aiResponse = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
      const responseTime = Date.now() - startTime;

      // Calculate cost
      const cost = this.calculateCost(
        config.model,
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0
      );

      // Log usage
      await this.logUsage({
        configId: config.id,
        guildId: effectiveGuildId!,
        userId: message.author.id,
        model: config.model,
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        cost,
        responseTime,
      });

      // Update token usage for rate limiting
      this.updateTokenUsage(message.author.id, response.usage?.total_tokens || 0);

      // Log conversation
      if (config.logConversations) {
        await this.logConversation({
          configId: config.id,
          guildId: effectiveGuildId!,
          channelId: message.channelId,
          userId: message.author.id,
          context: JSON.stringify(context.slice(-config.contextWindow)),
          documentsUsed: JSON.stringify(documentsUsed),
        });
      }

      // Update conversation cache
      if (config.conversationHistory) {
        this.updateConversationCache(message.channelId, [
          { role: 'user', content: message.content },
          { role: 'assistant', content: aiResponse },
        ]);
      }

      // Delete thinking message
      if (thinkingMessage) {
        await thinkingMessage.delete();
      }

      // Add response delay if configured
      if (config.responseDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, config.responseDelay));
      }

      // Send response
      await this.sendResponse(message, aiResponse, config, {
        tokens: response.usage?.total_tokens || 0,
        cost,
        responseTime,
        documentsUsed: documentsUsed.length,
      });

      // Check token limits
      await this.checkTokenLimits(config);

    } catch (error: any) {
      console.error('[AI] Error processing message:', error);

      // Log error
      await this.logUsage({
        configId: config.id,
        guildId: effectiveGuildId!,
        userId: message.author.id,
        model: config.model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cost: 0,
        responseTime: Date.now() - startTime,
        error: error.message,
      });

      if (thinkingMessage) {
        await thinkingMessage.delete();
      }

      await message.reply('❌ Sorry, I encountered an error processing your request.');
    }
  }

  private async shouldRespond(message: Message, config: AIConfig): Promise<boolean> {
    const content = message.content.toLowerCase();

    // Check if message starts with ignored prefix
    if (config.ignorePrefixes?.some(prefix => message.content.startsWith(prefix))) {
      return false;
    }

    // DMs - Always respond in DMs (bypass channel filters)
    const isDM = !message.guildId;
    if (isDM) {
      return true; // Always respond in DMs
    }

    // Check channel filters (only for guild messages)
    if (config.enabledChannels && config.enabledChannels.length > 0) {
      if (!config.enabledChannels.includes(message.channelId)) return false;
    }

    if (config.disabledChannels?.includes(message.channelId)) {
      return false;
    }

    // Check thread/ticket context
    if (message.channel.isThread()) {
      if (!config.enableInThreads) return false;

      // Check if it's a ticket thread
      const isTicket = await this.isTicketThread(message.channel.id);
      if (isTicket && !config.enableInTickets) return false;
    }

    // Response mode logic
    switch (config.responseMode) {
      case 'always':
      case 'ALWAYS':
        return true;

      case 'mention':
      case 'MENTION':
        return message.mentions.has(this.client.user!.id) ||
               content.includes(this.client.user!.username.toLowerCase());

      case 'keyword':
      case 'KEYWORD':
        if (!config.triggerKeywords || config.triggerKeywords.length === 0) return false;
        return config.triggerKeywords.some(keyword =>
          content.includes(keyword.toLowerCase())
        );

      case 'smart':
      case 'SMART':
        // Detect questions or commands
        const questionWords = ['what', 'why', 'how', 'when', 'where', 'who', 'can you', 'could you', 'would you', 'help'];
        const hasQuestion = questionWords.some(word => content.includes(word));
        const hasMention = message.mentions.has(this.client.user!.id);
        return hasQuestion || hasMention;

      case 'TICKET_ONLY':
        return await this.isTicketThread(message.channel.id);

      default:
        return false;
    }
  }

  private checkTokenRateLimit(message: Message, config: AIConfig): boolean {
    // Si pas de limite mensuelle définie, pas de rate limit
    if (!config.monthlyTokenLimit || config.monthlyTokenLimit <= 0) {
      return true;
    }

    const now = Date.now();
    const userKey = `tokens:${message.author.id}`;
    const cached = this.tokenUsageCache.get(userKey);

    // Reset tous les mois (30 jours)
    const monthInMs = 30 * 24 * 60 * 60 * 1000;

    if (!cached || now > cached.resetAt) {
      // Nouveau mois, reset le compteur
      this.tokenUsageCache.set(userKey, {
        tokens: 0,
        resetAt: now + monthInMs,
      });
      return true;
    }

    // Vérifier si l'utilisateur a dépassé sa limite mensuelle
    if (cached.tokens >= config.monthlyTokenLimit) {
      return false;
    }

    return true;
  }

  private updateTokenUsage(userId: string, tokensUsed: number): void {
    const userKey = `tokens:${userId}`;
    const cached = this.tokenUsageCache.get(userKey);

    if (cached) {
      cached.tokens += tokensUsed;
      this.tokenUsageCache.set(userKey, cached);
    }
  }

  private checkRateLimit(message: Message, config: AIConfig): boolean {
    // Rate limit désactivé si les valeurs sont très élevées (>500)
    if (config.rateLimitPerUser > 500) {
      return true;
    }

    const now = Date.now();
    const hourAgo = now - 3600000;

    // Check user rate limit
    const userKey = `user:${message.author.id}`;
    const userRequests = this.rateLimitCache.get(userKey) || [];
    const recentUserRequests = userRequests.filter(time => time > hourAgo);

    if (recentUserRequests.length >= config.rateLimitPerUser) {
      return false;
    }

    // Check channel rate limit
    const channelKey = `channel:${message.channelId}`;
    const channelRequests = this.rateLimitCache.get(channelKey) || [];
    const recentChannelRequests = channelRequests.filter(time => time > hourAgo);

    if (recentChannelRequests.length >= config.rateLimitPerChannel) {
      return false;
    }

    // Update cache
    this.rateLimitCache.set(userKey, [...recentUserRequests, now]);
    this.rateLimitCache.set(channelKey, [...recentChannelRequests, now]);

    return true;
  }

  private async getConversationContext(message: Message, config: AIConfig): Promise<ConversationContext[]> {
    if (!config.conversationHistory) return [];

    const cached = this.conversationCache.get(message.channelId) || [];
    if (cached.length > 0) {
      return cached.slice(-config.contextWindow * 2);
    }

    // Fetch recent messages from channel
    try {
      const messages = await message.channel.messages.fetch({ limit: config.contextWindow });
      const context: ConversationContext[] = [];

      messages.reverse().forEach(msg => {
        if (msg.author.bot && msg.author.id === this.client.user!.id) {
          context.push({ role: 'assistant', content: msg.content });
        } else if (!msg.author.bot) {
          context.push({ role: 'user', content: msg.content });
        }
      });

      return context.slice(-config.contextWindow * 2);
    } catch (error) {
      console.error('[AI] Error fetching conversation context:', error);
      return [];
    }
  }

  private async getRAGContext(query: string, configId: string): Promise<{ context: string; documents: any[] }> {
    try {
      const documents = await this.prisma.aIDocument.findMany({
        where: {
          configId,
          enabled: true,
        },
        orderBy: {
          priority: 'desc',
        },
        take: 5, // Top 5 most relevant documents
      });

      if (documents.length === 0) {
        return { context: '', documents: [] };
      }

      // Simple keyword matching (in production, use embeddings + vector search)
      const queryLower = query.toLowerCase();
      const scoredDocs = documents.map(doc => {
        const contentLower = doc.content.toLowerCase();
        const titleLower = doc.title.toLowerCase();

        let score = 0;
        if (titleLower.includes(queryLower)) score += 10;
        if (contentLower.includes(queryLower)) score += 5;

        queryLower.split(' ').forEach(word => {
          if (word.length > 3) {
            if (contentLower.includes(word)) score += 1;
            if (titleLower.includes(word)) score += 2;
          }
        });

        return { doc, score };
      });

      scoredDocs.sort((a, b) => b.score - a.score);
      const relevantDocs = scoredDocs.filter(d => d.score > 0).slice(0, 3);

      if (relevantDocs.length === 0) {
        return { context: '', documents: [] };
      }

      const context = relevantDocs
        .map(({ doc }) => `**${doc.title}**\n${doc.content}`)
        .join('\n\n---\n\n');

      return {
        context: `Here is relevant documentation:\n\n${context}`,
        documents: relevantDocs.map(({ doc }) => ({
          id: doc.id,
          title: doc.title,
          category: doc.category,
        })),
      };
    } catch (error) {
      console.error('[AI] Error getting RAG context:', error);
      return { context: '', documents: [] };
    }
  }

  private async buildContextualSystemPrompt(message: Message, config: AIConfig, ragContext: string): Promise<string> {
    let prompt = '';

    // Add personality
    if (config.personality === 'CUSTOM' && config.customPersonality) {
      prompt = config.customPersonality;
    } else if (config.personality in this.PERSONALITY_PROMPTS) {
      prompt = this.PERSONALITY_PROMPTS[config.personality as keyof typeof this.PERSONALITY_PROMPTS];
    }

    // Choose contextual system prompt
    let contextualPrompt = '';

    // Check if it's a DM
    if (!message.guildId) {
      contextualPrompt = config.dmSystemPrompt || '';
    }
    // Check if it's a thread with custom prompt
    else if (message.channel.isThread() && config.threadPrompts?.[message.channelId]) {
      contextualPrompt = config.threadPrompts[message.channelId];
    }
    // Check if it's a channel with custom prompt
    else if (config.channelPrompts?.[message.channelId]) {
      contextualPrompt = config.channelPrompts[message.channelId];
    }
    // Fallback to general system prompt
    else if (config.systemPrompt) {
      contextualPrompt = config.systemPrompt;
    }

    if (contextualPrompt) {
      prompt += '\n\n' + contextualPrompt;
    }

    // Add user context if enabled
    if (config.includeUserContext && message.guild) {
      const member = message.member;
      if (member) {
        prompt += '\n\n## User Context\n';
        prompt += `- Username: ${message.author.username}\n`;
        prompt += `- Display Name: ${member.displayName}\n`;
        prompt += `- User ID: ${message.author.id}\n`;

        const roles = member.roles.cache
          .filter(role => role.name !== '@everyone')
          .map(role => role.name)
          .join(', ');
        if (roles) {
          prompt += `- Roles: ${roles}\n`;
        }
      }
    }

    // Add channel context if enabled
    if (config.includeChannelContext && message.guild) {
      prompt += '\n\n## Channel Context\n';
      prompt += `- Server: ${message.guild.name}\n`;
      prompt += `- Channel: ${message.channel.isThread() ? 'Thread' : 'Channel'} - #${(message.channel as any).name || 'DM'}\n`;
      prompt += `- Channel ID: ${message.channelId}\n`;

      if (message.channel.isThread()) {
        prompt += `- Parent Channel: <#${message.channel.parentId}>\n`;
        const thread = message.channel;
        if (thread.ownerId) {
          prompt += `- Thread Creator: <@${thread.ownerId}>\n`;
        }
      }
    }

    // Add RAG context
    if (ragContext) {
      prompt += '\n\n' + ragContext;
    }

    // Add general guidelines
    prompt += '\n\n## General Guidelines\n';
    prompt += `- Keep responses under ${config.maxResponseLength} characters\n`;
    prompt += '- Be helpful and accurate\n';
    prompt += '- If you don\'t know something, admit it\n';
    prompt += `- Address the user as "${message.member?.displayName || message.author.username}"\n`;

    if (config.blockNSFW) {
      prompt += '- Do not generate NSFW or inappropriate content\n';
    }

    return prompt;
  }

  private buildSystemPrompt(config: AIConfig, ragContext: string): string {
    let prompt = '';

    // Add personality
    if (config.personality === 'CUSTOM' && config.customPersonality) {
      prompt = config.customPersonality;
    } else if (config.personality in this.PERSONALITY_PROMPTS) {
      prompt = this.PERSONALITY_PROMPTS[config.personality as keyof typeof this.PERSONALITY_PROMPTS];
    }

    // Add custom system prompt
    if (config.systemPrompt) {
      prompt += '\n\n' + config.systemPrompt;
    }

    // Add RAG context
    if (ragContext) {
      prompt += '\n\n' + ragContext;
    }

    // Add general guidelines
    prompt += '\n\nGeneral guidelines:\n';
    prompt += '- Keep responses under ' + config.maxResponseLength + ' characters\n';
    prompt += '- Be helpful and accurate\n';
    prompt += '- If you don\'t know something, admit it\n';

    if (config.blockNSFW) {
      prompt += '- Do not generate NSFW or inappropriate content\n';
    }

    return prompt;
  }

  private async buildMessageContent(
    message: Message,
    config: AIConfig
  ): Promise<string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>> {
    // If vision is not enabled or no attachments, return text only
    if (!config.enableVision || message.attachments.size === 0) {
      return message.content;
    }

    // Check if message has images
    const images = message.attachments.filter(attachment =>
      attachment.contentType?.startsWith('image/')
    );

    // If no images, return text only
    if (images.size === 0) {
      return message.content;
    }

    // Build content array with text and images
    const content: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [];

    // Add text first if exists
    if (message.content) {
      content.push({
        type: 'text',
        text: message.content,
      });
    }

    // Add images
    images.forEach(image => {
      content.push({
        type: 'image_url',
        image_url: {
          url: image.url,
        },
      });
    });

    return content;
  }

  private updateConversationCache(channelId: string, messages: ConversationContext[]): void {
    const existing = this.conversationCache.get(channelId) || [];
    this.conversationCache.set(channelId, [...existing, ...messages].slice(-20));
  }

  private async sendResponse(
    message: Message,
    response: string,
    config: AIConfig,
    metadata: { tokens: number; cost: number; responseTime: number; documentsUsed: number }
  ): Promise<void> {
    // Truncate if too long
    let truncatedResponse = response;
    if (response.length > config.maxResponseLength) {
      truncatedResponse = response.substring(0, config.maxResponseLength - 3) + '...';
    }

    if (config.useEmbeds) {
      const embed = new EmbedBuilder()
        .setDescription(truncatedResponse)
        .setColor((config.embedColor as any) || '#5865F2')
        .setFooter({
          text: `${metadata.tokens} tokens • ${metadata.responseTime}ms • $${metadata.cost.toFixed(6)}`,
        })
        .setTimestamp();

      if (metadata.documentsUsed > 0) {
        embed.addFields({
          name: '📚 Knowledge Base',
          value: `Used ${metadata.documentsUsed} document(s)`,
          inline: true,
        });
      }

      await message.reply({ embeds: [embed] });
    } else {
      await message.reply(truncatedResponse);
    }
  }

  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const modelKey = this.getModelKey(model);
    const pricing = this.MODEL_PRICING[modelKey as keyof typeof this.MODEL_PRICING];

    if (!pricing) return 0;

    const promptCost = (promptTokens / 1000000) * pricing.input;
    const completionCost = (completionTokens / 1000000) * pricing.output;

    return promptCost + completionCost;
  }

  private getModelName(model: string): string {
    // Support both old format (GPT_4) and new format (gpt-4o)
    const modelMap: { [key: string]: string } = {
      // Old uppercase format
      GPT_4: 'gpt-4',
      GPT_4_TURBO: 'gpt-4-turbo-preview',
      GPT_5_NANO: 'gpt-5-nano',
      GPT_35_TURBO: 'gpt-3.5-turbo',
      // New lowercase format (from frontend)
      'gpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4-turbo': 'gpt-4-turbo-preview',
      'gpt-3.5-turbo': 'gpt-3.5-turbo',
      'gpt-5-nano': 'gpt-5-nano',
    };
    return modelMap[model] || model; // Return as-is if not found
  }

  private getModelKey(model: string): string {
    if (model.includes('gpt-4o-mini')) return 'gpt-4o-mini';
    if (model.includes('gpt-4o')) return 'gpt-4o';
    if (model.includes('gpt-4-turbo')) return 'gpt-4-turbo';
    if (model.includes('gpt-4')) return 'gpt-4';
    if (model.includes('gpt-5-nano')) return 'gpt-5-nano';
    return 'gpt-3.5-turbo';
  }

  private async logUsage(data: any): Promise<void> {
    try {
      await this.prisma.aIUsage.create({
        data: {
          ...data,
          error: data.error || null,
        },
      });
    } catch (error) {
      console.error('[AI] Error logging usage:', error);
    }
  }

  private async logConversation(data: any): Promise<void> {
    try {
      await this.prisma.aIConversation.create({
        data,
      });
    } catch (error) {
      console.error('[AI] Error logging conversation:', error);
    }
  }

  private async checkTokenLimits(config: AIConfig): Promise<void> {
    if (!config.monthlyTokenLimit || !config.alertOnLimit) return;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = await this.prisma.aIUsage.aggregate({
      where: {
        configId: config.id,
        createdAt: { gte: startOfMonth },
      },
      _sum: {
        totalTokens: true,
      },
    });

    const totalTokens = usage._sum.totalTokens || 0;

    if (totalTokens >= config.monthlyTokenLimit && config.alertChannelId) {
      const channel = await this.client.channels.fetch(config.alertChannelId);
      if (channel?.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle('⚠️ AI Token Limit Reached')
          .setDescription(`Monthly token limit of ${config.monthlyTokenLimit.toLocaleString()} has been reached.`)
          .setColor('#FF0000')
          .addFields(
            { name: 'Tokens Used', value: totalTokens.toLocaleString(), inline: true },
            { name: 'Limit', value: config.monthlyTokenLimit.toLocaleString(), inline: true }
          )
          .setTimestamp();

        if ('send' in channel) {
          await channel.send({ embeds: [embed] });
        }
      }
    }
  }

  private async isTicketThread(channelId: string): Promise<boolean> {
    try {
      const ticket = await this.prisma.ticket.findFirst({
        where: {
          OR: [
            { channelId },
            { threadId: channelId },
          ],
        },
      });
      return !!ticket;
    } catch (error) {
      return false;
    }
  }

  private decryptApiKey(encryptedKey: string): string {
    // TODO: Implement actual encryption/decryption
    // For now, return as-is (should be encrypted in production)
    return encryptedKey;
  }

  private encryptApiKey(plainKey: string): string {
    // TODO: Implement actual encryption
    return plainKey;
  }

  async getUsageStats(configId: string, days: number = 30): Promise<any> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const usage = await this.prisma.aIUsage.findMany({
      where: {
        configId,
        createdAt: { gte: since },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalTokens = usage.reduce((sum, u) => sum + u.totalTokens, 0);
    const totalCost = usage.reduce((sum, u) => sum + u.cost, 0);
    const avgResponseTime = usage.reduce((sum, u) => sum + u.responseTime, 0) / usage.length;
    const errorRate = usage.filter(u => u.error).length / usage.length;

    return {
      totalRequests: usage.length,
      totalTokens,
      totalCost,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: (errorRate * 100).toFixed(2),
      usage,
    };
  }

  async clearConversationHistory(channelId: string): Promise<void> {
    this.conversationCache.delete(channelId);
  }
}
