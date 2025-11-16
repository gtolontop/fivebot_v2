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

interface UserPreferences {
  userId: string;
  preferredLanguage?: string;
  preferredTone?: 'formal' | 'casual' | 'technical';
  topicsOfInterest?: string[];
  lastInteraction?: Date;
  conversationCount?: number;
  responseStyle?: 'concise' | 'detailed';
  learningData?: {
    commonQuestions?: string[];
    preferredExamples?: string[];
    feedbackHistory?: Array<{ positive: boolean; topic: string }>;
  };
}

interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  emotions?: string[];
  urgency?: 'low' | 'medium' | 'high';
  isQuestion?: boolean;
  requiresSupport?: boolean;
}

export class AIService {
  private client: Client;
  private prisma: PrismaClient;
  private openai: OpenAI | null = null;
  private rateLimitCache: Map<string, number[]> = new Map();
  private tokenUsageCache: Map<string, { tokens: number; resetAt: number }> = new Map();
  private conversationCache: Map<string, ConversationContext[]> = new Map();
  private processedMessages: Map<string, number> = new Map(); // messageId -> timestamp

  // Advanced features
  private userPreferencesCache: Map<string, UserPreferences> = new Map();
  private conversationTopics: Map<string, string[]> = new Map(); // channelId -> topics discussed
  private userInteractionStats: Map<string, { count: number; lastSeen: Date }> = new Map();

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

    // Initialize advanced learning features automatically
    this.initializeAdvancedFeatures().catch(err => {
      console.error('[AI] Failed to initialize advanced features:', err);
    });
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

  /**
   * Extract URLs from a message
   */
  private extractUrls(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches || [];
  }

