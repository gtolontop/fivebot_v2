import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { BotStatus } from '@prisma/client';

export interface BotHealthMetrics {
  botId: string;
  botName: string;
  status: BotStatus;
  uptime: number;
  lastHeartbeat: Date | null;
  memoryUsage: number | null;
  cpuUsage: number | null;
  messagesPerMinute: number;
  commandsPerHour: number;
  errorRate: number;
  latency: number;
  healthScore: number;
  healthStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
  issues: string[];
}

export interface SystemHealthOverview {
  totalBots: number;
  healthyBots: number;
  warningBots: number;
  criticalBots: number;
  offlineBots: number;
  averageHealthScore: number;
  averageUptime: number;
  totalMessages24h: number;
  totalCommands24h: number;
  systemStatus: 'operational' | 'degraded' | 'outage';
  lastUpdated: Date;
}

@Injectable()
export class BotHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Get health metrics for a single bot
   */
  async getBotHealth(botId: string): Promise<BotHealthMetrics | null> {
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
      include: {
        config: true,
      },
    });

    if (!bot) return null;

    // Get metrics from Redis cache
    const metricsKey = `bot:${botId}:metrics`;
    const cachedMetrics = await this.redisService.get(metricsKey);
    const metrics = cachedMetrics ? JSON.parse(cachedMetrics) : null;

    // Calculate uptime
    const uptime = bot.startedAt && bot.status === 'ONLINE'
      ? Math.floor((Date.now() - new Date(bot.startedAt).getTime()) / 1000)
      : 0;

    // Get recent logs for error rate calculation
    const recentLogs = await this.prisma.botLog.findMany({
      where: {
        botId,
        createdAt: {
          gte: new Date(Date.now() - 3600000), // Last hour
        },
      },
      select: { level: true },
    });

    const totalLogs = recentLogs.length;
    const errorLogs = recentLogs.filter(l => l.level === 'ERROR').length;
    const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;

    // Calculate health score (0-100)
    const healthScore = this.calculateHealthScore({
      status: bot.status,
      uptime,
      errorRate,
      metrics,
    });

    const issues = this.detectIssues({
      status: bot.status,
      uptime,
      errorRate,
      metrics,
    });

    return {
      botId: bot.id,
      botName: bot.name,
      status: bot.status,
      uptime,
      lastHeartbeat: metrics?.lastHeartbeat ? new Date(metrics.lastHeartbeat) : null,
      memoryUsage: metrics?.memoryUsage || null,
      cpuUsage: metrics?.cpuUsage || null,
      messagesPerMinute: metrics?.messagesPerMinute || 0,
      commandsPerHour: metrics?.commandsPerHour || 0,
      errorRate,
      latency: metrics?.latency || 0,
      healthScore,
      healthStatus: this.getHealthStatus(healthScore, bot.status),
      issues,
    };
  }

  /**
   * Get health overview for all user's bots
   */
  async getUserBotsHealthOverview(userId: string): Promise<SystemHealthOverview> {
    const bots = await this.prisma.bot.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        status: true,
        startedAt: true,
      },
    });

    let healthyBots = 0;
    let warningBots = 0;
    let criticalBots = 0;
    let offlineBots = 0;
    let totalHealthScore = 0;
    let totalUptime = 0;
    let onlineBotCount = 0;

    for (const bot of bots) {
      const health = await this.getBotHealth(bot.id);
      if (health) {
        totalHealthScore += health.healthScore;

        if (bot.status === 'OFFLINE') {
          offlineBots++;
        } else {
          onlineBotCount++;
          totalUptime += health.uptime;

          switch (health.healthStatus) {
            case 'healthy':
              healthyBots++;
              break;
            case 'warning':
              warningBots++;
              break;
            case 'critical':
              criticalBots++;
              break;
          }
        }
      }
    }

    // Get 24h stats
    const yesterday = new Date(Date.now() - 86400000);
    const recentLogs = await this.prisma.botLog.findMany({
      where: {
        botId: { in: bots.map(b => b.id) },
        createdAt: { gte: yesterday },
      },
      select: { level: true, source: true },
    });

    const totalMessages24h = recentLogs.filter(l => l.source === 'Bot').length;
    const totalCommands24h = recentLogs.filter(l => l.source === 'Command').length;

    // Determine system status
    let systemStatus: 'operational' | 'degraded' | 'outage' = 'operational';
    if (criticalBots > 0 || offlineBots === bots.length) {
      systemStatus = 'outage';
    } else if (warningBots > 0) {
      systemStatus = 'degraded';
    }

    return {
      totalBots: bots.length,
      healthyBots,
      warningBots,
      criticalBots,
      offlineBots,
      averageHealthScore: bots.length > 0 ? Math.round(totalHealthScore / bots.length) : 0,
      averageUptime: onlineBotCount > 0 ? Math.round(totalUptime / onlineBotCount) : 0,
      totalMessages24h,
      totalCommands24h,
      systemStatus,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get health metrics for all user's bots
   */
  async getAllBotsHealth(userId: string): Promise<BotHealthMetrics[]> {
    const bots = await this.prisma.bot.findMany({
      where: { ownerId: userId },
    });

    const healthMetrics: BotHealthMetrics[] = [];

    for (const bot of bots) {
      const health = await this.getBotHealth(bot.id);
      if (health) {
        healthMetrics.push(health);
      }
    }

    return healthMetrics.sort((a, b) => {
      // Sort by status first (online first), then by health score
      if (a.status === 'ONLINE' && b.status !== 'ONLINE') return -1;
      if (a.status !== 'ONLINE' && b.status === 'ONLINE') return 1;
      return b.healthScore - a.healthScore;
    });
  }

  /**
   * Calculate health score based on various factors
   */
  private calculateHealthScore(params: {
    status: BotStatus;
    uptime: number;
    errorRate: number;
    metrics: any;
  }): number {
    let score = 100;

    // Status penalty
    if (params.status === 'OFFLINE') return 0;
    if (params.status === 'ERROR') return 10;
    if (params.status === 'STARTING' || params.status === 'STOPPING') return 50;

    // Error rate penalty (max -40 points)
    if (params.errorRate > 50) score -= 40;
    else if (params.errorRate > 20) score -= 25;
    else if (params.errorRate > 10) score -= 15;
    else if (params.errorRate > 5) score -= 5;

    // Uptime bonus (max +10 points for > 24h uptime)
    if (params.uptime > 86400) score = Math.min(100, score + 10);
    else if (params.uptime < 300) score -= 5; // Less than 5 min uptime

    // Latency penalty
    if (params.metrics?.latency > 500) score -= 15;
    else if (params.metrics?.latency > 200) score -= 5;

    // Memory usage penalty
    if (params.metrics?.memoryUsage > 90) score -= 20;
    else if (params.metrics?.memoryUsage > 70) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get health status based on score
   */
  private getHealthStatus(score: number, status: BotStatus): 'healthy' | 'warning' | 'critical' | 'unknown' {
    if (status === 'OFFLINE') return 'unknown';
    if (status === 'ERROR') return 'critical';

    if (score >= 80) return 'healthy';
    if (score >= 50) return 'warning';
    return 'critical';
  }

  /**
   * Detect issues with the bot
   */
  private detectIssues(params: {
    status: BotStatus;
    uptime: number;
    errorRate: number;
    metrics: any;
  }): string[] {
    const issues: string[] = [];

    if (params.status === 'ERROR') {
      issues.push('Bot is in error state');
    }

    if (params.errorRate > 20) {
      issues.push(`High error rate: ${params.errorRate.toFixed(1)}%`);
    }

    if (params.metrics?.latency > 500) {
      issues.push(`High latency: ${params.metrics.latency}ms`);
    }

    if (params.metrics?.memoryUsage > 80) {
      issues.push(`High memory usage: ${params.metrics.memoryUsage}%`);
    }

    if (params.uptime > 0 && params.uptime < 60) {
      issues.push('Recently restarted');
    }

    if (params.metrics?.lastHeartbeat) {
      const lastHeartbeat = new Date(params.metrics.lastHeartbeat);
      const timeSinceHeartbeat = Date.now() - lastHeartbeat.getTime();
      if (timeSinceHeartbeat > 60000) {
        issues.push('No recent heartbeat');
      }
    }

    return issues;
  }
}
