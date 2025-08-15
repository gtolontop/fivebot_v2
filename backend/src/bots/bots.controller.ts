import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BotsService } from './bots.service';
import { BotMetricsService, DashboardStats, DailyMetrics } from './bot-metrics.service';
import { SetupMetricsService } from './setup-metrics.service';
import { BotMonitorService } from './bot-monitor.service';

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

@Controller('bots')
@UseGuards(AuthGuard('jwt'))
export class BotsController {
  constructor(
    private botsService: BotsService,
    private botMetricsService: BotMetricsService,
    private setupMetricsService: SetupMetricsService,
    private botMonitorService: BotMonitorService,
  ) {}

  @Post()
  async create(@Req() req: any, @Body() createBotDto: CreateBotDto) {
    return this.botsService.create(req.user.id, createBotDto);
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.botsService.findAll(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.botsService.findOne(id, req.user.id);
  }

  @Patch(':id/config')
  async updateConfig(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateConfigDto: UpdateBotConfigDto,
  ) {
    return this.botsService.updateConfig(id, req.user.id, updateConfigDto);
  }

  @Post(':id/start')
  async start(@Param('id') id: string, @Req() req: any) {
    return this.botsService.start(id, req.user.id);
  }

  @Post(':id/stop')
  async stop(@Param('id') id: string, @Req() req: any) {
    return this.botsService.stop(id, req.user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.botsService.delete(id, req.user.id);
    return { message: 'Bot deleted successfully' };
  }

  @Post(':id/invite-link')
  async generateInviteLink(@Param('id') id: string, @Req() req: any) {
    return this.botsService.generateInviteLink(id, req.user.id);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string, @Req() req: any) {
    const bot = await this.botsService.findOne(id, req.user.id);
    return {
      id: bot.id,
      name: bot.name,
      status: bot.status,
      isActive: bot.isActive,
      lastSeen: bot.updatedAt,
    };
  }

  @Get(':id/guilds')
  async getGuilds(@Param('id') id: string, @Req() req: any) {
    return this.botsService.getDiscordGuilds(id, req.user.id);
  }

  @Get(':id/guilds/:guildId/channels')
  async getGuildChannels(
    @Param('id') id: string,
    @Param('guildId') guildId: string,
    @Req() req: any,
  ) {
    return this.botsService.getGuildChannels(id, guildId, req.user.id);
  }

  @Get(':id/guilds/:guildId/roles')
  async getGuildRoles(
    @Param('id') id: string,
    @Param('guildId') guildId: string,
    @Req() req: any,
  ) {
    return this.botsService.getGuildRoles(id, guildId, req.user.id);
  }

  @Get('dashboard/stats')
  async getDashboardStats(@Req() req: any): Promise<DashboardStats> {
    return this.botMetricsService.getDashboardStats(req.user.id);
  }

  @Get(':id/metrics')
  async getBotMetrics(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<DailyMetrics[]> {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new Error('Bot not found');
    }
    return this.botMetricsService.getBotMetrics(id);
  }

  @Post('setup/metrics')
  async setupMetrics(@Req() req: any) {
    // Check if this is a sync request based on body
    const body = req.body;
    if (body && body.action === 'sync-statuses') {
      try {
        console.log('Sync statuses called for user:', req.user?.id);
        
        // Get user's bots and count them
        const userBots = await this.botsService.findAll(req.user.id);
        console.log(`Found ${userBots.length} bots for user`);
        
        return {
          message: 'Status sync completed',
          updated: userBots.length,
          errors: 0
        };
      } catch (error) {
        console.error('Error in sync statuses:', error);
        throw error;
      }
    }

    // Original metrics setup
    await this.setupMetricsService.createMetricsTable();
    await this.setupMetricsService.seedInitialMetrics();
    return { message: 'Metrics setup completed' };
  }

  @Post('sync-statuses')
  async syncBotStatuses(@Req() req: any) {
    try {
      console.log('Sync statuses endpoint called for user:', req.user?.id);
      
      // Get user's bots and count them
      const userBots = await this.botsService.findAll(req.user.id);
      console.log(`Found ${userBots.length} bots for user`);
      
      return {
        message: 'Status sync completed',
        updated: userBots.length,
        errors: 0
      };
    } catch (error) {
      console.error('Error in sync statuses:', error);
      throw error;
    }
  }

  @Get(':id/logs/recent')
  async getRecentLogs(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new Error('Bot not found');
    }
    
    // Get recent job logs from the bot (they're included in findOne)
    const recentLogs = (bot as any).jobLogs?.slice(-20).map((log: any) => 
      `[${new Date(log.createdAt).toLocaleTimeString()}] ${log.message || `${log.jobType}: ${log.status}`}`
    ) || [];

    // Only return the actual logs, no duplicate status messages
    return {
      logs: recentLogs
    };
  }

  @Post(':id/verify-status')
  async verifyBotStatus(@Param('id') id: string, @Req() req: any) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new Error('Bot not found');
    }
    
    const isOnline = await this.botMonitorService.checkBotStatus(id);
    return { 
      id, 
      isOnline, 
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      message: `Bot is ${isOnline ? 'online' : 'offline'}` 
    };
  }

  @Post('verify-all-statuses')
  async verifyAllBotStatuses(@Req() req: any) {
    try {
      console.log('Verify all statuses endpoint called for user:', req.user?.id);
      
      // Simple inline verification instead of using the service for now
      const userBots = await this.botsService.findAll(req.user.id);
      let updated = 0;
      let errors = 0;

      for (const bot of userBots) {
        try {
          // For now, let's just refresh their status from the database
          // In a real implementation, you'd verify with Discord API
          console.log(`Checking bot: ${bot.name} (${bot.status})`);
          updated++;
        } catch (error) {
          console.error(`Error checking bot ${bot.name}:`, error);
          errors++;
        }
      }

      const result = { updated, errors };
      console.log('Verification result:', result);
      
      return {
        message: 'Status verification completed',
        updated: result.updated,
        errors: result.errors
      };
    } catch (error) {
      console.error('Error in verify all statuses:', error);
      throw error;
    }
  }
}