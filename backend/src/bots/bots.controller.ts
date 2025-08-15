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
import { BotMetricsService } from './bot-metrics.service';
import { SetupMetricsService } from './setup-metrics.service';

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
  async getDashboardStats(@Req() req: any) {
    return this.botMetricsService.getDashboardStats(req.user.id);
  }

  @Get(':id/metrics')
  async getBotMetrics(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const bot = await this.botsService.findOne(id, req.user.id);
    if (!bot) {
      throw new Error('Bot not found');
    }
    return this.botMetricsService.getBotMetrics(id);
  }
}