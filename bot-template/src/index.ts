import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { ready } from './events/ready';
import { interactionCreate } from './events/interactionCreate';
import { guildMemberAdd } from './events/guildMemberAdd';
import { guildMemberRemove } from './events/guildMemberRemove';
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
import { ModuleLoaderService } from './services/module-loader.service';

dotenv.config();

interface BotConfig {
  welcomeEnabled: boolean;
  welcomeChannelId?: string;
  welcomeEmbedJson?: string;
  welcomeLogoUrl?: string;
  moderationEnabled: boolean;
  autoRoleEnabled: boolean;
  autoRoleId?: string;
  autoRoleIds?: string;
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
  private moduleLoader?: ModuleLoaderService;

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
        autoRoleIds: config.autoRoleIds,
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

      // Debug log for auto-role configuration
      /*if (finalConfig.autoRoleEnabled) {
        console.log(`[Auto-Role] Configuration loaded - Enabled: ${finalConfig.autoRoleEnabled}`);
        console.log(`[Auto-Role] autoRoleId: ${finalConfig.autoRoleId || 'not set'}`);
        console.log(`[Auto-Role] autoRoleIds: ${finalConfig.autoRoleIds || 'not set'}`);
      }*/

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

        // Force flush stdout before continuing
        await new Promise(resolve => process.stdout.write('Starting modules...\n', resolve));
        await new Promise(resolve => setTimeout(resolve, 50));

        // Load enabled modules from database
        this.moduleLoader = new ModuleLoaderService(this.prisma, this.botId);
        await this.moduleLoader.loadModules();

        // Display loaded modules
        const enabledModules = this.moduleLoader.getEnabledModules();
        for (let i = 0; i < enabledModules.length; i++) {
          const module = enabledModules[i];
          const isLast = i === enabledModules.length - 1;
          const prefix = isLast ? '└─' : '├─';
          const output = `${prefix} ${module.name} module ready\n`;
          await new Promise<void>(resolve => {
            process.stdout.write(output, () => resolve());
          });
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Initialize command service
        try {
          this.commandService = new CommandService(this.client, this.prisma, this.botId);
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
        }

        // Start command service
        if (this.commandService) {
          try {
            this.commandService.start();
          } catch (error) {
            console.error('⚠️ Failed to start command module:', error);
          }
        }

        // Initialize metrics service after bot is ready
        try {
          this.metricsService = new MetricsService(this.client, this.prisma, this.botId);
        } catch (error) {
          console.error('⚠️ Failed to initialize metrics service:', error);
        }

        // Start status rotation module if enabled
        if (this.moduleLoader?.isModuleEnabled('status-rotation')) {
          try {
            const statusConfig = this.moduleLoader.getModuleConfig('status-rotation');
            this.statusService = new StatusService(this.client, statusConfig);
            this.statusService.start();
          } catch (error) {
            console.error('⚠️ Failed to start status rotation:', error);
          }
        }

        await new Promise(resolve => process.stdout.write('✅ Bot fully operational\n', resolve));
        await new Promise(resolve => setTimeout(resolve, 50));
        //console.log(`⏱️  Process uptime: ${Math.floor(process.uptime())}s`);
      } catch (error) {
        console.error('❌ Error in ready event:', error);
        // Don't exit - try to keep running
      }
    });
    
    this.client.on('guildMemberAdd', async (member) => {
      // Reload config from database to get latest settings
      const freshConfig = await this.configService!.getConfig();
      await guildMemberAdd(member, this.welcomeService!, freshConfig as any);
    });
    
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
    
    // Handle graceful shutdown signals
    let isShuttingDown = false;

    const handleShutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      await this.shutdown();
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

    // On Windows, process might be killed before SIGTERM is handled
    // Use beforeExit as a fallback
    process.on('beforeExit', async () => {
      if (!isShuttingDown) {
        isShuttingDown = true;
        process.stdout.write('\x1Bc'); // Clear screen
        process.stdout.write('Server marked as offline\n');

        try {
          await this.prisma.bot.update({
            where: { id: this.botId },
            data: { status: 'OFFLINE' }
          }).catch(() => {});
          await this.prisma.$disconnect().catch(() => {});
        } catch (e) {}
      }
    });
  }

  private async shutdown() {
    try {
      // Clear console and show message synchronously
      process.stdout.write('\x1Bc'); // Clear screen
      process.stdout.write('Server marked as offline\n');

      // Update bot status to offline
      await this.prisma.bot.update({
        where: { id: this.botId },
        data: { status: 'OFFLINE' }
      }).catch(() => {}); // Ignore errors

      // Notify frontend
      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
        await fetch(`${backendUrl}/events/bot-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botId: this.botId, status: 'OFFLINE' }),
        });
      } catch (err) {
        // Ignore
      }

      // Disconnect from Discord
      this.client.destroy();

      // Close database connection
      await this.prisma.$disconnect().catch(() => {});

      process.exit(0);
    } catch (error) {
      process.stdout.write('\x1Bc'); // Clear screen
      process.stdout.write('Server marked as offline\n');
      process.exit(1);
    }
  }

  public async start() {
    try {
      // Force synchronous output for consistent ordering with small delays
      await new Promise(resolve => process.stdout.write('Initializing bot...\n', resolve));
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay to ensure order
      await new Promise(resolve => process.stdout.write('├─ Validating token...\n', resolve));
      await new Promise(resolve => setTimeout(resolve, 50));

      // Validate BOT_TOKEN exists
      const token = process.env.BOT_TOKEN;
      if (!token) {
        throw new Error('BOT_TOKEN environment variable is not set');
      }

      // Basic token format validation (Discord tokens should start with certain prefixes)
      if (token.length < 50) {
        throw new Error('Invalid token format: token too short');
      }

      // Connect to database
      await this.prisma.$connect();
      await new Promise(resolve => process.stdout.write('├─ Database connected\n', resolve));
      await new Promise(resolve => setTimeout(resolve, 50));

      // Update bot status
      await this.prisma.bot.update({
        where: { id: this.botId },
        data: { status: 'STARTING' }
      });
      await new Promise(resolve => process.stdout.write('└─ Configuration loaded\n', resolve));
      await new Promise(resolve => setTimeout(resolve, 50));

      // Login to Discord
      await this.client.login(token);
      //console.log(`Bot started for bot ID: ${this.botId}`);

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