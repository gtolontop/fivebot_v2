import { PrismaClient, Bot, BotConfig } from '@prisma/client';

interface ConfigUpdateData {
  welcomeEnabled?: boolean;
  welcomeChannelId?: string;
  welcomeEmbedJson?: any;
  welcomeLogoUrl?: string;
  moderationEnabled?: boolean;
  autoRoleEnabled?: boolean;
  autoRoleId?: string;
  loggingChannelId?: string;
  customCommands?: any;
}

export class ConfigService {
  public prisma: PrismaClient;
  private botId: string;
  private cachedConfig: BotConfig | null = null;
  private lastConfigUpdate: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(prisma: PrismaClient, botId: string) {
    this.prisma = prisma;
    this.botId = botId;
  }

  async getBot(): Promise<Bot | null> {
    try {
      return await this.prisma.bot.findUnique({
        where: { id: this.botId },
        include: {
          owner: {
            select: {
              id: true,
              discordId: true,
              username: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('Error fetching bot:', error);
      return null;
    }
  }

  async getConfig(): Promise<BotConfig> {
    try {
      // Check if we have a cached config that's still valid
      const now = Date.now();
      if (this.cachedConfig && (now - this.lastConfigUpdate) < this.CACHE_TTL) {
        return this.cachedConfig;
      }

      // Fetch fresh config from database
      let config = await this.prisma.botConfig.findUnique({
        where: { botId: this.botId },
      });

      // Create default config if it doesn't exist
      if (!config) {
        config = await this.prisma.botConfig.create({
          data: {
            botId: this.botId,
            welcomeEnabled: false,
            moderationEnabled: false,
            autoRoleEnabled: false,
          },
        });
      }

      // Parse JSON fields if they are strings
      const parsedConfig = { ...config } as any;
      
      if ((parsedConfig as any).embedV2Commands && typeof (parsedConfig as any).embedV2Commands === 'string') {
        try {
          parsedConfig.embedV2Commands = JSON.parse((parsedConfig as any).embedV2Commands);
        } catch (e) {
          console.error('Failed to parse embedV2Commands:', e);
          parsedConfig.embedV2Commands = null;
        }
      }
      
      if ((parsedConfig as any).statusRotation && typeof (parsedConfig as any).statusRotation === 'string') {
        try {
          parsedConfig.statusRotation = JSON.parse((parsedConfig as any).statusRotation);
        } catch (e) {
          console.error('Failed to parse statusRotation:', e);
          parsedConfig.statusRotation = null;
        }
      }
      
      if ((parsedConfig as any).ticketData && typeof (parsedConfig as any).ticketData === 'string') {
        try {
          parsedConfig.ticketData = JSON.parse((parsedConfig as any).ticketData);
        } catch (e) {
          console.error('Failed to parse ticketData:', e);
          parsedConfig.ticketData = null;
        }
      }
      
      // Update cache
      this.cachedConfig = parsedConfig as any;
      this.lastConfigUpdate = now;

      return this.cachedConfig!;
    } catch (error) {
      console.error('Error fetching config:', error);
      
      // Return default config on error
      return {
        id: 'default',
        botId: this.botId,
        welcomeEnabled: false,
        welcomeChannelId: null,
        welcomeEmbedJson: null,
        welcomeLogoUrl: null,
        moderationEnabled: false,
        autoRoleEnabled: false,
        autoRoleId: null,
        autoRoleIds: null,
        loggingChannelId: null,
        customCommands: null,
        ticketEnabled: false,
        ticketCategoryId: null,
        ticketStaffRoleId: null,
        ticketTranscriptChannelId: null,
        ticketData: null,
        statusRotation: null,
        embedV2Commands: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
    }
  }

  async updateConfig(data: ConfigUpdateData): Promise<BotConfig> {
    try {
      const updatedConfig = await this.prisma.botConfig.update({
        where: { botId: this.botId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      // Invalidate cache
      this.cachedConfig = updatedConfig;
      this.lastConfigUpdate = Date.now();

      // Log the configuration change
      await this.prisma.jobLog.create({
        data: {
          botId: this.botId,
          jobId: `config-update-${Date.now()}`,
          jobType: 'CONFIG_UPDATE',
          status: 'COMPLETED',
          message: 'Bot configuration updated',
          metadata: data as any,
        },
      });

      console.log('✅ Config updated:', data);
      return updatedConfig;
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  }

  async reloadConfig(): Promise<BotConfig> {
    // Force cache invalidation
    this.cachedConfig = null;
    this.lastConfigUpdate = 0;
    
    return await this.getConfig();
  }

  async getWelcomeConfig(): Promise<{
    enabled: boolean;
    channelId?: string;
    embedJson?: any;
    logoUrl?: string;
  }> {
    const config = await this.getConfig();
    
    return {
      enabled: config.welcomeEnabled,
      channelId: config.welcomeChannelId || undefined,
      embedJson: config.welcomeEmbedJson,
      logoUrl: config.welcomeLogoUrl || undefined,
    };
  }

  async getModerationConfig(): Promise<{
    enabled: boolean;
    loggingChannelId?: string;
  }> {
    const config = await this.getConfig();
    
    return {
      enabled: config.moderationEnabled,
      loggingChannelId: config.loggingChannelId || undefined,
    };
  }

  async getAutoRoleConfig(): Promise<{
    enabled: boolean;
    roleId?: string;
  }> {
    const config = await this.getConfig();

    return {
      enabled: config.autoRoleEnabled,
      roleId: config.autoRoleId || undefined,
    };
  }
}

/**
 * Get module-specific configuration
 * This is a standalone function that can be used in commands
 * Uses a singleton PrismaClient to avoid "too many connections" errors
 */
export async function getModuleConfig(guildId: string, moduleSlug: string): Promise<any> {
  const { getPrismaClient } = await import('./prisma-singleton.service');
  const prisma = getPrismaClient();

  try {
    // Get bot ID from environment (each bot instance has its own BOT_ID)
    const botId = process.env.BOT_ID;
    if (!botId) {
      throw new Error('BOT_ID environment variable is not set');
    }

    // Find the module configuration for this bot
    const botModule = await prisma.botModule.findFirst({
      where: {
        botId: botId,
        module: {
          slug: moduleSlug,
        },
        enabled: true,
      },
      include: {
        module: true,
      },
    });

    if (!botModule) {
      return null;
    }

    // Parse the config JSON
    let config = {};
    if (botModule.config) {
      try {
        config = typeof botModule.config === 'string'
          ? JSON.parse(botModule.config)
          : botModule.config;
      } catch (e) {
        console.error(`Failed to parse config for module ${moduleSlug}:`, e);
        return null;
      }
    }

    return config;
  } catch (error) {
    console.error(`Error fetching module config for ${moduleSlug}:`, error);
    return null;
  }
  // NOTE: No prisma.$disconnect() here since we're using a singleton
}