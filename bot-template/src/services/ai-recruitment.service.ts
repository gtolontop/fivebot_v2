import { Client, Message, EmbedBuilder, TextChannel, ThreadChannel } from 'discord.js';
import OpenAI from 'openai';
import { PrismaClient, Ticket, TicketCategory } from '@prisma/client';
import { decrypt } from '../utils/encryption';

interface TicketAIState {
  mode: 'greeting' | 'support' | 'recruitment' | 'general';
  context: string[];
  questionCount: number;
  completed: boolean;
  summary?: string;
  recommendation?: 'recommended' | 'hesitant' | 'not_recommended';
}

interface AIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  personality: string;
  customPersonality?: string;
  systemPrompt?: string;
}

export class AIRecruitmentService {
  private client: Client;
  private prisma: PrismaClient;
  private openai: OpenAI | null = null;
  private aiConfig: AIConfig | null = null;

  // Messages that don't need a response (just acknowledgments)
  private readonly SKIP_PATTERNS = [
    /^(ok|okay|k|kk|oui|yes|yep|yeah|yea|yup|sure|alright|aight|bet|cool|nice|great|good|thanks|thx|ty|merci|np|no problem)+$/i,
    /^\.+$/, // Just dots
    /^\s*$/, // Empty or whitespace
  ];

  // Emoji-only pattern
  private readonly EMOJI_ONLY_PATTERN = /^[\p{Emoji}\s]+$/u;

