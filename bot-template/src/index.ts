import { Client, GatewayIntentBits, Collection, EmbedBuilder, ActivityType } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Import events
import { ready } from './events/ready';
import { guildMemberAdd } from './events/guildMemberAdd';
import { interactionCreate } from './events/interactionCreate';
import messageCreate from './events/messageCreate';

// Import commands
import { commands } from './commands';

// Import services
import { ConfigService } from './services/config.service';
import { WelcomeService } from './services/welcome.service';
import { MetricsService } from './services/metrics.service';
import { TicketInteractionHandler } from './handlers/ticketInteraction.handler';
import { TicketService } from './services/ticket.service';
import { TicketStateManager } from './services/ticketStateManager.service';

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
  ticketData?: any;
}

class ChildBot {
  private client: Client;
  private prisma: PrismaClient;
  private botId: string;
  private config: BotConfig;
  private configService: ConfigService;
  private welcomeService: WelcomeService;
  private metricsService: MetricsService | null = null;
  private ticketHandler: TicketInteractionHandler | null = null;
  private ticketService: TicketService | null = null;
  private ticketStateManager: TicketStateManager | null = null;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.prisma = new PrismaClient({
      log: ['error'],
      // Simplify configuration to avoid compatibility issues
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
        ticketData: ticketData,
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
    this.client.once('ready', () => {
      ready(this.client, this.prisma, this.botId);
      // Initialize metrics service after bot is ready
      this.metricsService = new MetricsService(this.client, this.prisma, this.botId);
      console.log('📊 Metrics tracking initialized');
      
      // Initialize ticket system only if enabled
      const ticketEnabled = (this.config as any).ticketData?.ticketEnabled || false;
      if (ticketEnabled) {
        this.ticketHandler = new TicketInteractionHandler(this.client);
        const services = this.ticketHandler.getServices();
        this.ticketService = services.ticketService;
        this.ticketStateManager = services.stateManager;
        // Store on client for command access
        (this.client as any).ticketHandler = this.ticketHandler;
        console.log('🎫 Ticket system initialized');
      }
    });
    
    this.client.on('guildMemberAdd', (member) => 
      guildMemberAdd(member, this.welcomeService, this.config)
    );
    
    this.client.on('interactionCreate', (interaction) => 
      interactionCreate(interaction, this.prisma, this.configService, this.ticketHandler || undefined)
    );
    
    this.client.on('messageCreate', (message) => {
      if (this.ticketService && this.ticketStateManager) {
        messageCreate.execute(message, this.ticketService, this.ticketStateManager);
      }
    });
    
    // Guild events
    this.client.on('guildCreate', (guild) => {
      console.log(`Joined new server: ${guild.name} (${guild.memberCount} members)`);
    });
    
    this.client.on('guildDelete', (guild) => {
      console.log(`Removed from server: ${guild.name}`);
    });

    // Error handling
    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
      this.reportError('CLIENT_ERROR', error);
    });

    this.client.on('warn', (info) => {
      console.warn('Discord client warning:', info);
    });

    // Graceful shutdown - ensure shutdown is called only once
    let shutdownCalled = false;
    const handleShutdown = () => {
      if (!shutdownCalled) {
        shutdownCalled = true;
        this.shutdown();
      }
    };
    
    process.on('SIGTERM', handleShutdown);
    process.on('SIGINT', handleShutdown);
    process.on('SIGHUP', handleShutdown);
    
    // Handle Windows specific signals
    if (process.platform === 'win32') {
      process.on('SIGBREAK', handleShutdown);
    }
    
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
      console.log('Initializing bot...');
      try {
        await this.prisma.$connect();
        console.log('Database connected');
      } catch (dbError) {
        console.warn('Database connection failed, continuing without DB:', (dbError as Error).message);
        // Continue without database - the bot can still work for basic functions
      }
      
      console.log('Validating token...');

      // Update bot status (only if DB is available)
      try {
        await this.updateBotStatus('STARTING');
      } catch (error) {
        console.warn('Could not update bot status in DB');
      }

      // Login to Discord
      await this.client.login(process.env.BOT_TOKEN);
      
      console.log(`🤖 Child bot started for bot ID: ${this.botId}`);
    } catch (error) {
      console.error('❌ Failed to start bot:', error);
      try {
        await this.updateBotStatus('ERROR');
      } catch (dbError) {
        // Ignore DB errors during error reporting
      }
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
    let retries = 3;
    
    while (retries > 0) {
      try {
        if (!this.prisma) return;
        
        await this.prisma.bot.update({
          where: { id: this.botId },
          data: { 
            status: status as any,
            updatedAt: new Date()
          },
        });
        
        console.log(`✅ Bot status updated to ${status}`);
        return; // Success, exit
      } catch (error: any) {
        const isConcurrencyError = 
          error.code === 'P2034' || 
          (error.message && (
            error.message.includes('Record has changed') ||
            error.message.includes('ConnectorError') ||
            error.message.includes('code: 1020') ||
            error.message.includes('HY000')
          ));
          
        if (isConcurrencyError) {
          retries--;
          console.warn(`⚠️ Concurrency conflict updating status to ${status}, retrying... (${retries} retries left)`);
          
          if (retries > 0) {
            // Wait with exponential backoff
            const delay = (4 - retries) * 200 + Math.random() * 300;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            console.warn(`❌ Failed to update status to ${status} after all retries`);
            return;
          }
        } else {
          console.warn('Failed to update bot status (non-concurrency error):', error.message);
          return;
        }
      }
    }
  }

  private async shutdown() {
    console.log('🛑 Shutting down gracefully...');
    
    try {
      console.log('💾 Updating bot status to OFFLINE in database...');
      try {
        await this.updateBotStatus('OFFLINE');
      } catch (dbError) {
        console.warn('⚠️ Could not update database status:', dbError);
      }
      
      console.log('📊 Sending final metrics...');
      // Send any remaining metrics before shutdown
      if (this.metricsService) {
        try {
          await this.metricsService.forceSync();
          this.metricsService.destroy();
        } catch (metricsError) {
          console.warn('⚠️ Could not send final metrics:', metricsError);
        }
      }
      
      console.log('🎫 Shutting down ticket system...');
      // Shutdown ticket system
      if (this.ticketHandler) {
        this.ticketHandler.shutdown();
      }
      
      console.log('🔌 Destroying Discord client...');
      // Destroy the client which will close the WebSocket connection
      if (this.client) {
        this.client.destroy();
      }
      
      console.log('🗄️ Disconnecting from database...');
      try {
        await this.prisma.$disconnect();
      } catch (dbError) {
        console.warn('⚠️ Could not disconnect from database:', dbError);
      }
      
      console.log('✅ Graceful shutdown completed');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
    
    console.log('👋 Process exiting...');
    process.exit(0);
  }

  public async reloadConfig() {
    try {
      const newConfig = await this.configService.getConfig();
      this.config = newConfig as any;
      this.welcomeService.updateConfig(newConfig as any);
      
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