import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { ready } from './events/ready';
import { interactionCreate } from './events/interactionCreate';
import { guildMemberAdd } from './events/guildMemberAdd';
import messageCreateHandler from './events/messageCreate';
import { MetricsService } from './services/metrics.service';
import { initializeTicketConfigSync } from './utils/syncTicketConfig';
import { CommandService } from './services/command.service';
import { ConfigService } from './services/config.service';
import { WelcomeService } from './services/welcome.service';
import { TicketInteractionHandler } from './handlers/ticketInteraction.handler';
import { TicketService } from './services/ticket.service';
import { TicketStateManager } from './services/ticketStateManager.service';
import { StatusService } from './services/status.service';

dotenv.config();

interface BotConfig {
  welcomeEnabled: boolean;
  welcomeChannelId?: string;
  welcomeEmbedJson?: string;
  welcomeLogoUrl?: string;
  moderationEnabled: boolean;
  autoRoleEnabled: boolean;
  autoRoleId?: string;
  loggingChannelId?: string;
  customCommands?: any;
  ticketEnabled?: boolean;
  ticketCategoryId?: string;
  ticketStaffRoleId?: string;
  ticketTranscriptChannelId?: string;
  ticketData?: any;
  statusRotation?: any;
  embedV2Commands?: any;
}

class ChildBot {
  private client: Client;
  private prisma: PrismaClient;
  private config: BotConfig;
  private botId: string;
  private metricsService?: MetricsService;
  private commandService?: CommandService;
  private configService?: ConfigService;
  private welcomeService?: WelcomeService;
  private ticketHandler?: TicketInteractionHandler;
  private ticketService?: TicketService;
  private ticketStateManager?: TicketStateManager;
  private statusService?: StatusService;

