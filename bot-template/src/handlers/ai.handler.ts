import { Client, Message, Events } from 'discord.js';
import { AIService } from '../services/ai.service';
import { PrismaClient } from '@prisma/client';

export class AIHandler {
  private client: Client;
  private aiService: AIService;
  private prisma: PrismaClient;

  constructor(client: Client, prisma?: PrismaClient) {
    this.client = client;
    this.prisma = prisma || new PrismaClient();
    this.aiService = new AIService(client, this.prisma);
  }

  async initialize(): Promise<void> {
    console.log('[AI Handler] Initializing AI handler...');

    // Setup message handler
    this.client.on(Events.MessageCreate, async (message: Message) => {
      await this.handleMessage(message);
    });

    console.log('[AI Handler] ✅ AI handler initialized');
  }

  private async handleMessage(message: Message): Promise<void> {
    // Ignore DMs
    if (!message.guildId) return;

    // Ignore bots (except when testing)
    if (message.author.bot) return;

    try {
      await this.aiService.processMessage(message);
    } catch (error) {
      console.error('[AI Handler] Error processing message:', error);
    }
  }

  getService(): AIService {
    return this.aiService;
  }
}