  /**
   * Check if a URL is accessible
   */
  private async checkUrl(url: string): Promise<{ accessible: boolean; status?: number; error?: string }> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'FiveLink-Bot/2.0',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      return {
        accessible: response.ok,
        status: response.status,
      };
    } catch (error: any) {
      return {
        accessible: false,
        error: error?.message || 'Unknown error',
      };
    }
  }

  /**
   * Check all URLs in a message and return verification results
   */
  private async verifyUrls(text: string): Promise<string | null> {
    const urls = this.extractUrls(text);
    if (urls.length === 0) return null;

    const results: string[] = [];

    for (const url of urls) {
      const check = await this.checkUrl(url);

      if (!check.accessible) {
        results.push(`- ${url}: ${check.status ? `HTTP ${check.status}` : 'Not accessible'} ${check.error ? `(${check.error})` : ''}`);
      } else {
        results.push(`- ${url}: Accessible (HTTP ${check.status})`);
      }
    }

    if (results.length > 0) {
      return `\n\nURL Verification Results:\n${results.join('\n')}`;
    }

    return null;
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
      console.log(`[AI DM] Received DM from ${message.author.tag}: "${message.content.substring(0, 50)}..."`);

      const mutualGuilds = this.client.guilds.cache.filter(guild =>
        guild.members.cache.has(message.author.id)
      );

      console.log(`[AI DM] Found ${mutualGuilds.size} mutual guilds with ${message.author.tag}`);

      for (const [guildId, guild] of mutualGuilds) {
        const guildConfig = await this.getConfig(guildId);
        console.log(`[AI DM] Checking guild "${guild.name}": config=${!!guildConfig}, enabled=${guildConfig?.enabled}`);

        if (guildConfig && guildConfig.enabled) {
          config = guildConfig;
          effectiveGuildId = guildId;
          console.log(`[AI DM] ✅ Using config from guild "${guild.name}" for DM with ${message.author.tag}`);
          break;
        }
      }

      if (!config) {
        console.log(`[AI DM] ❌ No AI config found for DM with ${message.author.tag} - replying with help message`);
        await message.reply('⚠️ AI Assistant is not configured. Please enable it in one of our mutual servers first.');
        return;
      }
    } else {
      config = await this.getConfig(message.guildId);
      if (!config || !config.enabled) return;
    }

    // Check for prompt adjustment commands (staff only)
    const promptCommand = await this.handlePromptAdjustmentCommand(message, config);
    if (promptCommand) return; // Command was handled

    // Check if should respond BEFORE validating API key
    if (!await this.shouldRespond(message, config)) return;

    // Now validate API key after we know we should respond
    if (!config.apiKey) {
      await message.reply('⚠️ AI Assistant is not configured. Please add an API key in the dashboard.');
      return;
    }

    // ADVANCED INTELLIGENCE: Analyze sentiment and user preferences
    const sentiment = this.analyzeSentiment(message);
    const userPrefs = await this.getUserPreferences(message.author.id);

    console.log(`[AI] Sentiment: ${sentiment.sentiment}, Urgency: ${sentiment.urgency}, Question: ${sentiment.isQuestion}`);
    console.log(`[AI] User prefs: ${userPrefs.conversationCount} convs, tone: ${userPrefs.preferredTone}, style: ${userPrefs.responseStyle}`);

    // Track conversation topics for better context
    this.trackConversationTopic(message.channelId, message.content);

    // Use SMART rate limiting that adapts to user behavior
    const rateLimitPassed = await this.smartRateLimit(message.author.id, message.channelId, config);
    if (!rateLimitPassed) {
      // Friendly rate limit message based on sentiment
      if (sentiment.urgency === 'high') {
        await message.reply('⏱️ Doucement! Je reçois trop de messages. Laisse-moi une seconde pour respirer.');
      }
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

      // Get ENHANCED conversation context with user preferences
      const context = await this.getEnhancedConversationContext(message, config, userPrefs);

      // Get RAG documents if enabled
      let ragContext = '';
      let documentsUsed: any[] = [];
      if (config.useRAG) {
        const ragResult = await this.getRAGContext(message.content, config.id);
        ragContext = ragResult.context;
        documentsUsed = ragResult.documents;
      }

      // Verify URLs if message contains any
      const urlVerification = await this.verifyUrls(message.content);
      if (urlVerification) {
        ragContext += urlVerification;
      }

      // Build contextual system prompt with SENTIMENT & USER PREFERENCES
      const systemPrompt = await this.buildContextualSystemPrompt(message, config, ragContext, sentiment, userPrefs);
      console.log('[AI] Config personality:', config.personality);
      console.log('[AI] System prompt length:', systemPrompt.length, 'chars');
      console.log('[AI] System prompt preview:', systemPrompt.substring(0, 300) + '...');

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

      // LEARNING: Update user preferences based on this interaction
      await this.updateUserPreferences(message.author.id, message, sentiment);
      console.log('[AI] ✅ Updated user preferences for', message.author.username);

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

  private async buildContextualSystemPrompt(
    message: Message,
    config: AIConfig,
    ragContext: string,
    sentiment?: SentimentAnalysis,
    userPrefs?: UserPreferences
  ): Promise<string> {
    const isDM = !message.guildId;
    const isThread = message.channel.isThread();
    const userName = message.member?.displayName || message.author.username;
    const serverName = message.guild?.name || 'Discord';

    // Build intelligent base prompt
    let prompt = '';

    // 1. WHO ARE YOU - Clear identity with personality (adapted to user preferences)
    const preferredTone = userPrefs?.preferredTone || 'casual';

    if (!isDM) {
      // Check if this is the FiveLink server
      const isFiveLink = serverName.toLowerCase().includes('fivelink') ||
                         message.guild?.name.toLowerCase().includes('fivelink');

      if (isFiveLink) {
        // Special FiveLink context
        if (preferredTone === 'technical') {
          prompt = `You are the official technical support AI for FiveLink, a Discord bot hosting and management platform. Your primary role is to help users create, configure, and manage their Discord bots. Provide precise technical guidance about bot features, API usage, troubleshooting, and best practices.`;
        } else if (preferredTone === 'formal') {
          prompt = `You are the professional support AI for FiveLink, a Discord bot hosting platform. Your role is to assist users with their bots, answer questions professionally, and provide quality technical support. Be courteous and maintain a professional tone.`;
        } else {
          prompt = `You are the friendly support AI for FiveLink, a Discord bot hosting platform! Your job is to help users with their bots, answer questions about features, and make their experience smooth and enjoyable. Be warm, helpful, and supportive.`;
        }
      } else {
        // Non-FiveLink servers
        if (preferredTone === 'technical') {
          prompt = `You are a highly skilled technical assistant for the ${serverName} Discord server. Provide precise, detailed technical information with examples.`;
        } else if (preferredTone === 'formal') {
          prompt = `You are a professional AI assistant for the ${serverName} Discord server. Be respectful, precise, and maintain a formal tone.`;
        } else {
          prompt = `You are a friendly and helpful AI assistant for the ${serverName} Discord server. Be warm, approachable, and conversational.`;
        }
      }
    } else {
      prompt = `You are a personal AI assistant chatting with ${userName}. Be ${preferredTone === 'technical' ? 'precise and technical' : preferredTone === 'formal' ? 'professional and courteous' : 'friendly and casual'}.`;
    }

    // 2. CUSTOM PERSONALITY OR DEFAULTS
    if (config.personality === 'CUSTOM' && config.customPersonality) {
      prompt += `\n\nPersonality: ${config.customPersonality}`;
    } else if (config.personality in this.PERSONALITY_PROMPTS) {
      prompt += `\n\nPersonality: ${this.PERSONALITY_PROMPTS[config.personality as keyof typeof this.PERSONALITY_PROMPTS]}`;
    }

    // 3. CONTEXTUAL SYSTEM PROMPT (per-channel/thread/DM)
    let contextualPrompt = '';
    if (isDM && config.dmSystemPrompt) {
      contextualPrompt = config.dmSystemPrompt;
    } else if (isThread && config.threadPrompts?.[message.channelId]) {
      contextualPrompt = config.threadPrompts[message.channelId];
    } else if (!isDM && config.channelPrompts?.[message.channelId]) {
      contextualPrompt = config.channelPrompts[message.channelId];
    } else if (config.systemPrompt) {
      contextualPrompt = config.systemPrompt;
    }

    if (contextualPrompt) {
      prompt += `\n\nAdditional Instructions:\n${contextualPrompt}`;
    }

    // 4. CONTEXT AWARENESS
    prompt += `\n\n## Current Context`;

    if (!isDM) {
      // Server description (if available)
      if (message.guild?.description) {
        prompt += `\n- Server: ${serverName} - "${message.guild.description}"`;
      } else {
        prompt += `\n- Server: ${serverName}`;
      }

      // Channel info
      const channelName = (message.channel as any).name || 'unknown';
      const channelTopic = (message.channel as any).topic;

      if (isThread) {
        prompt += `\n- Channel: Thread "${channelName}"`;
        const thread = message.channel;
        if (thread.parentId) {
          const parentChannel = message.guild?.channels.cache.get(thread.parentId);
          if (parentChannel) {
            prompt += ` inside #${(parentChannel as any).name}`;
          }
        }
      } else {
        prompt += `\n- Channel: #${channelName}`;
        if (channelTopic) {
          prompt += ` (Topic: ${channelTopic})`;
        }
      }

      // User context with enhanced role detection
      if (config.includeUserContext && message.member) {
        const roles = message.member.roles.cache
          .filter(role => role.name !== '@everyone')
          .map(role => role.name);

        // Check if this is the founder/owner
        const username = message.author.username.toLowerCase();
        const displayName = message.member.displayName.toLowerCase();
        const isFounder = username === 'gtol' ||
                          displayName === 'gtol' ||
                          message.guild?.ownerId === message.author.id ||
                          roles.some(r => r.toLowerCase().includes('founder') || r.toLowerCase().includes('owner'));

        const isAdmin = message.member.permissions.has('Administrator');
        const isModerator = message.member.permissions.has('ManageMessages');
        const isStaff = isAdmin || isModerator || roles.some(r => r.toLowerCase().includes('staff') || r.toLowerCase().includes('mod'));

        prompt += `\n- User: ${userName}`;

        // Prioritize founder recognition
        if (isFounder) {
          prompt += ` **[FOUNDER & OWNER]** - This is Gtol, the creator and owner of FiveLink. Show maximum respect, understanding, and priority. He has complete authority over the platform.`;
        } else if (isAdmin) {
          prompt += ` (Administrator - has full server permissions)`;
        } else if (isModerator) {
          prompt += ` (Moderator - can manage messages and users)`;
        } else if (isStaff) {
          prompt += ` (Staff member - part of the support team)`;
        } else {
          prompt += ` (Community member)`;
        }

        if (roles.length > 0 && !isFounder && !isAdmin) {
          prompt += `\n- Roles: ${roles.slice(0, 5).join(', ')}${roles.length > 5 ? ` and ${roles.length - 5} more` : ''}`;
        }
      }
    } else {
      prompt += `\n- Location: Private DM with ${userName}`;
      prompt += `\n- Context: One-on-one conversation`;
    }

    // Get recent conversation for context
    const recentMessages = await this.getRecentConversationSummary(message);
    if (recentMessages) {
      prompt += `\n- Recent conversation: ${recentMessages}`;
    }

    // 5. RAG CONTEXT (knowledge base)
    if (ragContext) {
      prompt += `\n\n## Knowledge Base\n${ragContext}`;
    }

    // 6. INTELLIGENT BEHAVIOR GUIDELINES (adapted to sentiment & user preferences)
    prompt += `\n\n## Response Guidelines`;

    // Adapt response style based on sentiment and user preferences
    if (sentiment) {
      if (sentiment.urgency === 'high') {
        prompt += `\n- **URGENT MATTER**: The user needs quick, direct help. Be concise and action-oriented.`;
      }
      if (sentiment.isQuestion) {
        prompt += `\n- **This is a question**: Provide a clear, direct answer first, then add details if needed.`;
      }
      if (sentiment.requiresSupport) {
        prompt += `\n- **Support needed**: Be patient, empathetic, and provide step-by-step guidance.`;
      }
      if (sentiment.sentiment === 'negative' || sentiment.emotions?.includes('frustrated')) {
        prompt += `\n- **User seems frustrated**: Be extra patient and understanding. Acknowledge their concern.`;
      }
      if (sentiment.sentiment === 'positive') {
        prompt += `\n- **Positive vibe**: Match their energy! Be enthusiastic and encouraging.`;
      }
    }

    // Adapt detail level to user preferences
    const responseStyle = userPrefs?.responseStyle || 'concise';
    if (responseStyle === 'detailed') {
      prompt += `\n1. **Be Thorough**: This user prefers detailed explanations with examples`;
    } else {
      prompt += `\n1. **Be Concise**: This user prefers short, direct responses`;
    }

    prompt += `\n2. **Understand Intent**: Carefully analyze what ${userName} is really asking or saying`;
    prompt += `\n3. **Be Relevant**: Respond directly to their question or statement, don't go off-topic`;
    prompt += `\n4. **Stay Under Limit**: Keep responses under ${config.maxResponseLength} characters`;
    prompt += `\n5. **Be Natural**: Write like a friendly person, not a robot. No technical jargon unless relevant`;
    prompt += `\n6. **Be Helpful**: If you don't know something, admit it and suggest alternatives`;
    prompt += `\n7. **Context Matters**: Use the conversation history and user's roles to inform your response`;

    // Add user's topics of interest if known
    if (userPrefs?.topicsOfInterest && userPrefs.topicsOfInterest.length > 0) {
      prompt += `\n- **User interests**: ${userPrefs.topicsOfInterest.slice(0, 3).join(', ')} - reference these when relevant`;
    }

    if (config.blockNSFW) {
      prompt += `\n8. **Stay Appropriate**: Keep all content safe for work`;
    }

    // 7. IMPORTANT REMINDERS
    prompt += `\n\n## Important`;
    prompt += `\n- Never mention being an "AI" or "bot" unless directly asked`;
    prompt += `\n- Don't use phrases like "I don't have access to" or "I can't see" - just work with what you know`;
    prompt += `\n- If someone @mentions you, they want to talk - respond naturally, don't ask "what do you want me to do"`;
    prompt += `\n- Remember: You're part of the ${serverName} community, act like it`;

    return prompt;
  }

  // Get summary of recent conversation for better context
  private async getRecentConversationSummary(message: Message): Promise<string | null> {
    try {
      const conversationCache = this.conversationCache.get(message.channelId);
      if (!conversationCache || conversationCache.length === 0) {
        return null;
      }

      // Get last 3 messages
      const recent = conversationCache.slice(-3);
      const summary = recent.map((msg: any) => {
        const role = msg.role === 'user' ? message.author.username : 'You';
        const content = msg.content.substring(0, 100);
        return `${role}: ${content}`;
      }).join(' | ');

      return summary.length > 200 ? summary.substring(0, 200) + '...' : summary;
    } catch (error) {
      return null;
    }
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

  /**
   * Handle staff-only commands to adjust the AI's system prompt in real-time
   * Commands supported (in French):
   * - "@bot ajoute [instruction] à ton prompt" - Add instruction to prompt
   * - "@bot retire [instruction] de ton prompt" - Remove instruction from prompt
   * - "@bot modifie ton comportement pour [instruction]" - Modify behavior
   * - "@bot montre ton prompt" - Show current prompt
   * - "@bot réinitialise ton prompt" - Reset to default prompt
   */
  private async handlePromptAdjustmentCommand(message: Message, config: AIConfig): Promise<boolean> {
    const content = message.content.toLowerCase();

    // Check if message mentions the bot
    if (!message.mentions.has(this.client.user!.id)) {
      return false;
    }

    // Check for prompt-related keywords
    const isPromptCommand =
      content.includes('prompt') ||
      content.includes('comportement') ||
      content.includes('personnalité') ||
      content.includes('ajoute') && (content.includes('système') || content.includes('instruction'));

    if (!isPromptCommand) {
      return false;
    }

    // Verify user is staff (Administrator, ManageMessages, or has staff/mod role)
    const isStaff = await this.isUserStaff(message);
    if (!isStaff) {
      await message.reply('❌ Seuls les membres du staff peuvent modifier le prompt système.');
      return true; // Command was recognized but denied
    }

    const isDM = !message.guildId;
    const effectiveGuildId = isDM ? config.guildId : message.guildId!;

    try {
      // Show current prompt
      if (content.includes('montre') && content.includes('prompt')) {
        const currentPrompt = isDM
          ? config.dmSystemPrompt || config.systemPrompt || 'Aucun prompt personnalisé défini'
          : message.channel.isThread()
            ? config.threadPrompts?.[message.channelId] || config.systemPrompt || 'Aucun prompt personnalisé défini'
            : config.channelPrompts?.[message.channelId] || config.systemPrompt || 'Aucun prompt personnalisé défini';

        const embed = new EmbedBuilder()
          .setTitle('📋 Prompt Système Actuel')
          .setDescription(currentPrompt.length > 4000 ? currentPrompt.substring(0, 4000) + '...' : currentPrompt)
          .setColor('#5865F2')
          .setFooter({ text: isDM ? 'Prompt DM' : message.channel.isThread() ? 'Prompt Thread' : 'Prompt Channel' })
          .setTimestamp();

        await message.reply({ embeds: [embed] });
        return true;
      }

      // Reset prompt
      if ((content.includes('réinitialise') || content.includes('reset')) && content.includes('prompt')) {
        const updateData: any = {};

        if (isDM) {
          updateData.dmSystemPrompt = null;
        } else if (message.channel.isThread()) {
          const threadPrompts = { ...config.threadPrompts };
          delete threadPrompts[message.channelId];
          updateData.threadPrompts = threadPrompts;
        } else {
          const channelPrompts = { ...config.channelPrompts };
          delete channelPrompts[message.channelId];
          updateData.channelPrompts = channelPrompts;
        }

        await this.prisma.aIConfig.update({
          where: { guildId: effectiveGuildId },
          data: updateData,
        });

        await message.reply('✅ Prompt système réinitialisé avec succès.');
        console.log(`[AI] Prompt reset by ${message.author.tag} in ${isDM ? 'DM' : message.channel.isThread() ? 'thread' : 'channel'} ${message.channelId}`);
        return true;
      }

      // Add instruction to prompt
      if (content.includes('ajoute')) {
        const match = content.match(/ajoute\s+["']?(.+?)["']?\s+(?:à|a)\s+(?:ton\s+)?prompt/i);
        if (!match) {
          await message.reply('❌ Format invalide. Utilisez: `@bot ajoute "instruction" à ton prompt`');
          return true;
        }

        const instruction = match[1].trim();
        if (!instruction || instruction.length < 3) {
          await message.reply('❌ L\'instruction est trop courte.');
          return true;
        }

        // Get current prompt and add instruction
        let currentPrompt = '';
        const updateData: any = {};

        if (isDM) {
          currentPrompt = config.dmSystemPrompt || config.systemPrompt || '';
          updateData.dmSystemPrompt = currentPrompt + `\n- ${instruction}`;
        } else if (message.channel.isThread()) {
          currentPrompt = config.threadPrompts?.[message.channelId] || config.systemPrompt || '';
          updateData.threadPrompts = {
            ...config.threadPrompts,
            [message.channelId]: currentPrompt + `\n- ${instruction}`,
          };
        } else {
          currentPrompt = config.channelPrompts?.[message.channelId] || config.systemPrompt || '';
          updateData.channelPrompts = {
            ...config.channelPrompts,
            [message.channelId]: currentPrompt + `\n- ${instruction}`,
          };
        }

        await this.prisma.aIConfig.update({
          where: { guildId: effectiveGuildId },
          data: updateData,
        });

        await message.reply(`✅ Instruction ajoutée au prompt système:\n> ${instruction}`);
        console.log(`[AI] Prompt updated by ${message.author.tag}: Added "${instruction}"`);
        return true;
      }

      // Remove instruction from prompt
      if (content.includes('retire') || content.includes('supprime')) {
        const match = content.match(/(?:retire|supprime)\s+["']?(.+?)["']?\s+(?:de|du)\s+(?:ton\s+)?prompt/i);
        if (!match) {
          await message.reply('❌ Format invalide. Utilisez: `@bot retire "instruction" de ton prompt`');
          return true;
        }

        const instruction = match[1].trim();
        let currentPrompt = '';
        const updateData: any = {};

        if (isDM) {
          currentPrompt = config.dmSystemPrompt || config.systemPrompt || '';
        } else if (message.channel.isThread()) {
          currentPrompt = config.threadPrompts?.[message.channelId] || config.systemPrompt || '';
        } else {
          currentPrompt = config.channelPrompts?.[message.channelId] || config.systemPrompt || '';
        }

        // Try to remove the instruction
        const lines = currentPrompt.split('\n');
        const filteredLines = lines.filter(line => !line.toLowerCase().includes(instruction.toLowerCase()));

        if (lines.length === filteredLines.length) {
          await message.reply('❌ Instruction non trouvée dans le prompt.');
          return true;
        }

        const newPrompt = filteredLines.join('\n');

        if (isDM) {
          updateData.dmSystemPrompt = newPrompt;
        } else if (message.channel.isThread()) {
          updateData.threadPrompts = {
            ...config.threadPrompts,
            [message.channelId]: newPrompt,
          };
        } else {
          updateData.channelPrompts = {
            ...config.channelPrompts,
            [message.channelId]: newPrompt,
          };
        }

        await this.prisma.aIConfig.update({
          where: { guildId: effectiveGuildId },
          data: updateData,
        });

        await message.reply(`✅ Instruction retirée du prompt système.`);
        console.log(`[AI] Prompt updated by ${message.author.tag}: Removed "${instruction}"`);
        return true;
      }

      // Modify behavior
      if (content.includes('modifie') && (content.includes('comportement') || content.includes('personnalité'))) {
        const match = content.match(/(?:modifie|change)\s+(?:ton\s+)?(?:comportement|personnalité)\s+(?:pour|en)\s+["']?(.+?)["']?$/i);
        if (!match) {
          await message.reply('❌ Format invalide. Utilisez: `@bot modifie ton comportement pour "description"`');
          return true;
        }

        const newBehavior = match[1].trim();
        if (!newBehavior || newBehavior.length < 5) {
          await message.reply('❌ La description du comportement est trop courte.');
          return true;
        }

        const updateData: any = {};

        if (isDM) {
          updateData.dmSystemPrompt = newBehavior;
        } else if (message.channel.isThread()) {
          updateData.threadPrompts = {
            ...config.threadPrompts,
            [message.channelId]: newBehavior,
          };
        } else {
          updateData.channelPrompts = {
            ...config.channelPrompts,
            [message.channelId]: newBehavior,
          };
        }

        await this.prisma.aIConfig.update({
          where: { guildId: effectiveGuildId },
          data: updateData,
        });

        await message.reply(`✅ Comportement modifié:\n> ${newBehavior}`);
        console.log(`[AI] Prompt updated by ${message.author.tag}: New behavior "${newBehavior}"`);
        return true;
      }

      // If no specific command matched but it was a prompt-related message
      await message.reply(
        '❓ Commandes disponibles:\n' +
        '• `@bot montre ton prompt` - Afficher le prompt actuel\n' +
        '• `@bot ajoute "instruction" à ton prompt` - Ajouter une instruction\n' +
        '• `@bot retire "instruction" de ton prompt` - Retirer une instruction\n' +
        '• `@bot modifie ton comportement pour "description"` - Changer le comportement\n' +
        '• `@bot réinitialise ton prompt` - Revenir au prompt par défaut'
      );
      return true;

    } catch (error) {
      console.error('[AI] Error handling prompt adjustment command:', error);
      await message.reply('❌ Erreur lors de la modification du prompt. Vérifiez les logs.');
      return true;
    }
  }

  /**
   * Check if user has staff permissions
   */
  private async isUserStaff(message: Message): Promise<boolean> {
    // In DMs, we need to check if they have staff permissions in any mutual guild
    if (!message.guildId) {
      const mutualGuilds = this.client.guilds.cache.filter(guild =>
        guild.members.cache.has(message.author.id)
      );

      for (const [, guild] of mutualGuilds) {
        const member = guild.members.cache.get(message.author.id);
        if (member) {
          const isAdmin = member.permissions.has('Administrator');
          const isModerator = member.permissions.has('ManageMessages');
          const hasStaffRole = member.roles.cache.some(role =>
            role.name.toLowerCase().includes('staff') ||
            role.name.toLowerCase().includes('mod')
          );

          if (isAdmin || isModerator || hasStaffRole) {
            return true;
          }
        }
      }
      return false;
    }

    // In guilds, check the member's permissions directly
    if (!message.member) {
      return false;
    }

    const isAdmin = message.member.permissions.has('Administrator');
    const isModerator = message.member.permissions.has('ManageMessages');
    const hasStaffRole = message.member.roles.cache.some(role =>
      role.name.toLowerCase().includes('staff') ||
      role.name.toLowerCase().includes('mod')
    );

    return isAdmin || isModerator || hasStaffRole;
  }

  /**
   * ADVANCED LEARNING & INTELLIGENCE SYSTEM
   */

  /**
   * Analyze sentiment of user message to adapt response tone
   */
  private analyzeSentiment(message: Message): SentimentAnalysis {
    const content = message.content.toLowerCase();

    // Detect urgency
    const urgentWords = ['urgent', 'important', 'asap', 'maintenant', 'vite', 'rapide', 'problème', 'erreur', 'bug', 'aide'];
    const urgency = urgentWords.some(word => content.includes(word)) ? 'high' :
                    content.includes('?') ? 'medium' : 'low';

    // Detect sentiment
    const positiveWords = ['merci', 'super', 'génial', 'cool', 'parfait', 'excellent', 'bien', 'bravo', 'top'];
    const negativeWords = ['merde', 'nul', 'mauvais', 'pas bien', 'erreur', 'problème', 'bug', 'casse', 'chiant'];

    const positiveCount = positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = negativeWords.filter(word => content.includes(word)).length;

    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';

    // Detect emotions
    const emotions: string[] = [];
    if (content.includes('!')) emotions.push('excited');
    if (content.includes('?') && urgency === 'high') emotions.push('confused');
    if (negativeCount > 0) emotions.push('frustrated');
    if (positiveCount > 0) emotions.push('happy');

    // Detect if it's a question
    const isQuestion = content.includes('?') ||
                      content.startsWith('comment') ||
                      content.startsWith('pourquoi') ||
                      content.startsWith('quoi') ||
                      content.startsWith('qui') ||
                      content.startsWith('quand') ||
                      content.startsWith('où');

    // Detect if requires support
    const requiresSupport = content.includes('aide') ||
                           content.includes('help') ||
                           content.includes('problème') ||
                           content.includes('bug') ||
                           (isQuestion && urgency === 'high');

    return {
      sentiment,
      emotions,
      urgency,
      isQuestion,
      requiresSupport
    };
  }

  /**
   * Get or create user preferences with learning
   */
  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Check cache first
    if (this.userPreferencesCache.has(userId)) {
      return this.userPreferencesCache.get(userId)!;
    }

    // Try to load from database
    try {
      const userData = await this.prisma.aIConversation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          context: true,
          createdAt: true,
        }
      });

      const preferences: UserPreferences = {
        userId,
        lastInteraction: userData[0]?.createdAt || new Date(),
        conversationCount: userData.length,
        learningData: {
          commonQuestions: [],
          preferredExamples: [],
          feedbackHistory: []
        }
      };

      // Analyze user's conversation patterns
      const allContext = userData.map(d => d.context).filter(Boolean).join(' ');

      // Detect preferred language (FR vs EN)
      const frenchWords = (allContext.match(/\b(le|la|les|un|une|des|et|de|à|en)\b/gi) || []).length;
      const englishWords = (allContext.match(/\b(the|a|an|and|of|to|in|is)\b/gi) || []).length;
      preferences.preferredLanguage = frenchWords > englishWords ? 'fr' : 'en';

      // Detect preferred tone
      const casualWords = (allContext.match(/\b(mec|gars|cool|genre|ouais|bah)\b/gi) || []).length;
      const formalWords = (allContext.match(/\b(monsieur|madame|veuillez|cordialement)\b/gi) || []).length;
      const technicalWords = (allContext.match(/\b(api|database|function|code|server|deploy)\b/gi) || []).length;

      if (technicalWords > 10) preferences.preferredTone = 'technical';
      else if (casualWords > formalWords) preferences.preferredTone = 'casual';
      else preferences.preferredTone = 'formal';

      // Cache it
      this.userPreferencesCache.set(userId, preferences);

      return preferences;
    } catch (error) {
      // Return default preferences if database fails
      const defaultPrefs: UserPreferences = {
        userId,
        preferredLanguage: 'fr',
        preferredTone: 'casual',
        conversationCount: 0
      };
      this.userPreferencesCache.set(userId, defaultPrefs);
      return defaultPrefs;
    }
  }

  /**
   * Update user preferences based on interaction
   */
  private async updateUserPreferences(userId: string, message: Message, sentiment: SentimentAnalysis): Promise<void> {
    const prefs = await this.getUserPreferences(userId);

    prefs.lastInteraction = new Date();
    prefs.conversationCount = (prefs.conversationCount || 0) + 1;

    // Track topics of interest
    const content = message.content.toLowerCase();
    const topics: string[] = [];

    // Extract topics from message
    if (content.includes('code') || content.includes('programming')) topics.push('programming');
    if (content.includes('discord') || content.includes('bot')) topics.push('discord-bots');
    if (content.includes('game') || content.includes('jeu')) topics.push('gaming');
    if (content.includes('music') || content.includes('musique')) topics.push('music');
    if (content.includes('ai') || content.includes('intelligence')) topics.push('ai');

    if (topics.length > 0) {
      prefs.topicsOfInterest = [...new Set([...(prefs.topicsOfInterest || []), ...topics])].slice(0, 10);
    }

    // Detect response style preference based on message length
    if (message.content.length > 200) {
      prefs.responseStyle = 'detailed';
    } else if (message.content.length < 50) {
      prefs.responseStyle = 'concise';
    }

    // Update stats
    this.userInteractionStats.set(userId, {
      count: (this.userInteractionStats.get(userId)?.count || 0) + 1,
      lastSeen: new Date()
    });

    // Update cache
    this.userPreferencesCache.set(userId, prefs);
  }

  /**
   * Track conversation topics for better context
   */
  private trackConversationTopic(channelId: string, message: string): void {
    const topics = this.conversationTopics.get(channelId) || [];

    // Extract key phrases (simple implementation)
    const words = message.toLowerCase().split(/\s+/);
    const keywords = words.filter(word =>
      word.length > 4 &&
      !['about', 'with', 'from', 'that', 'this', 'have', 'been'].includes(word)
    );

    // Add new keywords, keep last 20
    const updatedTopics = [...new Set([...topics, ...keywords])].slice(-20);
    this.conversationTopics.set(channelId, updatedTopics);
  }

  /**
   * Smart rate limiting that adapts to user behavior
   */
  private async smartRateLimit(userId: string, channelId: string, config: AIConfig): Promise<boolean> {
    const now = Date.now();
    const userKey = `user:${userId}`;
    const channelKey = `channel:${channelId}`;

    // Get user stats
    const stats = this.userInteractionStats.get(userId);
    const isRegularUser = stats && stats.count > 10;

    // Regular users get more lenient rate limits
    const userLimit = isRegularUser ? config.rateLimitPerUser * 1.5 : config.rateLimitPerUser;
    const timeWindow = 60000; // 1 minute

    // Check user rate limit
    const userTimestamps = this.rateLimitCache.get(userKey) || [];
    const recentUserRequests = userTimestamps.filter(ts => now - ts < timeWindow);

    if (recentUserRequests.length >= userLimit) {
      console.log(`[AI] Rate limit exceeded for user ${userId} (${recentUserRequests.length}/${userLimit})`);
      return false;
    }

    // Check channel rate limit
    const channelTimestamps = this.rateLimitCache.get(channelKey) || [];
    const recentChannelRequests = channelTimestamps.filter(ts => now - ts < timeWindow);

    if (recentChannelRequests.length >= config.rateLimitPerChannel) {
      console.log(`[AI] Rate limit exceeded for channel ${channelId} (${recentChannelRequests.length}/${config.rateLimitPerChannel})`);
      return false;
    }

    // Update rate limit caches
    this.rateLimitCache.set(userKey, [...recentUserRequests, now]);
    this.rateLimitCache.set(channelKey, [...recentChannelRequests, now]);

    return true;
  }

  /**
   * Enhanced conversation context with intelligent summarization
   */
  private async getEnhancedConversationContext(
    message: Message,
    config: AIConfig,
    userPrefs: UserPreferences
  ): Promise<ConversationContext[]> {
    const channelId = message.channelId;
    const existingContext = this.conversationCache.get(channelId) || [];

    // Smart context window based on user preferences
    const contextSize = userPrefs.responseStyle === 'detailed' ?
      Math.min(config.contextWindow, 15) :
      Math.min(config.contextWindow, 8);

    // Get recent messages with intelligent filtering
    const recentContext = existingContext.slice(-contextSize);

    // If context is getting long, summarize older messages
    if (recentContext.length > 10) {
      const olderMessages = recentContext.slice(0, -5);
      const recentMessages = recentContext.slice(-5);

      // Create a summary of older messages
      const summary = this.summarizeConversation(olderMessages);

      return [
        {
          role: 'system' as const,
          content: `Résumé de la conversation précédente: ${summary}`
        },
        ...recentMessages
      ];
    }

    return recentContext;
  }

  /**
   * Summarize older conversation context
   */
  private summarizeConversation(messages: ConversationContext[]): string {
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => typeof m.content === 'string' ? m.content : m.content.find(c => c.type === 'text')?.text || '')
      .filter(Boolean);

    if (userMessages.length === 0) return 'Pas de contexte précédent.';

    // Extract key topics
    const allText = userMessages.join(' ').toLowerCase();
    const topics = this.conversationTopics.get('summary') || [];

    const mainTopics = topics.slice(0, 3).join(', ') || 'conversation générale';

    return `L'utilisateur a discuté de: ${mainTopics}. ${userMessages.length} messages échangés.`;
  }

  /**
   * Clean up old caches periodically
   */
  private startCacheCleanup(): void {
    // Clean up every 10 minutes
    setInterval(() => {
      const now = Date.now();
      const maxAge = 30 * 60 * 1000; // 30 minutes

      // Clean processed messages cache
      for (const [messageId, timestamp] of this.processedMessages.entries()) {
        if (now - timestamp > maxAge) {
          this.processedMessages.delete(messageId);
        }
      }

      // Clean user preferences cache (keep active users)
      for (const [userId, prefs] of this.userPreferencesCache.entries()) {
        const lastInteraction = prefs.lastInteraction?.getTime() || 0;
        if (now - lastInteraction > 24 * 60 * 60 * 1000) { // 24 hours
          this.userPreferencesCache.delete(userId);
        }
      }

      // Clean conversation topics (keep recent channels only)
      if (this.conversationTopics.size > 100) {
        const entries = Array.from(this.conversationTopics.entries());
        const toKeep = entries.slice(-50);
        this.conversationTopics.clear();
        toKeep.forEach(([k, v]) => this.conversationTopics.set(k, v));
      }

      console.log('[AI] Cache cleanup completed');
    }, 10 * 60 * 1000);
  }

  /**
   * Initialize advanced features
   */
  async initializeAdvancedFeatures(): Promise<void> {
    console.log('[AI] Initializing advanced learning features...');
    this.startCacheCleanup();
    console.log('[AI] ✅ Advanced features initialized');
  }
}
