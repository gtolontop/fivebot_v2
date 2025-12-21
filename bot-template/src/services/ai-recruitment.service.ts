import { Client, Message, EmbedBuilder, TextChannel, ThreadChannel } from 'discord.js';
import OpenAI from 'openai';
import { PrismaClient, Ticket, TicketCategory } from '@prisma/client';
import { decrypt } from '../utils/encryption';

interface RecruitmentState {
  started: boolean;
  questionCount: number;
  answers: Array<{
    question: string;
    answer: string;
    timestamp: number;
  }>;
  completed: boolean;
  summary?: string;
  recommendation?: 'recommended' | 'hesitant' | 'not_recommended';
}

export class AIRecruitmentService {
  private client: Client;
  private prisma: PrismaClient;
  private openai: OpenAI | null = null;

  // Messages that don't need a response (just acknowledgments)
  private readonly SKIP_PATTERNS = [
    /^(ok|okay|k|kk|oui|yes|yep|yeah|yea|yup|sure|alright|aight|bet|cool|nice|great|good|thanks|thx|ty|merci|np|no problem|👍|👌|✅|🙏|😊|😄|🤝|💪|❤️|🔥|✨|😎|🙌|👏)+$/i,
    /^\.+$/, // Just dots
    /^\s*$/, // Empty or whitespace
  ];

  // Patterns that indicate the conversation should end
  private readonly END_PATTERNS = [
    /\b(bye|goodbye|cya|see you|au revoir|à plus|a\+|bonne journée|bonne soirée)\b/i,
    /^(done|fini|terminé|that's all|c'est tout)$/i,
  ];

  constructor(client: Client, prisma?: PrismaClient) {
    this.client = client;
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Initialize OpenAI with the guild's API key
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
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the recruitment state for a ticket
   */
  async getRecruitmentState(ticketId: string): Promise<RecruitmentState | null> {
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
   * Update the recruitment state for a ticket
   */
  async updateRecruitmentState(ticketId: string, state: RecruitmentState): Promise<void> {
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { aiRecruitmentState: JSON.stringify(state) },
    });
  }

  /**
   * Check if a message should be skipped (acknowledgment, emoji, etc.)
   */
  shouldSkipMessage(content: string): boolean {
    const trimmed = content.trim();

    // Skip very short messages that are just acknowledgments
    if (trimmed.length <= 5 && this.SKIP_PATTERNS.some(p => p.test(trimmed))) {
      return true;
    }

    // Skip messages that are ONLY emojis
    const emojiOnlyPattern = /^[\p{Emoji}\s]+$/u;
    if (emojiOnlyPattern.test(trimmed) && trimmed.length < 20) {
      return true;
    }

    return false;
  }

  /**
   * Check if the conversation should end
   */
  shouldEndConversation(content: string): boolean {
    return this.END_PATTERNS.some(p => p.test(content.trim()));
  }

