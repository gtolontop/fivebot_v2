import { Client, Message, TextChannel, EmbedBuilder, Guild, GuildMember } from 'discord.js';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { decrypt } from '../utils/encryption';
import { ScraperService } from './scraper.service';

interface AIAction {
  type: 'send_message' | 'add_todo' | 'set_reminder' | 'search_messages' | 'ping_user' | 'none';
  channelId?: string;
  channelName?: string;
  content?: string;
  todoText?: string;
  reminderText?: string;
  reminderTime?: string;
  searchQuery?: string;
  userId?: string;
}

interface AIResponse {
  shouldRespond: boolean;
  response?: string;
  action?: AIAction;
  reason?: string;
}

interface ChannelContext {
  channelId: string;
  channelName: string;
  categoryName: string | null;
  isTicket: boolean;
  isPartnerChannel: boolean;
  isAnnouncementChannel: boolean;
}

export class SmartAIService {
  private client: Client;
  private prisma: PrismaClient;
  private openai: OpenAI | null = null;
  private scraper: ScraperService;
  private model: string = 'gpt-5-nano';

  // Channels/categories where AI should NOT respond unless asked
  private readonly IGNORE_PATTERNS = [
    /partner/i,
    /partenaire/i,
    /annonce/i,
    /announcement/i,
    /rules/i,
    /règles/i,
    /info/i,
    /welcome/i,
    /bienvenue/i,
    /log/i,
  ];

  // Keywords that indicate AI should NOT respond
  private readonly IGNORE_KEYWORDS = [
    '@everyone',
    '@here',
  ];

  constructor(client: Client, prisma?: PrismaClient) {
    this.client = client;
    this.prisma = prisma || new PrismaClient();
    this.scraper = new ScraperService(client);
  }

  /**
   * Initialize OpenAI with guild config
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
      this.model = config.model || 'gpt-5-nano';
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get channel context for AI
   */
  private getChannelContext(message: Message): ChannelContext {
    const channel = message.channel as TextChannel;
    const categoryName = channel.parent?.name || null;

    return {
      channelId: channel.id,
      channelName: channel.name,
      categoryName,
      isTicket: channel.name.includes('ticket') || categoryName?.toLowerCase().includes('ticket') || false,
      isPartnerChannel: this.IGNORE_PATTERNS.some(p =>
        p.test(channel.name) || (categoryName && p.test(categoryName))
      ),
      isAnnouncementChannel: channel.name.includes('annonce') || channel.name.includes('announcement'),
    };
  }

  /**
   * Check if AI should respond to this message
   */
  shouldRespondToMessage(message: Message, context: ChannelContext): { should: boolean; reason: string } {
    // Always ignore bot messages
    if (message.author.bot) {
      return { should: false, reason: 'Bot message' };
    }

    // Check for @everyone or @here - don't respond unless specifically asked
    if (this.IGNORE_KEYWORDS.some(k => message.content.includes(k))) {
      if (!message.mentions.has(this.client.user!.id)) {
        return { should: false, reason: '@everyone/@here without mentioning bot' };
      }
    }

    // Don't respond in partner/announcement channels unless mentioned
    if (context.isPartnerChannel || context.isAnnouncementChannel) {
      if (!message.mentions.has(this.client.user!.id)) {
        return { should: false, reason: 'Partner/Announcement channel - not mentioned' };
      }
    }

    // In tickets, always respond
    if (context.isTicket) {
      return { should: true, reason: 'Ticket channel' };
    }

    // If bot is mentioned, respond
    if (message.mentions.has(this.client.user!.id)) {
      return { should: true, reason: 'Bot mentioned' };
    }

    // Default: don't respond to random messages
    return { should: false, reason: 'No trigger' };
  }

  /**
   * Get member info for AI context
   */
  private getMemberInfo(member: GuildMember | null): string {
    if (!member) return 'Unknown member';

    const roles = member.roles.cache
      .filter(r => r.name !== '@everyone')
      .map(r => r.name)
      .join(', ');

    const isAdmin = member.permissions.has('Administrator');
    const isMod = member.permissions.has('ManageMessages');
    const isOwner = member.id === member.guild.ownerId;

    return `Username: ${member.user.username}
Display Name: ${member.displayName}
Roles: ${roles || 'None'}
Is Owner: ${isOwner}
Is Admin: ${isAdmin}
Is Mod: ${isMod}
Joined: ${member.joinedAt?.toLocaleDateString() || 'Unknown'}`;
  }

  /**
   * Process a message with Smart AI
   */
  async processMessage(message: Message): Promise<AIResponse | null> {
    if (!message.guild) return null;

    const context = this.getChannelContext(message);
    const shouldCheck = this.shouldRespondToMessage(message, context);

    if (!shouldCheck.should) {
      return null;
    }

    const initialized = await this.initOpenAI(message.guild.id);
    if (!initialized) {
      return null;
    }

    // Get server context from scraped data
    const serverContext = this.scraper.getContextSummary(message.guild.id);
    const memberInfo = this.getMemberInfo(message.member);

    // Generate smart response
    const response = await this.generateResponse(message, context, serverContext, memberInfo);

    // Execute any actions
    if (response.action && response.action.type !== 'none') {
      await this.executeAction(message, response.action);
    }

    return response;
  }

