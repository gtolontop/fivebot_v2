import { Client, Message, Events } from 'discord.js';
import { AIService } from '../services/ai.service';
import { PrismaClient } from '@prisma/client';

export class AIHandler {
  private client: Client;
  private aiService: AIService;
  private prisma: PrismaClient;
  private initialized: boolean = false;

  constructor(client: Client, prisma?: PrismaClient) {
    this.client = client;
    this.prisma = prisma || new PrismaClient();
    this.aiService = new AIService(client, this.prisma);
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[AI Handler] Already initialized, skipping...');
      return;
    }

    console.log('[AI Handler] Initializing AI handler...');

    // Setup message handler (bind to prevent multiple registrations)
    this.client.on(Events.MessageCreate, this.handleMessage.bind(this));

    this.initialized = true;
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