  /**
   * Start a recruitment interview
   */
  async startRecruitment(
    ticket: Ticket,
    category: TicketCategory | null,
    channel: TextChannel | ThreadChannel
  ): Promise<void> {
    const initialized = await this.initOpenAI(ticket.guildId);
    if (!initialized) {
      console.log('[AIRecruitment] OpenAI not configured for guild:', ticket.guildId);
      return;
    }

    // Get server name
    const guild = this.client.guilds.cache.get(ticket.guildId);
    const serverName = guild?.name || 'this server';

    // Get the AI direction from category
    const aiDirection = category?.aiDirection ||
      `We are recruiting for ${serverName}. Ask relevant questions to evaluate the candidate.`;

    // Initialize recruitment state
    const state: RecruitmentState = {
      started: true,
      questionCount: 0,
      answers: [],
      completed: false,
    };

    await this.updateRecruitmentState(ticket.id, state);

    // Generate the opening message
    const systemPrompt = this.buildRecruiterPrompt(serverName, aiDirection, state);

    try {
      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'The candidate just opened a recruitment ticket. Start the interview.' },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const aiMessage = response.choices[0]?.message?.content;
      if (aiMessage) {
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#5865F2')
              .setDescription(aiMessage)
              .setFooter({ text: 'AI Recruiter' }),
          ],
        });
      }
    } catch (error) {
      console.error('[AIRecruitment] Error starting recruitment:', error);
    }
  }

  /**
   * Process a candidate's response
   */
  async processResponse(
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

    const state = await this.getRecruitmentState(ticket.id);
    if (!state || state.completed) {
      return;
    }

    const initialized = await this.initOpenAI(ticket.guildId);
    if (!initialized) {
      return;
    }

    // Get server info
    const guild = this.client.guilds.cache.get(ticket.guildId);
    const serverName = guild?.name || 'this server';

    // Get the AI direction
    const aiDirection = category?.aiDirection ||
      `We are recruiting for ${serverName}. Ask relevant questions to evaluate the candidate.`;

    // Check if conversation should end
    if (this.shouldEndConversation(message.content)) {
      await this.generateSummary(message, ticket, category, state);
      return;
    }

    // Add the answer to state
    state.answers.push({
      question: 'Previous question', // Will be updated by AI context
      answer: message.content,
      timestamp: Date.now(),
    });
    state.questionCount++;

    await this.updateRecruitmentState(ticket.id, state);

    // Check if we have enough answers (5-8 questions typically)
    if (state.questionCount >= 6) {
      await this.generateSummary(message, ticket, category, state);
      return;
    }

    // Build conversation history for context
    const conversationHistory = this.buildConversationHistory(state);

    // Generate next response
    const systemPrompt = this.buildRecruiterPrompt(serverName, aiDirection, state);

    try {
      // Show typing indicator
      const channel = message.channel as TextChannel | ThreadChannel;
      await channel.sendTyping();

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message.content },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const aiMessage = response.choices[0]?.message?.content;
      if (aiMessage) {
        // Check if AI wants to conclude
        if (aiMessage.toLowerCase().includes('summary') ||
            aiMessage.toLowerCase().includes('conclusion') ||
            aiMessage.toLowerCase().includes('recommendation')) {
          state.completed = true;
          await this.updateRecruitmentState(ticket.id, state);
        }

        await message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#5865F2')
              .setDescription(aiMessage)
              .setFooter({ text: 'AI Recruiter' }),
          ],
        });
      }
    } catch (error) {
      console.error('[AIRecruitment] Error processing response:', error);
    }
  }

  /**
   * Generate the final summary and recommendation
   */
  private async generateSummary(
    message: Message,
    ticket: Ticket,
    category: TicketCategory | null,
    state: RecruitmentState
  ): Promise<void> {
    const guild = this.client.guilds.cache.get(ticket.guildId);
    const serverName = guild?.name || 'this server';
    const aiDirection = category?.aiDirection || 'General recruitment';

    const conversationHistory = this.buildConversationHistory(state);

    const summaryPrompt = `
You are the recruiter for ${serverName}.

RECRUITMENT CRITERIA:
${aiDirection}

Based on the interview conversation, provide:
1. A brief SUMMARY of the candidate's responses
2. KEY STRENGTHS identified
3. POTENTIAL CONCERNS (if any)
4. Your RECOMMENDATION with one of these verdicts:
   - Recommended - The candidate meets the criteria well
   - Hesitant - Some concerns but could work out
   - Not Recommended - Significant concerns or doesn't meet criteria

Format your response clearly with sections. Be honest but professional.
The staff will make the final decision based on your assessment.
`;

    try {
      const channel = message.channel as TextChannel | ThreadChannel;
      await channel.sendTyping();

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: summaryPrompt },
          ...conversationHistory,
          { role: 'user', content: 'Please provide your final assessment of this candidate.' },
        ],
        temperature: 0.5,
        max_tokens: 800,
      });

      const summary = response.choices[0]?.message?.content;
      if (summary) {
        // Determine recommendation from summary
        let recommendation: 'recommended' | 'hesitant' | 'not_recommended' = 'hesitant';
        let emoji = '';
        let color: number = 0xFFA500; // Orange for hesitant

        if (summary.toLowerCase().includes('not recommended') ||
            summary.toLowerCase().includes('non recommandé')) {
          recommendation = 'not_recommended';
          emoji = '';
          color = 0xFF0000; // Red
        } else if (summary.toLowerCase().includes('recommended') &&
                   !summary.toLowerCase().includes('not recommended')) {
          recommendation = 'recommended';
          emoji = '';
          color = 0x00FF00; // Green
        }

        state.completed = true;
        state.summary = summary;
        state.recommendation = recommendation;
        await this.updateRecruitmentState(ticket.id, state);

        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(color)
              .setTitle(`${emoji} AI Assessment Complete`)
              .setDescription(summary)
              .addFields(
                { name: 'Questions Asked', value: `${state.questionCount}`, inline: true },
                { name: 'Answers Received', value: `${state.answers.length}`, inline: true },
              )
              .setFooter({ text: 'Staff will review and make the final decision' })
              .setTimestamp(),
          ],
        });

        // Notify that AI is done and staff should take over
        await channel.send({
          content: '> The AI interview is complete. Staff can now review the conversation and make a decision.',
        });
      }
    } catch (error) {
      console.error('[AIRecruitment] Error generating summary:', error);
    }
  }

  /**
   * Build the recruiter system prompt
   */
  private buildRecruiterPrompt(
    serverName: string,
    aiDirection: string,
    state: RecruitmentState
  ): string {
    return `You are the official recruiter for ${serverName}. You are conducting a recruitment interview.

YOUR ROLE:
- You CONDUCT the interview - YOU ask the questions
- You evaluate the candidate's responses
- You give a professional assessment at the end

WHAT WE'RE LOOKING FOR:
${aiDirection}

BEHAVIOR:
- Be professional but friendly
- Generate your own questions based on what we're looking for
- Ask ONE question at a time
- Wait for the answer before continuing
- Adapt your questions based on answers (if someone says they're 14 and we need 16+, explore that)
- If the answer is vague, ask for clarification
- YOU ARE THE RECRUITER, not the candidate - NEVER answer questions as if they were for you

CURRENT STATE:
- Questions asked so far: ${state.questionCount}
- ${state.questionCount === 0 ? 'This is the beginning of the interview' : 'Continue the interview naturally'}

INSTRUCTIONS:
1. If this is the start, introduce yourself briefly and explain the process
2. Ask your questions naturally, one at a time
3. When you have enough information (5-8 questions typically), provide a SUMMARY
4. Give your VERDICT: Recommended | Hesitant | Not Recommended
5. Justify your verdict with strengths and concerns

Keep responses concise (2-3 sentences max per question). Be natural, not robotic.`;
  }

  /**
   * Build conversation history for AI context
   */
  private buildConversationHistory(state: RecruitmentState): Array<{ role: 'user' | 'assistant'; content: string }> {
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const answer of state.answers) {
      history.push({ role: 'user', content: answer.answer });
    }

    return history;
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
}