  /**
   * Generate smart response with function calling
   */
  private async generateResponse(
    message: Message,
    context: ChannelContext,
    serverContext: string,
    memberInfo: string
  ): Promise<AIResponse> {
    // Get all channels for context
    const channels = message.guild!.channels.cache
      .filter(c => c.isTextBased() && !c.isDMBased())
      .map(c => `#${c.name}`)
      .slice(0, 30)
      .join(', ');

    const systemPrompt = `You are an ultra-intelligent AI assistant for Discord server "${message.guild!.name}".

CURRENT CONTEXT:
- Channel: #${context.channelName}
- Category: ${context.categoryName || 'None'}
- Is ticket: ${context.isTicket}
- Is partner channel: ${context.isPartnerChannel}
- Available channels: ${channels}

MEMBER INFO:
${memberInfo}

SERVER DATA:
${serverContext}

YOUR CAPABILITIES:
1. Answer questions intelligently with full context
2. Send messages to OTHER channels when asked (e.g. "reply to the client in #chat")
3. Ping/mention users in other channels
4. Add todos and reminders
5. Search through server messages
6. Help with any task

RULES:
1. If asked to reply/message in another channel, do it via action
2. NEVER respond to @everyone/@here unless specifically asked
3. NEVER respond in partner/announcement channels unless mentioned
4. Keep responses SHORT (2-4 sentences max)
5. Match the user's language (French/English)
6. Be helpful and proactive
7. If asked to ping someone in a channel, include the ping in the message

RESPONSE FORMAT (JSON):
{
  "shouldRespond": true,
  "response": "Your response here (or null if only doing action)",
  "action": {
    "type": "send_message|ping_user|add_todo|set_reminder|search_messages|none",
    "channelName": "channel name for send_message",
    "content": "message content for send_message",
    "userId": "user ID to ping",
    "todoText": "todo text",
    "reminderText": "reminder text",
    "reminderTime": "when",
    "searchQuery": "search query"
  },
  "reason": "Why responding/not responding"
}

IMPORTANT: When asked to message another channel, set action.type to "send_message" and include channelName and content.`;

    try {
      const response = await this.openai!.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message.content }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { shouldRespond: false, reason: 'No AI response' };
      }

      return JSON.parse(content) as AIResponse;

    } catch (error) {
      console.error('[SmartAI] Error:', error);
      return { shouldRespond: false, reason: 'AI error' };
    }
  }

  /**
   * Execute an AI action
   */
  private async executeAction(message: Message, action: AIAction): Promise<void> {
    try {
      switch (action.type) {
        case 'send_message':
          if (action.channelName && action.content) {
            await this.sendToChannel(message.guild!, action.channelName, action.content, action.userId);
          }
          break;

        case 'ping_user':
          if (action.channelName && action.userId) {
            const content = action.content || `<@${action.userId}>`;
            await this.sendToChannel(message.guild!, action.channelName, content);
          }
          break;

        case 'add_todo':
          if (action.todoText) {
            console.log(`[SmartAI] Todo: ${action.todoText}`);
            // TODO: Store in DB
          }
          break;

        case 'set_reminder':
          if (action.reminderText) {
            console.log(`[SmartAI] Reminder: ${action.reminderText} at ${action.reminderTime}`);
            // TODO: Store in DB and schedule
          }
          break;

        case 'search_messages':
          if (action.searchQuery) {
            const results = this.scraper.searchMessages(message.guild!.id, action.searchQuery, 5);
            console.log(`[SmartAI] Search results:`, results);
          }
          break;
      }
    } catch (error) {
      console.error('[SmartAI] Action error:', error);
    }
  }

  /**
   * Send a message to a specific channel
   */
  private async sendToChannel(guild: Guild, channelName: string, content: string, userId?: string): Promise<boolean> {
    const channel = guild.channels.cache.find(
      c => c.name.toLowerCase().includes(channelName.toLowerCase()) && c.isTextBased()
    ) as TextChannel;

    if (!channel) {
      console.log(`[SmartAI] Channel not found: ${channelName}`);
      return false;
    }

    // Add user ping if specified
    let finalContent = content;
    if (userId && !content.includes(`<@${userId}>`)) {
      finalContent = `<@${userId}> ${content}`;
    }

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('#5865F2')
          .setDescription(finalContent)
          .setFooter({ text: '🤖 AI Assistant' })
          .setTimestamp()
      ]
    });

    console.log(`[SmartAI] Sent message to #${channel.name}`);
    return true;
  }

  /**
   * Get scraper service for external use
   */
  getScraper(): ScraperService {
    return this.scraper;
  }
}
