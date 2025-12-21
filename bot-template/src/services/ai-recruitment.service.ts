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

    // Skip very short acknowledgment messages
    if (trimmed.length <= 10 && this.SKIP_PATTERNS.some(p => p.test(trimmed))) {
      return true;
    }

    // Skip messages that are ONLY emojis (less than 5 emojis)
    if (this.EMOJI_ONLY_PATTERN.test(trimmed) && trimmed.length < 30) {
      return true;
    }

    return false;
  }

  /**
   * Start the AI on a new ticket - she greets and is ready to help
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

    // Initialize state
    const state: TicketAIState = {
      mode: 'greeting',
      context: [],
      questionCount: 0,
      completed: false,
    };

    await this.updateTicketState(ticket.id, state);

    // Build the intelligent greeting prompt
    const systemPrompt = this.buildIntelligentPrompt(serverName, categoryName, userName, category?.aiDirection || null, state);

    try {
      const response = await this.openai!.chat.completions.create({
        model: this.aiConfig!.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${userName} just opened a ticket. Greet them warmly and ask how you can help.` },
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

    // Check if we should skip this message
    if (this.shouldSkipMessage(message.content)) {
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
