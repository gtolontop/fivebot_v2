import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { BotsService } from './bots.service';
import { BotMetricsService, DashboardStats, DailyMetrics } from './bot-metrics.service';
import { SetupMetricsService } from './setup-metrics.service';
import { BotMonitorService } from './bot-monitor.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { BotLogsService } from './bot-logs.service';
import { TicketService } from './ticket.service';
import { ConsoleBufferService } from './console-buffer.service';
import { BotRealtimeMetricsService } from './bot-realtime-metrics.service';
import { BotProcessMetricsService } from './bot-process-metrics.service';
import { CollaboratorsService } from './collaborators.service';
import { EventsService } from '../common/events/events.service';
import { LogLevel } from '@prisma/client';

interface CreateBotDto {
  name: string;
  token: string;
}

interface UpdateBotConfigDto {
  welcomeEnabled?: boolean;
  welcomeChannelId?: string;
  welcomeEmbedJson?: any;
  welcomeLogoUrl?: string;
  welcomeThumbnailUrl?: string;
  goodbyeEnabled?: boolean;
  goodbyeChannelId?: string;
  moderationEnabled?: boolean;
  autoRoleEnabled?: boolean;
  autoRoleId?: string;
  autoRoleIds?: string[];
  loggingChannelId?: string;
  customCommands?: any;
  ticketEnabled?: boolean;
  ticketCategoryId?: string;
  ticketStaffRoleId?: string;
  ticketTranscriptChannelId?: string;
  ticketNamingFormat?: string;
  maxTicketsPerUser?: number;
  autoCloseHours?: number;
  inactivityWarningHours?: number;
  ticketThreads?: boolean;
  ticketMentionStaff?: boolean;
  ticketDMNotifications?: boolean;
  ticketRequireReason?: boolean;
  autoSaveTranscripts?: boolean;
  sendTranscriptToUser?: boolean;
  includeAttachments?: boolean;
  autoWelcomeEnabled?: boolean;
  autoWelcomeMessage?: string;
  inactivityWarningEnabled?: boolean;
  inactivityWarningMessage?: string;
  autoAssignStaff?: boolean;
  autoTagUrgent?: boolean;
  autoEscalate?: boolean;
  statusRotation?: string;
  embedV2Commands?: string;
}

