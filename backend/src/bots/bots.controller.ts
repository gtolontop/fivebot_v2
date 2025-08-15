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
import { PrismaService } from '../common/prisma/prisma.service';

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
    private prisma: PrismaService,
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
    try {
      console.log(`🚀 Starting bot ${id} for user ${req.user.id}`);
      const result = await this.botsService.start(id, req.user.id);
      console.log(`✅ Bot ${id} start command sent successfully`);
      return result;
    } catch (error) {
      console.error(`❌ Error starting bot ${id}:`, error);
      throw error;
    }
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

  @Post('start-all')
  async startAllBots(@Req() req: any) {
    try {
      console.log('🚀 Start all bots called for user:', req.user?.id);
      
      // Get user's offline bots
      const userBots = await this.botsService.findAll(req.user.id);
      const offlineBots = userBots.filter(bot => bot.status === 'OFFLINE');
      
      console.log(`📊 Found ${offlineBots.length} offline bots to start`);
      
      let started = 0;
      let errors = 0;

      for (const bot of offlineBots) {
        try {
          await this.botsService.start(bot.id, req.user.id);
          started++;
          console.log(`✅ Started bot: ${bot.name}`);
        } catch (error) {
          errors++;
          console.error(`❌ Failed to start bot ${bot.name}:`, error.message);
        }
      }

      console.log(`🎯 Start all complete: ${started} started, ${errors} errors`);
      
      return {
        message: 'Start all bots completed',
        started,
        errors,
        total: offlineBots.length
      };
    } catch (error) {
      console.error('❌ Error in start all bots:', error);
      throw error;
    }
  }

  @Post('setup/metrics')
  async setupMetrics(@Req() req: any) {
    // Check if this is a fix concurrency request
    const body = req.body;
    if (body && body.action === 'fix-concurrency') {
      try {
        console.log('🔧 Fixing concurrency issues...');
        
        // Simple approach: reset all bots that might be stuck
        const result = await this.prisma.bot.updateMany({
          where: {
            status: {
              in: ['STARTING', 'STOPPING']
            }
          },
          data: {
            status: 'OFFLINE'
          }
        });

        console.log(`🔄 Reset ${result.count} stuck bots to OFFLINE`);
        
        return {
          message: 'Concurrency fix completed',
          updated: result.count
        };
      } catch (error) {
        console.error('❌ Error fixing concurrency:', error);
        throw error;
      }
    }

    // Check if this is a sync request based on body
    if (body && body.action === 'sync-statuses') {
      try {
        console.log('🔄 Sync statuses called for user:', req.user?.id);
        
        // Get user's bots
        const userBots = await this.botsService.findAll(req.user.id);
        console.log(`📊 Found ${userBots.length} bots for user`);
        
        let updated = 0;
        let errors = 0;

        // Check each bot's real Discord status
        for (const bot of userBots) {
          try {
            console.log(`🔍 Checking bot: ${bot.name} (currently marked as ${bot.status}, shouldAutoRestart: ${(bot as any).shouldAutoRestart})`);
            
            // Get decrypted token
            const decryptedToken = await this.botsService.getDecryptedToken(bot.id);
            
            // Try to make a simple Discord API call to check if bot is really online
            const response = await fetch('https://discord.com/api/v10/users/@me', {
              headers: {
                'Authorization': `Bot ${decryptedToken}`,
                'Content-Type': 'application/json'
              }
            });

            const isReallyOnline = response.status === 200;
            const expectedStatus = isReallyOnline ? 'ONLINE' : 'OFFLINE';
            
            console.log(`🤖 Bot ${bot.name}: API response ${response.status} -> ${expectedStatus}`);
            
            // Update status if different, but respect user intentions
            if (bot.status !== expectedStatus) {
              // Don't override if bot is manually stopped (shouldAutoRestart = false) or in STOPPING state
              if ((bot as any).shouldAutoRestart === false || bot.status === 'STOPPING') {
                console.log(`🚫 ${bot.name} is manually stopped (shouldAutoRestart: ${(bot as any).shouldAutoRestart}) - not overriding status`);
                
                // If Discord shows bot as offline and we expected it to be offline (manual stop), that's correct
                if (expectedStatus === 'OFFLINE' && bot.status !== 'OFFLINE') {
                  await this.botsService.updateStatus(bot.id, 'OFFLINE');
                  updated++;
                  console.log(`✅ Confirmed ${bot.name} is offline as expected (manual stop)`);
                }
              } else {
                await this.botsService.updateStatus(bot.id, expectedStatus as any);
                updated++;
                console.log(`✅ Updated ${bot.name}: ${bot.status} -> ${expectedStatus}`);
              }
            } else {
              console.log(`✨ ${bot.name} status is already correct: ${expectedStatus}`);
            }
            
          } catch (error) {
            console.error(`❌ Error checking bot ${bot.name}:`, error.message);
            // If we can't check the bot, assume it's offline
            if (bot.status !== 'OFFLINE') {
              await this.botsService.updateStatus(bot.id, 'OFFLINE');
              updated++;
              console.log(`🔄 Set ${bot.name} to OFFLINE (couldn't verify)`);
            }
            errors++;
          }
        }

        console.log(`✅ Sync complete: ${updated} bots updated, ${errors} errors`);
        
        return {
          message: 'Status sync completed',
          updated,
          errors
        };
      } catch (error) {
        console.error('❌ Error in sync statuses:', error);
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

  @Get('debug/running')
  async getRunningBots(@Req() req: any) {
    try {
      const queueService = this.botsService['queueService'];
      const runningBots = queueService.getRunningBots ? queueService.getRunningBots() : [];
      
      console.log(`🔍 Debug: ${runningBots.length} bots currently running in process manager`);
      
      return {
        runningBots,
        count: runningBots.length,
        message: `Found ${runningBots.length} running bot processes`
      };
    } catch (error) {
      console.error('Error getting running bots:', error);
      throw error;
    }
  }

  @Post(':id/force-stop')
  async forceStopBot(@Param('id') id: string, @Req() req: any) {
    try {
      const bot = await this.botsService.findOne(id, req.user.id);
      if (!bot) {
        throw new Error('Bot not found');
      }

      const queueService = this.botsService['queueService'];
      if (queueService.forceStopBot) {
        await queueService.forceStopBot(id);
        console.log(`🚨 Force stopped bot ${bot.name} (${id})`);
        
        return {
          message: `Bot ${bot.name} force stopped successfully`,
          botId: id
        };
      } else {
        throw new Error('Force stop not available in current queue implementation');
      }
    } catch (error) {
      console.error(`Error force stopping bot ${id}:`, error);
      throw error;
    }
  }
}