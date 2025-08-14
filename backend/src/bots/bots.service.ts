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
    private queueService: QueueService,
    private usersService: UsersService,
  ) {}

  async create(ownerId: string, data: CreateBotDto): Promise<Bot> {
    console.log('=== Début création bot backend ===');
    console.log('Owner ID:', ownerId);
    console.log('Bot data:', { name: data.name, tokenLength: data.token?.length });

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
    return this.prisma.bot.findMany({
      where: { ownerId },
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
  }

  async findOne(id: string, ownerId?: string): Promise<Bot | null> {
    const where: any = { id };
    if (ownerId) {
      where.ownerId = ownerId;
    }

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

    if (bot.status === BotStatus.ONLINE) {
      throw new BadRequestException('Bot is already running');
    }

    await this.prisma.bot.update({
      where: { id: botId },
      data: { status: BotStatus.STARTING },
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

    if (bot.status === BotStatus.OFFLINE) {
      throw new BadRequestException('Bot is already stopped');
    }

    await this.prisma.bot.update({
      where: { id: botId },
      data: { status: BotStatus.STOPPING },
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

    // Mark as inactive
    await this.prisma.bot.update({
      where: { id: botId },
      data: { 
        isActive: false,
        status: BotStatus.OFFLINE,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: ownerId,
        botId,
        action: 'BOT_DELETED',
        resource: 'bot',
      },
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
    await this.prisma.bot.update({
      where: { id: botId },
      data: { status },
    });

    // Log status change
    await this.prisma.jobLog.create({
      data: {
        botId,
        jobId: `status-${Date.now()}`,
        jobType: 'STATUS_UPDATE',
        status: 'COMPLETED',
        message: `Bot status changed to ${status}`,
        metadata,
      },
    });
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
}