import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Bot, BotStatus, BotConfig } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { DiscordService } from '../common/discord/discord.service';
import { QueueService } from '../queue/queue.service';
import { UsersService } from '../users/users.service';

interface CreateBotDto {
  name: string;
  token: string;
  prefix?: string;
}

interface UpdateBotConfigDto {
  welcomeEnabled?: boolean;
  welcomeChannelId?: string;
  welcomeEmbedJson?: any;
  welcomeLogoUrl?: string;
  welcomeThumbnailUrl?: string;
  moderationEnabled?: boolean;
  autoRoleEnabled?: boolean;
  autoRoleId?: string;
  loggingChannelId?: string;
  customCommands?: any;
}

@Injectable()
export class BotsService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private discordService: DiscordService,
    public queueService: QueueService, // Make public for monitor service access
    private usersService: UsersService,
  ) {}

  async create(ownerId: string, data: CreateBotDto): Promise<Bot> {
    console.log('=== Début création bot backend ===');
    console.log('Owner ID:', ownerId);
    console.log('Bot data:', { name: data.name, tokenLength: data.token?.length });

    // Check if user already has a bot with the same token
    console.log('Vérification des tokens dupliqués...');
    const encryptedTokenToCheck = this.encryptionService.encrypt(data.token);
    const existingBotWithToken = await this.prisma.bot.findFirst({
      where: { 
        ownerId,
        tokenEncrypted: encryptedTokenToCheck,
        isActive: true
      },
    });
    
    if (existingBotWithToken) {
      console.log('Token déjà utilisé, arrêt');
      throw new BadRequestException('You already have a bot with this token');
    }

    // Validate bot token with Discord API
    console.log('Validation du token Discord...');
    const tokenValidation = await this.discordService.validateBotToken(data.token);
    console.log('Résultat validation:', { isValid: tokenValidation.isValid, error: tokenValidation.error });
    
    if (!tokenValidation.isValid) {
      console.log('Token invalide, arrêt');
      throw new BadRequestException(tokenValidation.error || 'Invalid bot token');
    }

    // Check if user has enough credits
    const creditCost = parseInt(process.env.CREDIT_PER_BOT) || 10;
    const user = await this.usersService.findById(ownerId);
    
    if (!user || user.credits < creditCost) {
      throw new BadRequestException('Insufficient credits');
    }

    // Check user's bot limit
    const maxBots = parseInt(process.env.MAX_BOTS_PER_USER) || 5;
    const userBotCount = await this.prisma.bot.count({
      where: { ownerId, isActive: true },
    });

    if (userBotCount >= maxBots) {
      throw new BadRequestException(`Maximum of ${maxBots} bots per user`);
    }

    // Encrypt the token
    const encryptedToken = this.encryptionService.encrypt(data.token);

    // Create bot record
    const bot = await this.prisma.bot.create({
      data: {
        ownerId,
        name: data.name,
        tokenEncrypted: encryptedToken,
        clientId: tokenValidation.application?.id,
        prefix: data.prefix || '!',
        status: BotStatus.OFFLINE,
      },
      include: {
        config: true,
        owner: {
          select: {
            id: true,
            username: true,
            discordId: true,
          },
        },
      },
    });

    // Create default config
    await this.prisma.botConfig.create({
      data: {
        botId: bot.id,
        welcomeEnabled: false,
        moderationEnabled: false,
        autoRoleEnabled: false,
      },
    });

    // Spend user credits
    console.log('Déduction des crédits...');
    await this.usersService.spendCredits(ownerId, creditCost, `Created bot: ${data.name}`);
    console.log('Crédits déduits');

    // Queue bot creation job (non-blocking)
    console.log('Ajout du job en queue...');
    try {
      await this.queueService.addJob('create-bot', {
        botId: bot.id,
        ownerId,
      });
      console.log('Job queued successfully');
    } catch (error) {
      console.error('Failed to queue job (non-critical):', error);
      // Continue anyway, the job queue is not critical for bot creation
    }

    // Log the action
    console.log('Création du log d\'audit...');
    await this.prisma.auditLog.create({
      data: {
        userId: ownerId,
        botId: bot.id,
        action: 'BOT_CREATED',
        resource: 'bot',
        metadata: {
          botName: data.name,
          clientId: bot.clientId,
        },
      },
    });
    console.log('Log d\'audit créé');

    console.log('=== Bot créé avec succès ===');
    return bot;
  }

  async findAll(ownerId: string): Promise<Bot[]> {
    const bots = await this.prisma.bot.findMany({
      where: { 
        ownerId
        // No need for isActive filter since bots are hard deleted
      },
      include: {
        config: true,
        hosts: {
          where: { status: 'UP' },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            jobLogs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Auto-sync any bots that might be out of sync (but don't await to avoid slowing the response)
    this.autoSyncBotsInBackground(bots);

    return bots;
  }

  // Background sync without blocking the main request
  private async autoSyncBotsInBackground(bots: any[]): Promise<void> {
    setImmediate(async () => {
      for (const bot of bots) {
        try {
          // Only sync if status seems potentially wrong
          if (bot.status === 'ONLINE' || bot.status === 'ERROR') {
            const isProcessRunning = this.queueService.getRunningBots?.().includes(bot.id) ?? false;
            
            // If marked ONLINE but no process, quick sync
            if (bot.status === 'ONLINE' && !isProcessRunning) {
              console.log(`🔄 Auto-syncing bot ${bot.id} (${bot.name}) - marked ONLINE but no process`);
              await this.forceSyncBotStatus(bot.id);
            }
          }
        } catch (error) {
          // Silently fail background sync to not affect user experience
          console.error(`❌ Background sync failed for bot ${bot.id}:`, error.message);
        }
      }
    });
  }

  async findOne(id: string, ownerId?: string): Promise<Bot | null> {
    const where: any = { id };
    if (ownerId) {
      where.ownerId = ownerId;
    }
    // No need for isActive filter since bots are hard deleted

    return this.prisma.bot.findUnique({
      where,
      include: {
        config: true,
        owner: {
          select: {
            id: true,
            username: true,
            discordId: true,
          },
        },
        hosts: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        jobLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
  }

  async updateConfig(botId: string, ownerId: string, data: UpdateBotConfigDto): Promise<BotConfig> {
    // Verify ownership
    const bot = await this.findOne(botId, ownerId);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    const config = await this.prisma.botConfig.update({
      where: { botId },
      data,
    });

    // Log the action
    await this.prisma.auditLog.create({
      data: {
        userId: ownerId,
        botId,
        action: 'BOT_CONFIG_UPDATED',
        resource: 'bot_config',
        metadata: data as any,
      },
    });

    // If bot is running, queue config update
    if (bot.status === BotStatus.ONLINE) {
      await this.queueService.addJob('update-bot-config', {
        botId,
        config: data,
      });
    }

    return config;
  }

  async start(botId: string, ownerId: string): Promise<Bot> {
    const bot = await this.findOne(botId, ownerId);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // Force sync status before starting to ensure clean state
    console.log(`🔄 Pre-start sync for bot ${botId}`);
    await this.forceSyncBotStatus(botId);

    // Check if bot is actually running, not just marked as ONLINE
    if (bot.status === BotStatus.ONLINE) {
      // Verify if the bot process is actually running
      const isActuallyRunning = this.queueService['runningBots']?.has(botId);
      
      if (isActuallyRunning) {
        throw new BadRequestException('Bot is already running');
      } else {
        // Bot is marked as ONLINE but process is not running - allow restart
        console.log(`⚠️ Bot ${bot.name} is marked as ONLINE but process not found - allowing restart`);
      }
    }
    
    // Don't allow starting if already in STARTING state
    if (bot.status === BotStatus.STARTING) {
      throw new BadRequestException('Bot is already starting');
    }

    await this.prisma.bot.update({
      where: { id: botId },
      data: { 
        status: BotStatus.STARTING,
        shouldAutoRestart: true, // Enable auto-restart when user manually starts
      },
    });

    // Create detailed job log for bot start
    await this.prisma.jobLog.create({
      data: {
        botId,
        jobId: `start-${Date.now()}`,
        jobType: 'START_BOT',
        status: 'PROCESSING',
        message: `🚀 Starting bot ${bot.name}...`,
        metadata: {
          requestedBy: ownerId,
          timestamp: new Date().toISOString()
        }
      }
    });

    await this.queueService.addJob('start-bot', { botId });

    await this.prisma.auditLog.create({
      data: {
        userId: ownerId,
        botId,
        action: 'BOT_STARTED',
        resource: 'bot',
      },
    });

    return this.findOne(botId, ownerId);
  }

  async stop(botId: string, ownerId: string): Promise<Bot> {
    const bot = await this.findOne(botId, ownerId);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // Force sync status before stopping to ensure accurate state
    console.log(`🔄 Pre-stop sync for bot ${botId}`);
    const currentStatus = await this.forceSyncBotStatus(botId);

    if (currentStatus === BotStatus.OFFLINE) {
      console.log(`⚠️ Bot ${botId} was already OFFLINE after sync - no action needed`);
      return bot;
    }

    await this.prisma.bot.update({
      where: { id: botId },
      data: { 
        status: BotStatus.STOPPING,
        shouldAutoRestart: false, // Disable auto-restart when user manually stops
      },
    });

    await this.queueService.addJob('stop-bot', { botId });

    await this.prisma.auditLog.create({
      data: {
        userId: ownerId,
        botId,
        action: 'BOT_STOPPED',
        resource: 'bot',
      },
    });

    return this.findOne(botId, ownerId);
  }

  async delete(botId: string, ownerId: string): Promise<void> {
    const bot = await this.findOne(botId, ownerId);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // Stop bot if running
    if (bot.status === BotStatus.ONLINE) {
      await this.queueService.addJob('stop-bot', { botId });
    }

    // Queue deletion job
    await this.queueService.addJob('delete-bot', { botId });

    // Log the deletion before deleting
    await this.prisma.auditLog.create({
      data: {
        userId: ownerId,
        botId,
        action: 'BOT_DELETED',
        resource: 'bot',
      },
    });

    // Hard delete the bot and all related data
    await this.prisma.bot.delete({
      where: { id: botId },
    });
  }

  async generateInviteLink(botId: string, ownerId: string): Promise<{ inviteUrl: string }> {
    const bot = await this.findOne(botId, ownerId);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    if (!bot.clientId) {
      throw new BadRequestException('Bot client ID not available');
    }

    const inviteUrl = this.discordService.generateInviteUrl(bot.clientId);
    
    return { inviteUrl };
  }

  async getDecryptedToken(botId: string): Promise<string> {
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
      select: { tokenEncrypted: true },
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    return this.encryptionService.decrypt(bot.tokenEncrypted);
  }

  async updateStatus(botId: string, status: BotStatus, metadata?: any): Promise<void> {
    let retries = 8; // Increase retries significantly
    
    while (retries > 0) {
      try {
        // First, get the current bot to ensure it exists and get its current state
        const currentBot = await this.prisma.bot.findUnique({
          where: { id: botId },
          select: { id: true, status: true, updatedAt: true }
        });

        if (!currentBot) {
          console.warn(`⚠️ Bot ${botId} not found, skipping status update to ${status}`);
          return;
        }

        // Only update if status has actually changed to reduce unnecessary updates
        if (currentBot.status === status) {
          return;
        }

        // Use upsert with optimistic locking based on updatedAt
        await this.prisma.bot.update({
          where: { 
            id: botId,
            updatedAt: currentBot.updatedAt // Optimistic locking
          },
          data: { 
            status,
            updatedAt: new Date(), // Force timestamp update
            ...(metadata || {})
          },
        });
        
        // Log successful status changes
        console.log(`✅ Successfully updated bot ${botId} status: ${currentBot.status} → ${status}`);
        return; // Success, exit function
        
      } catch (error: any) {
        const isConcurrencyError = 
          error.code === 'P2034' || // Prisma concurrency error
          error.code === 'P2025' || // Record not found (might be due to concurrent deletion)
          (error.message && (
            error.message.includes('Record has changed') ||
            error.message.includes('ConnectorError') ||
            error.message.includes('code: 1020') ||
            error.message.includes('HY000') ||
            error.message.includes('Record to update not found')
          ));
          
        if (isConcurrencyError) {
          retries--;
          console.log(`⚠️ Concurrency conflict updating bot ${botId} status to ${status}, retrying... (${retries} retries left)`);
          
          if (retries > 0) {
            // More aggressive exponential backoff with jitter
            const baseDelay = Math.min(2000, (9 - retries) * 250);
            const jitter = Math.random() * 500;
            const delay = baseDelay + jitter;
            
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            console.error(`❌ Failed to update bot ${botId} status to ${status} after all retries due to concurrency conflicts`);
            return; // Give up gracefully
          }
        } else {
          // Non-concurrency error, log and give up immediately
          console.error(`❌ Failed to update bot ${botId} status to ${status} due to non-concurrency error:`, error.message || error);
          return;
        }
      }
    }

    // Log all significant status changes with detailed messages
    const shouldLog = ['ONLINE', 'ERROR', 'OFFLINE', 'STARTING'].includes(status);
    
    if (shouldLog) {
      try {
        let message = '';
        let logStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' = 'COMPLETED';
        
        switch (status) {
          case 'ONLINE':
            message = `✅ Bot is now online and ready to serve commands`;
            break;
          case 'ERROR':
            message = `❌ Bot encountered an error and stopped working`;
            logStatus = 'FAILED';
            break;
          case 'OFFLINE':
            message = `⏹️ Bot has been stopped and is now offline`;
            break;
          case 'STARTING':
            message = `🔄 Bot is starting up...`;
            logStatus = 'PROCESSING';
            break;
          default:
            message = `📊 Bot status changed to ${status}`;
        }
        
        await this.prisma.jobLog.create({
          data: {
            botId,
            jobId: `status-${Date.now()}`,
            jobType: 'STATUS_UPDATE',
            status: logStatus,
            message,
            metadata: {
              ...metadata,
              newStatus: status,
              timestamp: new Date().toISOString()
            },
          },
        });
      } catch (error) {
        console.error('Failed to create status log (non-critical):', error);
      }
    }
  }

  async updateStatusSafe(botId: string, status: BotStatus, respectUserIntent: boolean = true): Promise<boolean> {
    try {
      if (respectUserIntent) {
        // Check if bot is manually stopped with retry logic
        let bot = null;
        let retries = 3;
        
        while (retries > 0 && !bot) {
          try {
            bot = await this.prisma.bot.findUnique({
              where: { id: botId },
              select: { shouldAutoRestart: true, status: true, name: true }
            });
            break;
          } catch (error: any) {
            if (error.message?.includes('Record has changed') || error.message?.includes('ConnectorError')) {
              retries--;
              await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
              continue;
            }
            throw error;
          }
        }

        if (!bot) {
          console.error(`Bot ${botId} not found for status update after retries`);
          return false;
        }

        // Don't override status if bot is manually stopped (shouldAutoRestart = false)
        if (bot.shouldAutoRestart === false && status === 'ONLINE') {
          console.log(`🚫 Bot ${bot.name} is manually stopped - not setting to ONLINE`);
          return false;
        }

        // If bot is manually stopped and Discord shows offline, update to OFFLINE
        if (bot.shouldAutoRestart === false && status === 'OFFLINE') {
          await this.updateStatus(botId, 'OFFLINE');
          console.log(`✅ Confirmed bot ${bot.name} is OFFLINE (manual stop)`);
          return true;
        }
      }

      // Normal update
      await this.updateStatus(botId, status);
      return true;
    } catch (error) {
      console.error(`❌ Error in updateStatusSafe for bot ${botId}:`, error);
      return false;
    }
  }

  async getDiscordGuilds(botId: string, ownerId: string): Promise<any[]> {
    const bot = await this.findOne(botId, ownerId);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    try {
      const decryptedToken = this.encryptionService.decrypt(bot.tokenEncrypted);
      return await this.discordService.getBotGuilds(decryptedToken);
    } catch (error) {
      console.error('Error fetching Discord guilds:', error);
      throw new BadRequestException('Failed to fetch Discord guilds');
    }
  }

  async getGuildChannels(botId: string, guildId: string, ownerId: string): Promise<any[]> {
    const bot = await this.findOne(botId, ownerId);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    try {
      const decryptedToken = this.encryptionService.decrypt(bot.tokenEncrypted);
      return await this.discordService.getGuildChannels(decryptedToken, guildId);
    } catch (error) {
      console.error('Error fetching guild channels:', error);
      throw new BadRequestException('Failed to fetch guild channels');
    }
  }

  async getGuildRoles(botId: string, guildId: string, ownerId: string): Promise<any[]> {
    const bot = await this.findOne(botId, ownerId);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    try {
      const decryptedToken = this.encryptionService.decrypt(bot.tokenEncrypted);
      return await this.discordService.getGuildRoles(decryptedToken, guildId);
    } catch (error) {
      console.error('Error fetching guild roles:', error);
      throw new BadRequestException('Failed to fetch guild roles');
    }
  }

  // Method to check if bot is actually connected to Discord
  async checkDiscordConnectionStatus(botId: string): Promise<{ isConnected: boolean; lastSeen?: Date }> {
    try {
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId }
      });

      if (!bot) {
        return { isConnected: false };
      }

      const decryptedToken = this.encryptionService.decrypt(bot.tokenEncrypted);
      
      // Try to fetch bot's own user info - this will fail if not connected
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        method: 'GET',
        headers: {
          'Authorization': `Bot ${decryptedToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // If we can fetch the bot info, it's connected
        return { isConnected: true, lastSeen: new Date() };
      } else {
        // If fetch fails, bot is not connected
        return { isConnected: false };
      }
    } catch (error) {
      console.error(`Error checking Discord connection for bot ${botId}:`, error);
      return { isConnected: false };
    }
  }

  // Force sync bot status with actual Discord state
  async forceSyncBotStatus(botId: string): Promise<BotStatus> {
    try {
      const connectionStatus = await this.checkDiscordConnectionStatus(botId);
      const isProcessRunning = this.queueService.getRunningBots?.().includes(botId) ?? false;
      
      let newStatus: BotStatus;
      
      if (connectionStatus.isConnected && isProcessRunning) {
        newStatus = BotStatus.ONLINE;
      } else if (isProcessRunning && !connectionStatus.isConnected) {
        newStatus = BotStatus.ERROR;
      } else {
        newStatus = BotStatus.OFFLINE;
      }

      // Force update the status in database
      await this.prisma.bot.update({
        where: { id: botId },
        data: { 
          status: newStatus,
          updatedAt: new Date()
        }
      });

      console.log(`🔄 Force synced bot ${botId} status to ${newStatus} (Discord: ${connectionStatus.isConnected}, Process: ${isProcessRunning})`);
      
      return newStatus;
    } catch (error) {
      console.error(`Error force syncing bot ${botId} status:`, error);
      // If we can't determine, mark as error
      await this.prisma.bot.update({
        where: { id: botId },
        data: { 
          status: BotStatus.ERROR,
          updatedAt: new Date()
        }
      });
      return BotStatus.ERROR;
    }
  }
}