  constructor() {
    // Force immediate console output
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      if (process.stdout.isTTY) {
        process.stdout.write('\x1b[0m'); // Reset color
      }
    };

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
      ],
      partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember,
        Partials.Reaction,
        Partials.ThreadMember,
      ],
    });

    this.prisma = new PrismaClient({
      log: [],
      errorFormat: 'minimal',
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
      
      // Parse ticketData if it's a string
      let ticketData = {};
      if (config.ticketData) {
        if (typeof config.ticketData === 'string') {
          try {
            ticketData = JSON.parse(config.ticketData);
          } catch (e) {
            console.error('Failed to parse ticketData:', e);
          }
        } else {
          ticketData = config.ticketData;
        }
      }
      
      // Parse statusRotation if it's a string
      let statusRotation = {};
      if (config.statusRotation) {
        if (typeof config.statusRotation === 'string') {
          try {
            statusRotation = JSON.parse(config.statusRotation);
          } catch (e) {
            console.error('Failed to parse statusRotation:', e);
          }
        } else {
          statusRotation = config.statusRotation;
        }
      }

      // Parse embedV2Commands if it's a string  
      let embedV2Commands = {};
      if (config.embedV2Commands) {
        if (typeof config.embedV2Commands === 'string') {
          try {
            embedV2Commands = JSON.parse(config.embedV2Commands);
          } catch (e) {
            console.error('Failed to parse embedV2Commands:', e);
          }
        } else {
          embedV2Commands = config.embedV2Commands;
        }
      }
      
      const finalConfig = {
        welcomeEnabled: config.welcomeEnabled || false,
        welcomeChannelId: config.welcomeChannelId,
        welcomeEmbedJson: config.welcomeEmbedJson,
        welcomeLogoUrl: config.welcomeLogoUrl,
        moderationEnabled: config.moderationEnabled || false,
        autoRoleEnabled: config.autoRoleEnabled || false,
        autoRoleId: config.autoRoleId,
        loggingChannelId: config.loggingChannelId,
        customCommands: config.customCommands,
        ticketEnabled: config.ticketEnabled || false,
        ticketCategoryId: config.ticketCategoryId,
        ticketStaffRoleId: config.ticketStaffRoleId,
        ticketTranscriptChannelId: config.ticketTranscriptChannelId,
        ticketData: ticketData,
        statusRotation: statusRotation,
        embedV2Commands: embedV2Commands,
      };
      
      return finalConfig;
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
    this.client.once('ready', async () => {
      try {
        // Check if ticket system is enabled BEFORE calling ready
        // ticketEnabled is now a direct column in bot_configs, not in ticketData JSON
        const ticketEnabled = (this.config as any).ticketEnabled || false;
        //console.log(`🎫 Ticket system enabled: ${ticketEnabled}`);

        await ready(this.client, this.prisma, this.botId, ticketEnabled);

        // Initialize metrics service after bot is ready
        try {
          this.metricsService = new MetricsService(this.client, this.prisma, this.botId);
          console.log('Metrics tracking initialized and started');
        } catch (error) {
          console.error('⚠️ Failed to initialize metrics service:', error);
        }

        // Initialize command service
        try {
          this.commandService = new CommandService(this.client, this.prisma, this.botId);
          console.log('Command module initialized and started');
        } catch (error) {
          console.error('⚠️ Failed to initialize command service:', error);
        }

        if (ticketEnabled) {
          // Sync ticket configuration from dashboard first
          const guildIds = this.client.guilds.cache.map(guild => guild.id);
          await initializeTicketConfigSync(guildIds, this.botId);

          this.ticketHandler = new TicketInteractionHandler(this.client);
          const services = this.ticketHandler.getServices();
          this.ticketService = services.ticketService;
          this.ticketStateManager = services.stateManager;
          // Store on client for command access
          (this.client as any).ticketHandler = this.ticketHandler;

          // Set ticket panel service in command service
          if (this.commandService && this.ticketHandler) {
            this.commandService.setTicketPanelService(this.ticketHandler.getServices().panelService);
          }

          console.log('🎫 Ticket module initialized and started');
        }

        // Start command service
        if (this.commandService) {
          try {
            this.commandService.start();
            console.log('📡 Command module started');
          } catch (error) {
            console.error('⚠️ Failed to start command module:', error);
          }
        }

        // Start status rotation module
        try {
          this.statusService = new StatusService(this.client);
          this.statusService.start();
          console.log('Status module initialized and started');
        } catch (error) {
          console.error('⚠️ Failed to start status module:', error);
        }

        console.log('Bot fully initialized and running');
        //console.log(`⏱️  Process uptime: ${Math.floor(process.uptime())}s`);
      } catch (error) {
        console.error('❌ Error in ready event:', error);
        // Don't exit - try to keep running
      }
    });
    
    this.client.on('guildMemberAdd', (member) => 
      guildMemberAdd(member, this.welcomeService!, this.config)
    );
    
    this.client.on('interactionCreate', (interaction) => 
      interactionCreate(interaction, this.prisma, this.configService!, this.ticketHandler || undefined)
    );
    
    // Message create event for ticket tracking
    this.client.on('messageCreate', async (message) => {
      if (this.ticketService && this.ticketStateManager) {
        await messageCreateHandler.execute(message, this.ticketService, this.ticketStateManager);
      }
    });
    
    // Error handling
    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
    });
    
    this.client.on('warn', (warn) => {
      console.warn('Discord client warning:', warn);
    });
    
    process.on('unhandledRejection', (error) => {
      console.error('❌ Unhandled promise rejection:', error);
      // Don't exit - just log the error
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught exception:', error);
      // Don't exit immediately - give time to log
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });
    
    process.on('SIGINT', async () => {
      console.log('Received SIGINT, shutting down gracefully...');
      await this.shutdown();
    });
    
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      await this.shutdown();
    });
  }

  private async shutdown() {
    try {
      // Update bot status to offline
      await this.prisma.bot.update({
        where: { id: this.botId },
        data: { status: 'OFFLINE' }
      });
      
      // Disconnect from Discord
      this.client.destroy();
      
      // Close database connection
      await this.prisma.$disconnect();
      
      console.log('Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  public async start() {
    try {
      console.log('Initializing bot...');
      console.log('Validating token...');

      // Validate BOT_TOKEN exists
      const token = process.env.BOT_TOKEN;
      if (!token) {
        throw new Error('BOT_TOKEN environment variable is not set');
      }

      // Basic token format validation (Discord tokens should start with certain prefixes)
      if (token.length < 50) {
        throw new Error('Invalid token format: token too short');
      }

      //console.log(`Token length: ${token.length} characters`);

      // Connect to database
      await this.prisma.$connect();
      console.log('Database succesfully connected');

      // Update bot status
      await this.prisma.bot.update({
        where: { id: this.botId },
        data: { status: 'STARTING' }
      });
      //console.log('✅ Bot status updated to STARTING');

      // Login to Discord
      console.log('Attempting to login to Discord...');
      await this.client.login(token);
      console.log(`Bot started for bot ID: ${this.botId}`);

    } catch (error) {
      console.error('Failed to start bot:', error);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('An invalid token was provided')) {
          console.error('❌ The Discord bot token is invalid or has been reset');
          console.error('Please update the bot token in the dashboard');
        } else if (error.message.includes('Authentication failed')) {
          console.error('❌ Discord authentication failed - token may be invalid or expired');
        }
      }

      process.exit(1);
    }
  }
}

// Start the bot
const bot = new ChildBot();
bot.start();