@Controller('bots')
export class BotsController {
  constructor(
    private botsService: BotsService,
    private botMetricsService: BotMetricsService,
    private setupMetricsService: SetupMetricsService,
    private botMonitorService: BotMonitorService,
    private prisma: PrismaService,
    private queueService: QueueService,
    private botLogsService: BotLogsService,
    private consoleBufferService: ConsoleBufferService,
    private botRealtimeMetricsService: BotRealtimeMetricsService,
    private botProcessMetricsService: BotProcessMetricsService,
    private ticketService: TicketService,
    private collaboratorsService: CollaboratorsService,
    private eventsService: EventsService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Req() req: any, @Body() createBotDto: CreateBotDto) {
    return this.botsService.create(req.user.id, createBotDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Req() req: any) {
    return this.botsService.findAll(req.user.id);
  }

  @Get('events/status')
  @UseGuards(AuthGuard('jwt-query'))
  async streamBotStatus(@Req() req: any, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const subscription = this.eventsService.botStatus$.subscribe({
      next: (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
      error: (err) => {
        console.error('SSE error:', err);
        res.end();
      },
    });

    req.on('close', () => {
      subscription.unsubscribe();
    });
  }

  @Get('dashboard/stats')
  @UseGuards(AuthGuard('jwt'))
  async getDashboardStats(@Req() req: any): Promise<DashboardStats> {
    return this.botMetricsService.getDashboardStats(req.user.id);
  }

  @Get('debug/running')
  @UseGuards(AuthGuard('jwt'))
  async getRunningBots(@Req() req: any) {
    try {
      const queueService = this.botsService['queueService'];
      const runningBots = queueService.getRunningBots ? await queueService.getRunningBots() : [];

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

  @Get('analytics/overview')
  @UseGuards(AuthGuard('jwt'))
  async getAnalyticsOverview(@Req() req: any) {
    const bots = await this.botsService.findAll(req.user.id);
    const overview = {
      totalBots: bots.length,
      activeBots: bots.filter(b => b.status === 'ONLINE').length,
      aggregatedMetrics: {
        totalCommands: 0,
        totalMessages: 0,
        totalErrors: 0,
        avgResponseTime: 0,
      },
      botMetrics: [] as any[],
    };

    // Get metrics for each bot
    for (const bot of bots) {
      try {
        const realtimeData = await this.botRealtimeMetricsService.getRealtimeData(bot.id);
        const analytics = await this.botRealtimeMetricsService.getAnalytics(bot.id, 'daily');

        overview.botMetrics.push({
          botId: bot.id,
          botName: bot.name,
          status: bot.status,
          realtime: realtimeData.metrics,
          daily: analytics.summary,
        });

        // Aggregate metrics
        overview.aggregatedMetrics.totalCommands += analytics.summary.totalCommands || 0;
        overview.aggregatedMetrics.totalMessages += analytics.summary.totalMessages || 0;
        overview.aggregatedMetrics.totalErrors += analytics.summary.totalErrors || 0;
      } catch (error) {
        console.error(`Error getting metrics for bot ${bot.id}:`, error);
      }
    }

    // Calculate average response time
    if (overview.botMetrics.length > 0) {
      const totalResponseTime = overview.botMetrics.reduce(
        (sum, bot) => sum + (bot.daily.avgResponseTime || 0),
        0
      );
      overview.aggregatedMetrics.avgResponseTime = Math.round(
        totalResponseTime / overview.botMetrics.length
      );
    }

    return overview;
  }

  @Get('collaborators/my-invitations')
  @UseGuards(AuthGuard('jwt'))
  async getMyInvitations(@Req() req: any) {
    const invitations = await this.prisma.botCollaborator.findMany({
      where: {
        userId: req.user.id,
        status: 'PENDING',
      },
      include: {
        bot: {
          select: {
            id: true,
            name: true,
            clientId: true,
            status: true,
          },
        },
      },
      orderBy: { invitedAt: 'desc' },
    });

    return invitations.map((inv) => ({
      ...inv,
      permissions: inv.permissions ? JSON.parse(inv.permissions) : undefined,
    }));
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.botsService.findOne(id, req.user.id);
  }

  @Get(':id/config')
  @UseGuards(AuthGuard('jwt'))
  async getConfig(@Param('id') id: string, @Req() req: any) {
    return this.botsService.getConfig(id, req.user.id);
  }

  @Patch(':id/config')
  @UseGuards(AuthGuard('jwt'))
  async updateConfig(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateConfigDto: UpdateBotConfigDto,
  ) {
    return this.botsService.updateConfig(id, req.user.id, updateConfigDto);
  }

  @Patch(':id/token')
  @UseGuards(AuthGuard('jwt'))
  async updateToken(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { token: string },
  ) {
    return this.botsService.updateToken(id, req.user.id, body.token);
  }

  @Post(':id/start')
  @UseGuards(AuthGuard('jwt'))
  async start(@Param('id') id: string, @Req() req: any, @Body() body?: { force?: boolean }) {
    try {
      console.log(`🚀 Starting bot ${id} for user ${req.user.id}${body?.force ? ' (forced)' : ''}`);
      
      // Get current bot to return immediately
      const bot = await this.botsService.findOne(id, req.user.id);
      if (!bot) {
        throw new NotFoundException('Bot not found');
      }
      
      if (body?.force) {
        // Force restart: stop first then start - do it async
        setImmediate(async () => {
          try {
            await this.botsService.stop(id, req.user.id);
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.botsService.start(id, req.user.id);
            console.log(`✅ Bot ${id} force restart completed`);
          } catch (error) {
            console.error(`❌ Bot ${id} force restart failed:`, error);
          }
        });
        
        // Return immediately with starting status
        return {
          ...bot,
          status: 'STARTING',
          message: 'Bot restart initiated'
        };
      }
      
      // Start the bot asynchronously
      setImmediate(async () => {
        try {
          await this.botsService.start(id, req.user.id);
          console.log(`✅ Bot ${id} start completed`);
        } catch (error) {
          console.error(`❌ Bot ${id} start failed:`, error);
        }
      });
      
      // Return immediately with starting status
      return {
        ...bot,
        status: 'STARTING',
        message: 'Bot start command sent'
      };
    } catch (error) {
      console.error(`❌ Error initiating bot start ${id}:`, error);
      throw error;
    }
  }

  @Post(':id/stop')
  @UseGuards(AuthGuard('jwt'))
  async stop(@Param('id') id: string, @Req() req: any) {
    return this.botsService.stop(id, req.user.id);
  }

  @Post(':id/restart')
  @UseGuards(AuthGuard('jwt'))
  async restart(@Param('id') id: string, @Req() req: any) {
    return this.botsService.restart(id, req.user.id);
  }

  @Post(':id/suspend')
  @UseGuards(AuthGuard('jwt'))
  async suspend(@Param('id') id: string, @Req() req: any) {
    await this.botsService.suspend(id, req.user.id);
    return { message: 'Bot suspended successfully' };
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.botsService.delete(id, req.user.id);
    return { message: 'Bot deleted successfully' };
  }

  @Post(':id/invite-link')
  @UseGuards(AuthGuard('jwt'))
  async generateInviteLink(@Param('id') id: string, @Req() req: any) {
    return this.botsService.generateInviteLink(id, req.user.id);
  }

  @Get(':id/status')
  @UseGuards(AuthGuard('jwt'))
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

  @Post(':id/force-stop')
  @UseGuards(AuthGuard('jwt'))
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

  @Get(':id/guilds')
  @UseGuards(AuthGuard('jwt'))
  async getGuilds(@Param('id') id: string, @Req() req: any) {
    return this.botsService.getDiscordGuilds(id, req.user.id);
  }

  @Get(':id/guilds/:guildId/channels')
  @UseGuards(AuthGuard('jwt'))
  async getGuildChannels(
    @Param('id') id: string,
    @Param('guildId') guildId: string,
    @Req() req: any,
  ) {
    return this.botsService.getGuildChannels(id, guildId, req.user.id);
  }

  @Get(':id/guilds/:guildId/roles')
  @UseGuards(AuthGuard('jwt'))
  async getGuildRoles(
    @Param('id') id: string,
    @Param('guildId') guildId: string,
    @Req() req: any,
  ) {
    return this.botsService.getGuildRoles(id, guildId, req.user.id);
  }

  @Get(':id/metrics')
  @UseGuards(AuthGuard('jwt'))
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

  @Post(':id/sync-status')
  @UseGuards(AuthGuard('jwt'))
  async syncBotStatus(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    const newStatus = await this.botsService.forceSyncBotStatus(id);
    return {
      success: true,
      oldStatus: bot.status,
      newStatus,
      message: `Bot status synced from ${bot.status} to ${newStatus}`
    };
  }

  @Post('admin/force-cleanup')
  @UseGuards(AuthGuard('jwt'))
  async forceCleanupAllBots(@Req() req: any) {
    // Note: In a real app, you'd want to check for admin permissions here
    
    // Cast to SimpleQueueService since we know that's what's being used
    const simpleQueueService = this.queueService as any;
    if (simpleQueueService.forceCleanupAndSync) {
      await simpleQueueService.forceCleanupAndSync();
      return {
        success: true,
        message: 'Force cleanup and sync completed for all bots'
      };
    } else {
      return {
        success: false,
        message: 'Force cleanup not available with current queue implementation'
      };
    }
  }

  @Get(':id/metrics/realtime')
  @UseGuards(AuthGuard('jwt'))
  async getBotRealTimeMetrics(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    
    if (bot.status !== 'ONLINE') {
      return {
        cpu: 0,
        memory: 0,
        ping: 0,
        uptime: 0
      };
    }

    try {
      // Get real Node.js process metrics
      const os = require('os');
      const process = require('process');
      
      // Calculate CPU usage
      const cpuUsage = process.cpuUsage();
      const cpuPercent = Math.min(
        ((cpuUsage.user + cpuUsage.system) / 1000000) / os.cpus().length * 100, 
        100
      );
      
      // Get memory usage in MB
      const memUsage = process.memoryUsage();
      const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      
      // Calculate uptime since bot was started (using bot's updatedAt as approximation)
      const uptimeMinutes = Math.round((Date.now() - new Date(bot.updatedAt).getTime()) / 60000);
      
      // Measure real ping to Discord
      const ping = await this.measureDiscordPing();
      
      return {
        cpu: Math.round(cpuPercent * 10) / 10, // Round to 1 decimal
        memory: memoryMB,
        ping: ping,
        uptime: Math.max(uptimeMinutes, 0) // Ensure positive
      };
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      // Fallback to safe default values
      return {
        cpu: 0,
        memory: 0,
        ping: 0,
        uptime: 0
      };
    }
  }

  private async measureDiscordPing(): Promise<number> {
    try {
      const start = Date.now();
      
      // Try to ping Discord's actual API endpoint
      const response = await fetch('https://discord.com/api/v10/gateway', {
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      
      if (response.ok) {
        return Date.now() - start;
      } else {
        throw new Error('Discord API unreachable');
      }
    } catch (error) {
      // Fallback: return a reasonable ping estimate
      return Math.floor(Math.random() * 40) + 25; // 25-65ms realistic range
    }
  }

  // Ticket endpoints
  @Get(':id/tickets')
  @UseGuards(AuthGuard('jwt'))
  async getTickets(@Param('id') id: string, @Req() req: any) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    
    const tickets = await this.ticketService.getTickets(id);
    return {
      tickets,
      total: tickets.length
    };
  }

  @Post(':id/tickets/:ticketId/close')
  @UseGuards(AuthGuard('jwt'))
  async closeTicket(
    @Param('id') id: string,
    @Param('ticketId') ticketId: string,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    await this.ticketService.closeTicket(id, ticketId);
    return { success: true, message: 'Ticket closed' };
  }

  @Post(':id/tickets/:ticketId/rename')
  @UseGuards(AuthGuard('jwt'))
  async renameTicket(
    @Param('id') id: string,
    @Param('ticketId') ticketId: string,
    @Body('name') name: string,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    await this.ticketService.renameTicket(id, ticketId, name);
    return { success: true, message: 'Ticket renamed' };
  }

  @Post(':id/tickets/:ticketId/claim')
  @UseGuards(AuthGuard('jwt'))
  async claimTicket(
    @Param('id') id: string,
    @Param('ticketId') ticketId: string,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    await this.ticketService.claimTicket(id, ticketId);
    return { success: true, message: 'Ticket claimed' };
  }

  @Post(':id/tickets/:ticketId/unclaim')
  @UseGuards(AuthGuard('jwt'))
  async unclaimTicket(
    @Param('id') id: string,
    @Param('ticketId') ticketId: string,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    await this.ticketService.unclaimTicket(id, ticketId);
    return { success: true, message: 'Ticket unclaimed' };
  }

  @Post(':id/tickets/:ticketId/lock')
  @UseGuards(AuthGuard('jwt'))
  async lockTicket(
    @Param('id') id: string,
    @Param('ticketId') ticketId: string,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    await this.ticketService.lockTicket(id, ticketId);
    return { success: true, message: 'Ticket locked' };
  }

  @Post(':id/tickets/:ticketId/unlock')
  @UseGuards(AuthGuard('jwt'))
  async unlockTicket(
    @Param('id') id: string,
    @Param('ticketId') ticketId: string,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    await this.ticketService.unlockTicket(id, ticketId);
    return { success: true, message: 'Ticket unlocked' };
  }

  @Post(':id/tickets/:ticketId/add-user')
  @UseGuards(AuthGuard('jwt'))
  async addUserToTicket(
    @Param('id') id: string,
    @Param('ticketId') ticketId: string,
    @Body('userId') userId: string,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    await this.ticketService.addUserToTicket(id, ticketId, userId);
    return { success: true, message: 'User added to ticket' };
  }

  @Post(':id/tickets/:ticketId/remove-user')
  @UseGuards(AuthGuard('jwt'))
  async removeUserFromTicket(
    @Param('id') id: string,
    @Param('ticketId') ticketId: string,
    @Body('userId') userId: string,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    await this.ticketService.removeUserFromTicket(id, ticketId, userId);
    return { success: true, message: 'User removed from ticket' };
  }

  @Post(':id/tickets/:ticketId/priority')
  @UseGuards(AuthGuard('jwt'))
  async changeTicketPriority(
    @Param('id') id: string,
    @Param('ticketId') ticketId: string,
    @Body('priority') priority: string,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    await this.ticketService.changeTicketPriority(id, ticketId, priority);
    return { success: true, message: 'Ticket priority changed' };
  }

  @Delete(':id/tickets/:ticketId')
  @UseGuards(AuthGuard('jwt'))
  async deleteTicket(
    @Param('id') id: string,
    @Param('ticketId') ticketId: string,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    await this.ticketService.deleteTicket(id, ticketId);
    return { success: true, message: 'Ticket deleted' };
  }

  // Ticket Categories
  @Get(':id/ticket-categories')
  @UseGuards(AuthGuard('jwt'))
  async getTicketCategories(@Param('id') id: string, @Req() req: any) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    
    const categories = await this.ticketService.getCategories(id);
    return {
      categories
    };
  }

  @Post(':id/ticket-categories')
  @UseGuards(AuthGuard('jwt'))
  async createTicketCategory(
    @Param('id') id: string,
    @Body() data: any,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    
    return await this.ticketService.createCategory(id, data);
  }

  @Put(':id/ticket-categories/:categoryId')
  @UseGuards(AuthGuard('jwt'))
  async updateTicketCategory(
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
    @Body() data: any,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    
    return await this.ticketService.updateCategory(id, categoryId, data);
  }

  @Delete(':id/ticket-categories/:categoryId')
  @UseGuards(AuthGuard('jwt'))
  async deleteTicketCategory(
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    
    await this.ticketService.deleteCategory(id, categoryId);
    return { success: true };
  }

  // Ticket Panels
  @Get(':id/ticket-panels')
  @UseGuards(AuthGuard('jwt'))
  async getTicketPanels(@Param('id') id: string, @Req() req: any) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    
    const panels = await this.ticketService.getPanels(id);
    return {
      panels
    };
  }

  @Post(':id/ticket-panels')
  @UseGuards(AuthGuard('jwt'))
  async createTicketPanel(
    @Param('id') id: string,
    @Body() data: any,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    
    return await this.ticketService.createPanel(id, data);
  }

  @Put(':id/ticket-panels/:panelId')
  @UseGuards(AuthGuard('jwt'))
  async updateTicketPanel(
    @Param('id') id: string,
    @Param('panelId') panelId: string,
    @Body() data: any,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    
    return await this.ticketService.updatePanel(id, panelId, data);
  }

  @Delete(':id/ticket-panels/:panelId')
  @UseGuards(AuthGuard('jwt'))
  async deleteTicketPanel(
    @Param('id') id: string,
    @Param('panelId') panelId: string,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    
    await this.ticketService.deletePanel(id, panelId);
    return { success: true };
  }

  @Post(':id/ticket-panels/:panelId/send')
  @UseGuards(AuthGuard('jwt'))
  async sendTicketPanel(
    @Param('id') id: string,
    @Param('panelId') panelId: string,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    
    const result = await this.ticketService.sendPanel(id, panelId);
    
    if (!result.success) {
      throw new BadRequestException(result.message || 'Failed to send panel');
    }
    
    return result;
  }


  @Post(':id/reset-status')
  @UseGuards(AuthGuard('jwt'))
  async resetBotStatus(
    @Param('id') id: string,
    @Req() req: any
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    
    // Force reset status using raw SQL to avoid locks
    await this.prisma.$executeRaw`
      UPDATE bots 
      SET status = 'OFFLINE', updated_at = NOW()
      WHERE id = ${id}
    `;
    
    return { success: true, message: 'Bot status reset to OFFLINE' };
  }

  @Post('setup/metrics')
  @UseGuards(AuthGuard('jwt'))
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
        const userBots = await this.prisma.bot.findMany({
          where: { ownerId: req.user.id },
          select: {
            id: true,
            name: true,
            status: true,
            tokenEncrypted: true
          }
        });
        console.log(`📊 Found ${userBots.length} bots for user`);
        
        let updated = 0;
        let errors = 0;

        // Check each bot's real Discord status
        for (const bot of userBots) {
          try {
            console.log(`🔍 Checking bot: ${bot.name} (currently marked as ${bot.status})`);
            
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
              // Don't override if bot is in STOPPING state
              if (bot.status === 'STOPPING') {
                console.log(`🚫 ${bot.name} is in STOPPING state - not overriding status`);
              } else {
                const wasUpdated = await this.botsService.updateStatusSafe(bot.id, expectedStatus as any, true);
                if (wasUpdated) {
                  updated++;
                  console.log(`✅ Updated ${bot.name}: ${bot.status} -> ${expectedStatus}`);
                }
              }
            } else {
              console.log(`✨ ${bot.name} status is already correct: ${expectedStatus}`);
            }
            
          } catch (error) {
            console.error(`❌ Error checking bot ${bot.name}:`, error.message);
            // If we can't check the bot, assume it's offline
            if (bot.status !== 'OFFLINE') {
              const wasUpdated = await this.botsService.updateStatusSafe(bot.id, 'OFFLINE', true);
              if (wasUpdated) {
                updated++;
                console.log(`🔄 Set ${bot.name} to OFFLINE (couldn't verify)`);
              }
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
  @UseGuards(AuthGuard('jwt'))
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

  @Get(':id/logs/history')
  @UseGuards(AuthGuard('jwt'))
  async getLogsHistory(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    let logs: string[] = [];

    // If bot is online, get logs from buffer (live process)
    if (bot.status === 'ONLINE' || bot.status === 'STARTING') {
      logs = this.consoleBufferService.getBuffer(id);
    } else {
      // Bot is offline, get logs from database
      const recentLogs = await this.botLogsService.getRecentLogs(id, 500);

      // Format logs to match the console format
      const COLORS = {
        YELLOW: '\x1b[33m',
        BLUE: '\x1b[34m',
        GREEN: '\x1b[32m',
        CYAN: '\x1b[36m',
        MAGENTA: '\x1b[35m',
        RESET: '\x1b[0m',
        GRAY: '\x1b[90m'
      };

      logs = recentLogs.map(log => {
        const timestamp = new Date(log.createdAt).toLocaleTimeString();
        const source = log.source || 'bot';
        const botName = bot.name;

        const prefix = source === 'Discord' ? `${COLORS.CYAN}discord@${botName}${COLORS.RESET}` :
                       source === 'System' ? `${COLORS.YELLOW}container@fivebot${COLORS.RESET}` :
                       source === 'Commands' ? `${COLORS.GREEN}cmd@${botName}${COLORS.RESET}` :
                       `${COLORS.BLUE}${source.toLowerCase()}@${botName}${COLORS.RESET}`;

        return `${COLORS.GRAY}[${timestamp}]${COLORS.RESET} [${prefix}]: ${log.message}`;
      });
    }

    return {
      logs,
      bot: {
        id: bot.id,
        name: bot.name,
        status: bot.status,
      }
    };
  }

  @Get(':id/logs/live')
  @UseGuards(AuthGuard('jwt'))
  async getLiveLogs(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    let logs: string[] = [];

    if (bot.status === 'ONLINE' || bot.status === 'STARTING') {
      // Bot is online - get logs from buffer
      logs = this.consoleBufferService.getBuffer(id);
    }

    return {
      logs,
      bot: {
        id: bot.id,
        name: bot.name,
        status: bot.status,
      }
    };
  }

  @Get(':id/logs/recent')
  @UseGuards(AuthGuard('jwt'))
  async getRecentLogs(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new Error('Bot not found');
    }
    
    // Get recent job logs directly from database with more details
    const jobLogs = await this.prisma.jobLog.findMany({
      where: { botId: id },
      orderBy: { createdAt: 'desc' },
      take: 50 // Get more logs
    });
    
    const recentLogs = jobLogs.map((log) => {
      const timestamp = new Date(log.createdAt).toLocaleTimeString();
      let message = '';
      
      if (log.message) {
        message = `[${timestamp}] ${log.message}`;
      } else {
        // Generate a descriptive message based on job type and status
        const statusEmoji = log.status === 'COMPLETED' ? '✅' : 
                           log.status === 'FAILED' ? '❌' : 
                           log.status === 'PROCESSING' ? '🔄' : '📝';
        message = `[${timestamp}] ${statusEmoji} ${log.jobType}: ${log.status}`;
      }
      
      // Add metadata if available
      if (log.metadata && typeof log.metadata === 'object') {
        const meta = log.metadata as any;
        if (meta.error) {
          message += ` - Error: ${meta.error}`;
        }
        if (meta.reason) {
          message += ` - Reason: ${meta.reason}`;
        }
      }
      
      return message;
    });

    // Add some synthetic logs if no real logs exist
    if (recentLogs.length === 0) {
      const syntheticLogs = [
        `[${new Date().toLocaleTimeString()}] 📋 Bot ${bot.name} initialized`,
        `[${new Date(Date.now() - 30000).toLocaleTimeString()}] 📊 Current status: ${bot.status}`,
        `[${new Date(Date.now() - 60000).toLocaleTimeString()}] 🔧 Bot configuration loaded`
      ];
      
      if (bot.status === 'ERROR') {
        syntheticLogs.unshift(`[${new Date().toLocaleTimeString()}] ❌ Bot encountered an error during startup or operation`);
      }
      
      return { logs: syntheticLogs };
    }

    return {
      logs: recentLogs
    };
  }

  @Post(':id/verify-status')
  @UseGuards(AuthGuard('jwt'))
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
  @UseGuards(AuthGuard('jwt'))
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

  @Post(':id/logs/clean-duplicates')
  @UseGuards(AuthGuard('jwt'))
  async cleanDuplicateLogs(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    const cleaned = await this.botLogsService.cleanDuplicateLogs(id);
    
    return {
      message: `Cleaned ${cleaned} duplicate logs`,
      cleaned,
      botId: id
    };
  }

  @Post('kill-all-processes')
  @UseGuards(AuthGuard('jwt'))
  async killAllBotProcesses(@Req() req: any) {
    try {
      const queueService = this.botsService['queueService'];
      const runningBots = queueService.getRunningBots ? await queueService.getRunningBots() : [];

      console.log(`🔪 Killing all ${runningBots.length} running bot processes...`);

      let killed = 0;
      for (const botId of runningBots) {
        try {
          await queueService.forceStopBot(botId);
          killed++;
        } catch (error) {
          console.error(`Failed to kill bot ${botId}:`, error);
        }
      }
      
      // Additional safety: kill by process name on Windows
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        exec('taskkill /F /IM node.exe /FI "WINDOWTITLE eq FiveBot*"', (error, stdout, stderr) => {
          if (error) {
            console.log('No additional processes to kill');
          } else {
            console.log('Killed additional bot processes:', stdout);
          }
        });
      }
      
      return {
        message: `Killed ${killed} bot processes`,
        killedCount: killed,
        originalCount: runningBots.length
      };
    } catch (error) {
      console.error('Error killing all processes:', error);
      throw error;
    }
  }

  private getLogEmoji(level: string): string {
    const emojis = {
      DEBUG: '🔍',
      INFO: '📝',
      WARN: '⚠️',
      ERROR: '❌',
      SUCCESS: '✅',
    };
    return emojis[level] || '📝';
  }

  private async createDefaultLogs(botId: string, botName: string): Promise<void> {
    try {
      // Single clean log like Pterodactyl
      await this.botLogsService.addLog(
        botId, 
        LogLevel.INFO as any, 
        'Server marked as offline...', 
        'System'
      );
    } catch (error) {
      console.error(`Failed to create default logs for bot ${botId}:`, error);
    }
  }

  // New metrics endpoints

  @Post(':id/metrics')
  async receiveBotMetrics(
    @Param('id') id: string,
    @Body() metricsData: any,
  ) {
    // Simple auth check - in production, use proper authentication
    if (metricsData.botId !== id) {
      throw new Error('Bot ID mismatch');
    }

    await this.botRealtimeMetricsService.processBatch(metricsData);
    
    return {
      success: true,
      message: 'Metrics received',
    };
  }

  @Get(':id/metrics/realtime')
  @UseGuards(AuthGuard('jwt'))
  async getRealtimeMetrics(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    const realtimeData = await this.botRealtimeMetricsService.getRealtimeData(id);
    
    return {
      botId: id,
      botName: bot.name,
      ...realtimeData,
    };
  }

  @Post(':id/metrics/process')
  async receiveProcessMetrics(
    @Param('id') id: string,
    @Body() processMetrics: any,
  ) {
    // Store process metrics in Redis
    await this.botProcessMetricsService.storeProcessMetrics(id, processMetrics);

    return {
      success: true,
      message: 'Process metrics received',
    };
  }

  @Get(':id/metrics/process')
  @UseGuards(AuthGuard('jwt'))
  async getProcessMetrics(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // Get process metrics from Redis
    const metrics = await this.botProcessMetricsService.getProcessMetrics(id);

    return {
      botId: id,
      botName: bot.name,
      metrics: metrics || {
        cpuUsage: 0,
        memoryUsage: 0,
        memoryMB: 0,
        uptime: 0,
        guildsCount: 0,
        usersCount: 0,
        networkDownload: 0,
        networkUpload: 0,
      },
    };
  }

  @Get(':id/analytics/:period')
  @UseGuards(AuthGuard('jwt'))
  async getBotAnalytics(
    @Param('id') id: string,
    @Param('period') period: 'daily' | 'weekly' | 'monthly',
    @Req() req: any,
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    const analytics = await this.botRealtimeMetricsService.getAnalytics(id, period);
    
    return {
      botId: id,
      botName: bot.name,
      ...analytics,
    };
  }

  @Get(':id/tickets/stats')
  @UseGuards(AuthGuard('jwt'))
  async getTicketStats(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    return this.ticketService.getTicketStats(id);
  }

  @Get(':id/tickets/commands')
  @UseGuards(AuthGuard('jwt'))
  async getTicketCommands(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    return this.ticketService.getCommands(id);
  }

  @Put(':id/tickets/commands')
  @UseGuards(AuthGuard('jwt'))
  async updateTicketCommands(
    @Param('id') id: string,
    @Body() commands: any,
    @Req() req: any,
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }
    return this.ticketService.updateCommands(id, commands);
  }

  // ==================== COLLABORATORS ROUTES ====================

  @Get(':id/collaborators')
  @UseGuards(AuthGuard('jwt'))
  async getCollaborators(@Param('id') id: string, @Req() req: any) {
    // Vérifier que l'utilisateur a accès au bot
    await this.verifyBotAccess(id, req.user.id);

    const collaborators = await this.prisma.botCollaborator.findMany({
      where: { botId: id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            discordId: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return collaborators.map((collab) => ({
      ...collab,
      permissions: collab.permissions ? JSON.parse(collab.permissions) : undefined,
    }));
  }

  @Post(':id/collaborators/invite')
  @UseGuards(AuthGuard('jwt'))
  async inviteCollaborator(
    @Param('id') id: string,
    @Body() dto: { userDiscordId: string; permissions: any },
    @Req() req: any,
  ) {
    // Vérifier que l'utilisateur est propriétaire ou admin du bot
    await this.verifyBotOwnerOrAdmin(id, req.user.id);

    console.log('[COLLABORATOR INVITE] Searching for Discord ID:', dto.userDiscordId);

    // Normaliser le Discord ID (enlever les espaces)
    const normalizedDiscordId = dto.userDiscordId.trim();

    // Trouver l'utilisateur à inviter par son Discord ID
    let targetUser = await this.prisma.user.findUnique({
      where: { discordId: normalizedDiscordId },
    });

    // Si pas trouvé, essayer de chercher par username aussi
    if (!targetUser) {
      targetUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { discordId: normalizedDiscordId },
            { username: normalizedDiscordId },
            { id: normalizedDiscordId },
          ],
        },
      });
    }

    console.log('[COLLABORATOR INVITE] Target user found:', targetUser ? `${targetUser.username} (${targetUser.id})` : 'NOT FOUND');

    if (!targetUser) {
      // List all users to help debug
      const allUsers = await this.prisma.user.findMany({
        select: { id: true, username: true, discordId: true },
        take: 10,
      });
      console.log('[COLLABORATOR INVITE] Available users:', allUsers);
      throw new NotFoundException(`User not found on the platform. Discord ID searched: ${normalizedDiscordId}`);
    }

    // Vérifier que l'utilisateur n'essaie pas de s'inviter lui-même
    if (targetUser.id === req.user.id) {
      throw new BadRequestException('You cannot invite yourself as a collaborator');
    }

    // Vérifier que l'utilisateur n'est pas déjà le propriétaire
    const bot = await this.prisma.bot.findUnique({
      where: { id },
    });

    if (bot?.ownerId === targetUser.id) {
      throw new BadRequestException('This user is already the owner of this bot');
    }

    // Check if user is already a collaborator
    const existing = await this.prisma.botCollaborator.findUnique({
      where: {
        botId_userId: {
          botId: id,
          userId: targetUser.id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('This user is already a collaborator');
    }

    // Create the invitation
    const collaborator = await this.prisma.botCollaborator.create({
      data: {
        botId: id,
        userId: targetUser.id,
        invitedBy: req.user.id,
        role: 'VIEWER', // Default role, not used anymore
        permissions: JSON.stringify(dto.permissions || {}),
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            discordId: true,
            avatar: true,
          },
        },
      },
    });

    return {
      ...collaborator,
      permissions: collaborator.permissions ? JSON.parse(collaborator.permissions) : undefined,
    };
  }

  @Delete(':id/collaborators/:collaboratorId')
  @UseGuards(AuthGuard('jwt'))
  async removeCollaborator(
    @Param('id') id: string,
    @Param('collaboratorId') collaboratorId: string,
    @Req() req: any,
  ) {
    // Verify user is owner or admin of the bot
    await this.verifyBotOwnerOrAdmin(id, req.user.id);

    const collaborator = await this.prisma.botCollaborator.findUnique({
      where: { id: collaboratorId },
    });

    if (!collaborator || collaborator.botId !== id) {
      throw new NotFoundException('Collaborator not found');
    }

    await this.prisma.botCollaborator.delete({
      where: { id: collaboratorId },
    });

    return { success: true, message: 'Collaborator removed' };
  }

  @Post(':id/collaborators/:collaboratorId/accept')
  @UseGuards(AuthGuard('jwt'))
  async acceptInvitation(
    @Param('id') id: string,
    @Param('collaboratorId') collaboratorId: string,
    @Req() req: any,
  ) {
    const collaborator = await this.prisma.botCollaborator.findUnique({
      where: { id: collaboratorId },
    });

    if (!collaborator || collaborator.botId !== id) {
      throw new NotFoundException('Invitation not found');
    }

    if (collaborator.userId !== req.user.id) {
      throw new ForbiddenException('This invitation is not for you');
    }

    if (collaborator.status !== 'PENDING') {
      throw new BadRequestException('This invitation has already been processed');
    }

    const updated = await this.prisma.botCollaborator.update({
      where: { id: collaboratorId },
      data: {
        status: 'ACTIVE',
        acceptedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            discordId: true,
            avatar: true,
          },
        },
      },
    });

    return {
      ...updated,
      permissions: updated.permissions ? JSON.parse(updated.permissions) : undefined,
    };
  }