  constructor(client: Client, prisma?: PrismaClient) {
    this.client = client;
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Initialize OpenAI with the guild's API key and config
   */
  private async initOpenAI(guildId: string): Promise<boolean> {
    const config = await this.prisma.aIConfig.findUnique({
      where: { guildId },
    });

    if (!config?.apiKey) {
      return false;
    }

    try {
      this.openai = new OpenAI({
        apiKey: decrypt(config.apiKey),
      });

      // Store the config for later use
      this.aiConfig = {
        model: config.model || 'gpt-5-nano',
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 500,
        personality: config.personality || 'friendly',
        customPersonality: config.customPersonality || undefined,
        systemPrompt: config.systemPrompt || undefined,
      };

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the ticket AI state
   */
  async getTicketState(ticketId: string): Promise<TicketAIState | null> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket?.aiRecruitmentState) {
      return null;
    }

    try {
      return JSON.parse(ticket.aiRecruitmentState);
    } catch {
      return null;
    }
  }

  /**
   * Update the ticket AI state
   */
  async updateTicketState(ticketId: string, state: TicketAIState): Promise<void> {
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { aiRecruitmentState: JSON.stringify(state) },
    });
  }

  /**
   * Check if a message should be skipped
   */
  shouldSkipMessage(content: string): boolean {
    const trimmed = content.trim();

    // Skip empty messages
    if (trimmed.length === 0) return true;

    // Skip very short acknowledgment messages (expanded list)
    const shortPatterns = [
      /^(ok|okay|k|kk|oui|yes|yep|yeah|yea|yup|sure|alright|aight|bet|cool|nice|great|good|thanks|thx|ty|merci|np|no problem|lol|lmao|haha|hehe|xd|mdr|ptdr|ah|oh|eh|hmm|hm|mm|uh|um|nah|nope|non|hm+|a{2,}h*|o{2,}h*)+$/i,
    ];
    if (trimmed.length <= 20 && shortPatterns.some(p => p.test(trimmed))) {
      console.log(`[TicketAI] Skipping acknowledgment: "${trimmed}"`);
      return true;
    }

    // Skip messages that are ONLY emojis
    if (this.EMOJI_ONLY_PATTERN.test(trimmed) && trimmed.length < 50) {
      console.log(`[TicketAI] Skipping emoji-only: "${trimmed}"`);
      return true;
    }

    // Skip messages that are just "heyy" type greetings between users
    const greetingPattern = /^(hey+|hi+|hello+|yo+|sup+|salut+|coucou+)[\s!]*$/i;
    if (greetingPattern.test(trimmed)) {
      console.log(`[TicketAI] Skipping greeting: "${trimmed}"`);
      return true;
    }

    return false;
  }

  /**
   * Extract ticket information from the initial embed
   */
  private async getTicketEmbedInfo(channel: TextChannel | ThreadChannel): Promise<{
    subject?: string;
    description?: string;
    priority?: string;
    createdBy?: string;
    createdById?: string;
  }> {
    try {
      // Fetch the first few messages to find the ticket embed
      const messages = await channel.messages.fetch({ limit: 5 });

      for (const [, msg] of messages) {
        if (msg.author.bot && msg.embeds.length > 0) {
          const embed = msg.embeds[0];

          // Look for ticket embed by checking for typical fields
          if (embed.title?.includes('Ticket #') || embed.fields?.some(f => f.name === 'Created By')) {
            const result: any = {};

            // Extract title/subject
            if (embed.title) {
              const match = embed.title.match(/Ticket #\d+ - (.+)/);
              result.subject = match ? match[1] : embed.title;
            }

            // Extract description
            if (embed.description) {
              result.description = embed.description;
            }

            // Extract fields
            for (const field of embed.fields || []) {
              if (field.name === 'Priority') result.priority = field.value;
              if (field.name === 'Created By') {
                result.createdBy = field.value;
                // Extract user ID from mention format <@123456789> or @username
                const idMatch = field.value.match(/<@!?(\d+)>/);
                if (idMatch) {
                  result.createdById = idMatch[1];
                }
              }
            }

            return result;
          }
        }
      }
    } catch (error) {
      console.error('[TicketAI] Error fetching ticket embed:', error);
    }
    return {};
  }

  /**
   * Start the AI on a new ticket - she reads the embed and responds intelligently
   */
  async startTicket(
    ticket: Ticket,
    category: TicketCategory | null,
    channel: TextChannel | ThreadChannel,
    userName: string
  ): Promise<void> {
    const initialized = await this.initOpenAI(ticket.guildId);
    if (!initialized) {
      console.log('[TicketAI] OpenAI not configured for guild:', ticket.guildId);
      return;
    }

    // Get server name
    const guild = this.client.guilds.cache.get(ticket.guildId);
    const serverName = guild?.name || 'this server';
    const categoryName = category?.name || 'Support';

    // Wait a moment for the embed to be posted
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Read the ticket embed to understand what the user needs
    const ticketInfo = await this.getTicketEmbedInfo(channel);
    console.log('[TicketAI] Read ticket info:', ticketInfo);

    // Initialize state with ticket context
    const state: TicketAIState = {
      mode: 'greeting',
      context: [],
      questionCount: 0,
      completed: false,
    };

    // Add ticket info to context if available
    if (ticketInfo.subject) {
      state.context.push(`[TICKET INFO] Subject: ${ticketInfo.subject}`);
    }
    if (ticketInfo.description) {
      state.context.push(`[TICKET INFO] Description: ${ticketInfo.description}`);
    }

    await this.updateTicketState(ticket.id, state);

    // Build the intelligent greeting prompt with ticket context
    const systemPrompt = this.buildIntelligentPrompt(serverName, categoryName, userName, category?.aiDirection || null, state);

    // Build a context-aware greeting
    let userMessage = `${userName} just opened a ticket.`;
    if (ticketInfo.subject && ticketInfo.description) {
      userMessage = `${userName} opened a ticket about "${ticketInfo.subject}". Their description: "${ticketInfo.description}". Greet them and acknowledge their issue, then ask any clarifying questions if needed.`;
    } else if (ticketInfo.subject) {
      userMessage = `${userName} opened a ticket about "${ticketInfo.subject}". Greet them and ask what specifically they need help with.`;
    } else {
      userMessage = `${userName} just opened a ${categoryName} ticket. Greet them warmly and ask what they need help with.`;
    }

    try {
      const response = await this.openai!.chat.completions.create({
        model: this.aiConfig!.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: this.aiConfig!.temperature,
        max_tokens: this.aiConfig!.maxTokens,
      });

      const aiMessage = response.choices[0]?.message?.content;
      if (aiMessage) {
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#5865F2')
              .setDescription(aiMessage)
              .setFooter({ text: '🤖 AI Assistant' }),
          ],
        });
      }
    } catch (error) {
      console.error('[TicketAI] Error starting ticket:', error);
    }
  }

  /**
   * Check if a message in a ticket is directed at the AI or needs AI response
   * @param message The message to check
   * @param ticketOpenerId The ID of the user who opened the ticket (the customer)
   */
  private async isMessageForTicketAI(message: Message, ticketOpenerId?: string): Promise<boolean> {
    const isTicketOpener = ticketOpenerId && message.author.id === ticketOpenerId;
    const isStaff = ticketOpenerId && message.author.id !== ticketOpenerId;

    // Direct mention always gets a response
    if (message.mentions.has(this.client.user!.id)) {
      return true;
    }

    // If it's a reply to the bot, respond
    if (message.reference?.messageId) {
      try {
        const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
        if (repliedTo.author.id === this.client.user!.id) {
          return true;
        }
        // If replying to another user, probably not for the AI
        if (!repliedTo.author.bot) {
          console.log(`[TicketAI] Skipping - reply to another user`);
          return false;
        }
      } catch {
        // Ignore if we can't fetch the message
      }
    }

    // STAFF DETECTION: If message is from staff (not ticket opener), be very conservative
    // Staff are like "colleagues" helping the customer - AI should not respond to them
    // unless they explicitly ask the AI something
    if (isStaff) {
      const content = message.content.toLowerCase();

      // Staff must explicitly address the AI
      const staffAIIndicators = [
        'bot', 'ai', 'assistant', 'ia',
        '@', // Trying to mention
      ];

      const isAskingAI = staffAIIndicators.some(i => content.includes(i));

      if (!isAskingAI) {
        console.log(`[TicketAI] Skipping - staff message (not ticket opener), not directed at AI: "${message.content.substring(0, 50)}..."`);
        return false;
      }

      // Even if mentioning AI concepts, staff needs to be asking a question
      if (!content.includes('?')) {
        console.log(`[TicketAI] Skipping - staff message without question mark`);
        return false;
      }

      return true;
    }

    // From here, message is either from ticket opener OR we don't know who opened it
    const content = message.content.toLowerCase();

    // Check for question words or help-seeking behavior (for ticket opener)
    const helpIndicators = [
      '?', 'help', 'aide', 'problem', 'problème', 'issue', 'error', 'erreur',
      'how', 'comment', 'what', 'quoi', 'why', 'pourquoi', 'can you', 'peux-tu',
      'please', 'svp', 's\'il vous plait', 'need', 'besoin'
    ];

    if (helpIndicators.some(h => content.includes(h))) {
      return true;
    }

    // If we know this is the ticket opener, be more responsive
    if (isTicketOpener) {
      // Ticket opener's messages are usually relevant
      if (content.length >= 15) {
        return true;
      }
    }

    // Check recent messages to see if there's a conversation between users
    try {
      const recentMessages = await message.channel.messages.fetch({ limit: 5 });
      const nonBotMessages = recentMessages.filter(m => !m.author.bot && m.id !== message.id);
      const uniqueUsers = new Set(nonBotMessages.map(m => m.author.id));

      // If there are multiple users chatting (staff + customer), be conservative
      if (uniqueUsers.size > 1) {
        // Multiple users in channel - check if staff is helping
        // In this case, AI should stay quiet unless explicitly asked
        console.log(`[TicketAI] Multiple users in ticket - staying quiet unless explicitly asked`);
        return false;
      }
    } catch {
      // Ignore errors
    }

    // If the message is long enough, assume it might be relevant
    return content.length >= 30;
  }

  /**
   * Process a user's message in a ticket
   */
  async processMessage(
    message: Message,
    ticket: Ticket,
    category: TicketCategory | null
  ): Promise<void> {
    // Check if AI is enabled for this ticket
    if (!ticket.aiEnabled) {
      return;
    }

    // Skip bot messages
    if (message.author.bot) {
      return;
    }

    // Check if we should skip this message (emojis, short acknowledgments)
    if (this.shouldSkipMessage(message.content)) {
      return;
    }

    // Get ticket opener ID to distinguish customer from staff
    const channel = message.channel as TextChannel | ThreadChannel;
    const ticketInfo = await this.getTicketEmbedInfo(channel);
    const ticketOpenerId = ticketInfo.createdById || ticket.creatorId;

    console.log(`[TicketAI] Message from ${message.author.id}, ticket opened by ${ticketOpenerId}`);

    // Check if the message is directed at the AI or needs AI response
    const isForAI = await this.isMessageForTicketAI(message, ticketOpenerId);
    if (!isForAI) {
      console.log(`[TicketAI] Skipping message - not directed at AI: "${message.content.substring(0, 50)}..."`);
      return;
    }

    const state = await this.getTicketState(ticket.id);
    if (!state) {
      // Initialize state if not exists
      const newState: TicketAIState = {
        mode: 'general',
        context: [],
        questionCount: 0,
        completed: false,
      };
      await this.updateTicketState(ticket.id, newState);
    }

    const currentState = state || {
      mode: 'general' as const,
      context: [],
      questionCount: 0,
      completed: false,
    };

    // Don't respond if AI work is completed (summary given)
    if (currentState.completed) {
      return;
    }

    const initialized = await this.initOpenAI(ticket.guildId);
    if (!initialized) {
      return;
    }

    // Get server info
    const guild = this.client.guilds.cache.get(ticket.guildId);
    const serverName = guild?.name || 'this server';
    const categoryName = category?.name || 'Support';
    const userName = message.member?.displayName || message.author.username;

    // Add message to context
    currentState.context.push(`${userName}: ${message.content}`);

    // Keep only last 20 messages for context
    if (currentState.context.length > 20) {
      currentState.context = currentState.context.slice(-20);
    }

    currentState.questionCount++;

    // Build the intelligent prompt
    const systemPrompt = this.buildIntelligentPrompt(
      serverName,
      categoryName,
      userName,
      category?.aiDirection || null,
      currentState
    );

    try {
      // Show typing indicator
      const channel = message.channel as TextChannel | ThreadChannel;
      await channel.sendTyping();

      const response = await this.openai!.chat.completions.create({
        model: this.aiConfig!.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...this.buildConversationHistory(currentState.context),
        ],
        temperature: this.aiConfig!.temperature,
        max_tokens: this.aiConfig!.maxTokens,
      });

      const aiMessage = response.choices[0]?.message?.content;
      if (aiMessage) {
        // Detect if AI is providing a summary/conclusion
        const isSummary = this.detectSummary(aiMessage);

        if (isSummary) {
          currentState.completed = true;
          currentState.summary = aiMessage;

          // Determine recommendation
          if (aiMessage.toLowerCase().includes('not recommended') ||
              aiMessage.toLowerCase().includes('non recommandé') ||
              aiMessage.toLowerCase().includes('❌')) {
            currentState.recommendation = 'not_recommended';
          } else if (aiMessage.toLowerCase().includes('recommended') ||
                     aiMessage.toLowerCase().includes('recommandé') ||
                     aiMessage.toLowerCase().includes('✅')) {
            currentState.recommendation = 'recommended';
          } else {
            currentState.recommendation = 'hesitant';
          }
        }

        await this.updateTicketState(ticket.id, currentState);

        // Choose embed color based on context
        let embedColor = '#5865F2'; // Default blue
        if (isSummary) {
          if (currentState.recommendation === 'recommended') {
            embedColor = '#00FF00'; // Green
          } else if (currentState.recommendation === 'not_recommended') {
            embedColor = '#FF0000'; // Red
          } else {
            embedColor = '#FFA500'; // Orange
          }
        }

        await message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(embedColor as any)
              .setDescription(aiMessage)
              .setFooter({ text: isSummary ? '📋 AI Assessment' : '🤖 AI Assistant' }),
          ],
        });

        // If summary provided, notify staff
        if (isSummary) {
          await channel.send({
            content: '> ✅ L\'IA a terminé son évaluation. Les staff peuvent maintenant prendre une décision.',
          });
        }
      }
    } catch (error) {
      console.error('[TicketAI] Error processing message:', error);
    }
  }

  /**
   * Build the intelligent system prompt - the AI figures out what to do
   */
  private buildIntelligentPrompt(
    serverName: string,
    categoryName: string,
    userName: string,
    aiDirection: string | null,
    state: TicketAIState
  ): string {
    const contextHistory = state.context.length > 0
      ? `\n\nCONVERSATION HISTORY:\n${state.context.join('\n')}`
      : '';

    const directionInfo = aiDirection
      ? `\n\nRECRUITMENT DIRECTION (if user mentions they want to join/apply):\n${aiDirection}`
      : '';

    return `You are an intelligent AI assistant for ${serverName}. You handle support tickets with intelligence and adaptability.

YOUR CAPABILITIES:
- You greet users and help with any request
- You DETECT what the user needs from their messages
- If they mention recruitment/joining/applying, you switch to recruiter mode
- If they need help/support, you assist them
- You remember the conversation context and adapt

CURRENT CONTEXT:
- Server: ${serverName}
- Category: ${categoryName}
- User: ${userName}
- Messages exchanged: ${state.questionCount}
- Current mode: ${state.mode}
${directionInfo}
${contextHistory}

BEHAVIOR RULES:
1. Be natural and conversational - not robotic
2. Keep responses SHORT (2-4 sentences max)
3. DETECT intent from messages:
   - "I want to apply" / "je veux postuler" / "recruitment" → Switch to recruiter mode, ask questions
   - "I need help" / "j'ai un problème" → Support mode, help them
   - General chat → Be friendly, guide them
4. If in recruiter mode:
   - Ask ONE question at a time
   - Evaluate answers intelligently
   - After 5-8 questions, give a SUMMARY with recommendation (✅ Recommended / ⚠️ Hesitant / ❌ Not Recommended)
5. Match the user's language (French/English)
6. Don't respond to emojis or "ok/thanks" with another full message

PERSONALITY:
${this.aiConfig?.customPersonality || this.aiConfig?.personality || 'Professional but friendly'}

You are SMART. Figure out what the user needs and adapt.`;
  }

  /**
   * Build conversation history for OpenAI
   */
  private buildConversationHistory(context: string[]): Array<{ role: 'user' | 'assistant'; content: string }> {
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const line of context) {
      // Detect if it's a user or AI message based on content patterns
      if (line.includes('AI:') || line.includes('🤖')) {
        history.push({ role: 'assistant', content: line.replace(/^.*?:\s*/, '') });
      } else {
        history.push({ role: 'user', content: line });
      }
    }

    return history;
  }

  /**
   * Detect if the AI response is a summary/conclusion
   */
  private detectSummary(message: string): boolean {
    const summaryKeywords = [
      'summary', 'conclusion', 'recommendation', 'assessment', 'verdict',
      'résumé', 'conclusion', 'recommandation', 'évaluation', 'avis final',
      '✅ recommended', '⚠️ hesitant', '❌ not recommended',
      '✅ recommandé', '⚠️ hésitant', '❌ non recommandé',
      'based on our conversation', 'après notre échange',
      'my recommendation', 'ma recommandation'
    ];

    const lowerMessage = message.toLowerCase();
    return summaryKeywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  }

  /**
   * Toggle AI for a specific ticket
   */
  async toggleAI(ticketId: string): Promise<boolean> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return false;
    }

    const newState = !ticket.aiEnabled;
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { aiEnabled: newState },
    });

    return newState;
  }

  // Legacy methods for compatibility
  async startRecruitment(ticket: Ticket, category: TicketCategory | null, channel: TextChannel | ThreadChannel): Promise<void> {
    const userName = 'User';
    await this.startTicket(ticket, category, channel, userName);
  }

  async greetUser(ticket: Ticket, category: TicketCategory | null, channel: TextChannel | ThreadChannel, userName: string): Promise<void> {
    await this.startTicket(ticket, category, channel, userName);
  }

  async processResponse(message: Message, ticket: Ticket, category: TicketCategory | null): Promise<void> {
    await this.processMessage(message, ticket, category);
  }
}
