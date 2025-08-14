import { Client, GatewayIntentBits, Collection, EmbedBuilder, ActivityType } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Import events
import { ready } from './events/ready';
import { guildMemberAdd } from './events/guildMemberAdd';
import { interactionCreate } from './events/interactionCreate';

// Import commands
import { commands } from './commands';

// Import services
import { ConfigService } from './services/config.service';
import { WelcomeService } from './services/welcome.service';

dotenv.config();

interface BotConfig {
  welcomeEnabled: boolean;
  welcomeChannelId?: string;
  welcomeEmbedJson?: any;
  welcomeLogoUrl?: string;
  moderationEnabled: boolean;
  autoRoleEnabled: boolean;
  autoRoleId?: string;
  loggingChannelId?: string;
  customCommands?: any;
}

class ChildBot {
  private client: Client;
  private prisma: PrismaClient;
  private botId: string;
  private config: BotConfig;
  private configService: ConfigService;
  private welcomeService: WelcomeService;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        // Suppression de GuildMessages et MessageContent pour utiliser uniquement les slash commands
        // GatewayIntentBits.GuildMessages,
        // GatewayIntentBits.MessageContent,
      ],
    });

    this.prisma = new PrismaClient({
      log: ['error'],
    });

    this.botId = process.env.BOT_ID!;
    this.config = this.loadConfig();
    
    this.configService = new ConfigService(this.prisma, this.botId);
    this.welcomeService = new WelcomeService(this.client, this.config);

    this.setupEventListeners();
  }

  private loadConfig(): BotConfig {
    try {
      const configString = process.env.CONFIG || '{}';
      const config = JSON.parse(configString);
      
      return {
        welcomeEnabled: config.welcomeEnabled || false,
        welcomeChannelId: config.welcomeChannelId,
        welcomeEmbedJson: config.welcomeEmbedJson,
        welcomeLogoUrl: config.welcomeLogoUrl,
        moderationEnabled: config.moderationEnabled || false,
        autoRoleEnabled: config.autoRoleEnabled || false,
        autoRoleId: config.autoRoleId,
        loggingChannelId: config.loggingChannelId,
        customCommands: config.customCommands,
      };
    } catch (error) {
      console.error('Error loading config:', error);
      return {
        welcomeEnabled: false,
        moderationEnabled: false,
        autoRoleEnabled: false,
      };
    }
  }

  private setupEventListeners() {
    // Core events
    this.client.once('ready', () => ready(this.client, this.prisma, this.botId));
    
    this.client.on('guildMemberAdd', (member) => 
      guildMemberAdd(member, this.welcomeService, this.config)
    );
    
    this.client.on('interactionCreate', (interaction) => 
      interactionCreate(interaction, this.prisma, this.configService)
    );

    // Error handling
    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
      this.reportError('CLIENT_ERROR', error);
    });

    this.client.on('warn', (info) => {
      console.warn('Discord client warning:', info);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
    
    process.on('unhandledRejection', (error) => {
      console.error('Unhandled promise rejection:', error);
      this.reportError('UNHANDLED_REJECTION', error);
    });
  }

  private async reportError(type: string, error: any) {
    try {
      await this.prisma.jobLog.create({
        data: {
          botId: this.botId,
          jobId: `error-${Date.now()}`,
          jobType: 'ERROR_REPORT',
          status: 'FAILED',
          message: `${type}: ${error.message}`,
          metadata: {
            stack: error.stack,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (dbError) {
      console.error('Failed to report error to database:', dbError);
    }
  }

  public async start() {
    try {
      // Connect to database
      await this.prisma.$connect();
      console.log('✅ Database connected');

      // Update bot status
      await this.updateBotStatus('STARTING');

      // Login to Discord
      await this.client.login(process.env.BOT_TOKEN);
      
      console.log(`🤖 Child bot started for bot ID: ${this.botId}`);
    } catch (error) {
      console.error('❌ Failed to start bot:', error);
      await this.updateBotStatus('ERROR');
      process.exit(1);
    }
  }

  private async deployCommands() {
    try {
      const { REST, Routes } = require('discord.js');
      const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

      console.log('🚀 Started refreshing application (/) commands.');

      await rest.put(
        Routes.applicationCommands(this.client.user?.id),
        { body: commands },
      );

      console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error('❌ Error deploying commands:', error);
    }
  }

  private async updateBotStatus(status: string) {
    try {
      await this.prisma.bot.update({
        where: { id: this.botId },
        data: { status },
      });
    } catch (error) {
      console.error('Failed to update bot status:', error);
    }
  }

  private async shutdown() {
    console.log('🛑 Shutting down gracefully...');
    
    try {
      await this.updateBotStatus('OFFLINE');
      this.client.destroy();
      await this.prisma.$disconnect();
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
    
    process.exit(0);
  }

  public async reloadConfig() {
    try {
      const newConfig = await this.configService.getConfig();
      this.config = newConfig;
      this.welcomeService.updateConfig(newConfig);
      
      console.log('🔄 Configuration reloaded');
      return true;
    } catch (error) {
      console.error('Failed to reload config:', error);
      return false;
    }
  }
}

// Start the bot
const bot = new ChildBot();
bot.start();

export { ChildBot };