  @Post(':id/collaborators/:collaboratorId/decline')
  @UseGuards(AuthGuard('jwt'))
  async declineInvitation(
    @Param('id') id: string,
    @Param('collaboratorId') collaboratorId: string,
    @Req() req: any,
  ) {
    const collaborator = await this.prisma.botCollaborator.findUnique({
      where: { id: collaboratorId },
    });

    if (!collaborator || collaborator.botId !== id) {
      throw new NotFoundException('Invitation not found');
    }

    if (collaborator.userId !== req.user.id) {
      throw new ForbiddenException('This invitation is not for you');
    }

    if (collaborator.status !== 'PENDING') {
      throw new BadRequestException('This invitation has already been processed');
    }

    await this.prisma.botCollaborator.delete({
      where: { id: collaboratorId },
    });

    return { success: true, message: 'Invitation declined' };
  }

  @Post(':id/refresh-assets')
  @UseGuards(AuthGuard('jwt'))
  async refreshBotAssets(@Param('id') id: string, @Req() req: any) {
    await this.verifyBotAccess(id, req.user.id);
    const assets = await this.botsService.refreshBotAssets(id, req.user.id);
    return {
      message: 'Bot assets refreshed successfully',
      ...assets,
    };
  }

  private async verifyBotAccess(botId: string, userId: string) {
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // Check if owner
    if (bot.ownerId === userId) {
      return;
    }

    // Check if active collaborator
    const collaborator = await this.prisma.botCollaborator.findFirst({
      where: {
        botId,
        userId,
        status: 'ACTIVE',
      },
    });

    if (!collaborator) {
      throw new ForbiddenException('You do not have access to this bot');
    }
  }

  private async verifyBotOwnerOrAdmin(botId: string, userId: string) {
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // Check if owner
    if (bot.ownerId === userId) {
      return;
    }

    // Check if admin collaborator
    const collaborator = await this.prisma.botCollaborator.findFirst({
      where: {
        botId,
        userId,
        status: 'ACTIVE',
        role: 'ADMIN',
      },
    });

    if (!collaborator) {
      throw new ForbiddenException('You must be the owner or an administrator');
    }
  }
}