import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface MetricEvent {
  type: 'message' | 'command' | 'error' | 'guild_join' | 'guild_leave' | 'member_join' | 'member_leave';
  timestamp: Date;
  guildId?: string;
  userId?: string;
  commandName?: string;
  errorMessage?: string;
  responseTime?: number;
}

interface MetricsBatch {
  botId: string;
  startTime: Date;
  endTime: Date;
  events: MetricEvent[];
  summary: {
    messageCount: number;
    commandCount: number;
    errorCount: number;
    guildJoins: number;
    guildLeaves: number;
    memberJoins: number;
    memberLeaves: number;
    uniqueUsers: Set<string>;
    uniqueGuilds: Set<string>;
    avgResponseTime: number;
  };
}

interface BotRealtimeData {
  lastUpdate: Date;
  metrics: {
    messagesPerMinute: number;
    commandsPerMinute: number;
    errorsPerHour: number;
    avgResponseTime: number;
    activeUsers: number;
    activeGuilds: number;
  };
  recentEvents: MetricEvent[];
  peakTimes: { hour: number; activity: number }[];
}

@Injectable()
export class BotRealtimeMetricsService {
  // In-memory storage for real-time metrics (last 24 hours)
  private metricsCache: Map<string, MetricEvent[]> = new Map();
  private lastProcessed: Map<string, Date> = new Map();

  constructor(private prisma: PrismaService) {
    // Clean up old metrics every hour
    setInterval(() => this.cleanupOldMetrics(), 3600000);
  }

  async processBatch(batch: MetricsBatch): Promise<void> {
    const { botId, events, summary } = batch;

    // Store events in cache
    const currentEvents = this.metricsCache.get(botId) || [];
    currentEvents.push(...events);
    this.metricsCache.set(botId, currentEvents);
    this.lastProcessed.set(botId, new Date());

    // Update database metrics
    await this.updateDatabaseMetrics(botId, summary);

    // Store detailed event logs for analytics
    await this.storeEventLogs(botId, events);
  }

  private async updateDatabaseMetrics(botId: string, summary: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Check if metric exists for today
      const existingMetric = await this.prisma.$queryRaw`
        SELECT id FROM bot_metrics 
        WHERE bot_id = ${botId} 
        AND date = ${today}
        LIMIT 1
      ` as any[];

      const guildsCount = summary.uniqueGuilds.size;
      const usersCount = summary.uniqueUsers.size;

      if (existingMetric.length > 0) {
        // Update existing metric
        await this.prisma.$executeRaw`
          UPDATE bot_metrics SET
            commands_used = commands_used + ${summary.commandCount},
            messages_processed = messages_processed + ${summary.messageCount},
            errors_count = errors_count + ${summary.errorCount},
            guilds_count = GREATEST(guilds_count, ${guildsCount}),
            users_count = GREATEST(users_count, ${usersCount}),
            avg_response_time_ms = ${summary.avgResponseTime || 45},
            updated_at = CURRENT_TIMESTAMP
          WHERE bot_id = ${botId} AND date = ${today}
        `;
      } else {
        // Create new metric
        const uuid = require('crypto').randomUUID();
        await this.prisma.$executeRaw`
          INSERT INTO bot_metrics (
            id, bot_id, date, commands_used, messages_processed,
            guilds_count, users_count, uptime_seconds, avg_response_time_ms, errors_count,
            created_at, updated_at
          ) VALUES (
            ${uuid}, ${botId}, ${today}, ${summary.commandCount}, ${summary.messageCount},
            ${guildsCount || 0}, ${usersCount || 0}, 3600, ${summary.avgResponseTime || 45}, ${summary.errorCount},
            NOW(), NOW()
          )
          ON CONFLICT (bot_id, date) DO UPDATE SET
            commands_used = bot_metrics.commands_used + ${summary.commandCount},
            messages_processed = bot_metrics.messages_processed + ${summary.messageCount},
            guilds_count = ${guildsCount || 0},
            users_count = ${usersCount || 0},
            uptime_seconds = bot_metrics.uptime_seconds + 3600,
            avg_response_time_ms = ${summary.avgResponseTime || 45},
            errors_count = bot_metrics.errors_count + ${summary.errorCount},
            updated_at = NOW()
        `;
      }
    } catch (error) {
      console.error('Error updating database metrics:', error);
    }
  }

  private async storeEventLogs(botId: string, events: MetricEvent[]) {
    // Store command executions for detailed analytics
    const commandEvents = events.filter(e => e.type === 'command');
    
    for (const event of commandEvents) {
      try {
        await this.prisma.jobLog.create({
          data: {
            botId,
            jobId: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            jobType: 'COMMAND_EXECUTION',
            status: 'COMPLETED',
            message: `Command: ${event.commandName}`,
            metadata: JSON.stringify({
              commandName: event.commandName,
              userId: event.userId,
              guildId: event.guildId,
              responseTime: event.responseTime,
              timestamp: event.timestamp,
            }),
          },
        });
      } catch (error) {
        // Ignore errors to not break metrics processing
      }
    }

    // Store errors for debugging
    const errorEvents = events.filter(e => e.type === 'error');
    
    for (const event of errorEvents) {
      try {
        await this.prisma.jobLog.create({
          data: {
            botId,
            jobId: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            jobType: 'ERROR_REPORT',
            status: 'FAILED',
            message: event.errorMessage || 'Unknown error',
            metadata: JSON.stringify({
              timestamp: event.timestamp,
              errorMessage: event.errorMessage,
            }),
          },
        });
      } catch (error) {
        // Ignore errors
      }
    }
  }

  async getRealtimeData(botId: string): Promise<BotRealtimeData> {
    const events = this.metricsCache.get(botId) || [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    // Filter recent events
    const recentEvents = events.filter(e => new Date(e.timestamp) > oneHourAgo);
    const lastMinuteEvents = events.filter(e => new Date(e.timestamp) > oneMinuteAgo);

    // Calculate metrics
    const messagesPerMinute = lastMinuteEvents.filter(e => e.type === 'message').length;
    const commandsPerMinute = lastMinuteEvents.filter(e => e.type === 'command').length;
    const errorsPerHour = recentEvents.filter(e => e.type === 'error').length;

    // Calculate average response time
    const commandsWithResponseTime = recentEvents
      .filter(e => e.type === 'command' && e.responseTime)
      .map(e => e.responseTime!);
    
    const avgResponseTime = commandsWithResponseTime.length > 0
      ? Math.round(commandsWithResponseTime.reduce((a, b) => a + b, 0) / commandsWithResponseTime.length)
      : 45;

    // Get unique users and guilds
    const activeUsers = new Set(recentEvents.filter(e => e.userId).map(e => e.userId!));
    const activeGuilds = new Set(recentEvents.filter(e => e.guildId).map(e => e.guildId!));

    // Calculate peak times (hourly activity)
    const hourlyActivity = new Map<number, number>();
    recentEvents.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourlyActivity.set(hour, (hourlyActivity.get(hour) || 0) + 1);
    });

    const peakTimes = Array.from(hourlyActivity.entries())
      .map(([hour, activity]) => ({ hour, activity }))
      .sort((a, b) => b.activity - a.activity);

    return {
      lastUpdate: this.lastProcessed.get(botId) || new Date(),
      metrics: {
        messagesPerMinute,
        commandsPerMinute,
        errorsPerHour,
        avgResponseTime,
        activeUsers: activeUsers.size,
        activeGuilds: activeGuilds.size,
      },
      recentEvents: recentEvents.slice(-20), // Last 20 events
      peakTimes: peakTimes.slice(0, 5), // Top 5 peak hours
    };
  }

  async getAnalytics(botId: string, period: 'daily' | 'weekly' | 'monthly'): Promise<any> {
    const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get metrics from database
    const metrics = await this.prisma.$queryRaw`
      SELECT 
        date,
        commands_used,
        messages_processed,
        errors_count,
        guilds_count,
        users_count,
        avg_response_time_ms
      FROM bot_metrics
      WHERE bot_id = ${botId}
      AND date >= ${startDate}
      ORDER BY date ASC
    ` as any[];

    // Get command usage statistics
    const commandStats = await this.prisma.$queryRaw`
      SELECT
        metadata->>'commandName' as command_name,
        COUNT(*) as usage_count,
        AVG((metadata->>'responseTime')::numeric) as avg_response_time
      FROM job_logs
      WHERE bot_id = ${botId}
      AND job_type = 'COMMAND_EXECUTION'
      AND created_at >= ${startDate}
      GROUP BY command_name
      ORDER BY usage_count DESC
      LIMIT 10
    ` as any[];

    // Get error statistics
    const errorStats = await this.prisma.$queryRaw`
      SELECT 
        DATE(created_at) as error_date,
        COUNT(*) as error_count
      FROM job_logs
      WHERE bot_id = ${botId}
      AND job_type = 'ERROR_REPORT'
      AND created_at >= ${startDate}
      GROUP BY error_date
      ORDER BY error_date ASC
    ` as any[];

    // Calculate aggregations
    const totalCommands = metrics.reduce((sum, m) => sum + (m.commands_used || 0), 0);
    const totalMessages = metrics.reduce((sum, m) => sum + (m.messages_processed || 0), 0);
    const totalErrors = metrics.reduce((sum, m) => sum + (m.errors_count || 0), 0);
    const avgResponseTime = metrics.length > 0
      ? Math.round(metrics.reduce((sum, m) => sum + (m.avg_response_time_ms || 0), 0) / metrics.length)
      : 45;

    // Get peak usage times from recent events
    const events = this.metricsCache.get(botId) || [];
    const hourlyDistribution = new Array(24).fill(0);
    
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourlyDistribution[hour]++;
    });

    return {
      period,
      startDate,
      endDate: new Date(),
      summary: {
        totalCommands,
        totalMessages,
        totalErrors,
        avgResponseTime,
        maxGuilds: Math.max(...metrics.map(m => m.guilds_count || 0)),
        maxUsers: Math.max(...metrics.map(m => m.users_count || 0)),
      },
      dailyMetrics: metrics,
      commandUsage: commandStats.map((stat: any) => ({
        name: stat.command_name || 'Unknown',
        count: parseInt(stat.usage_count),
        avgResponseTime: Math.round(stat.avg_response_time || 45),
      })),
      errorTrend: errorStats,
      hourlyDistribution,
      mostActiveServers: await this.getMostActiveServers(botId, startDate),
    };
  }

  private async getMostActiveServers(botId: string, startDate: Date): Promise<any[]> {
    try {
      const serverActivity = await this.prisma.$queryRaw`
        SELECT
          metadata->>'guildId' as guild_id,
          COUNT(*) as activity_count
        FROM job_logs
        WHERE bot_id = ${botId}
        AND job_type IN ('COMMAND_EXECUTION', 'MESSAGE_PROCESSED')
        AND created_at >= ${startDate}
        AND metadata->>'guildId' IS NOT NULL
        GROUP BY guild_id
        ORDER BY activity_count DESC
        LIMIT 5
      ` as any[];

      return serverActivity.map(server => ({
        guildId: server.guild_id,
        activityCount: parseInt(server.activity_count),
      }));
    } catch (error) {
      console.error('Error getting most active servers:', error);
      return [];
    }
  }

  private cleanupOldMetrics() {
    const oneDayAgo = new Date(Date.now() - 86400000);
    
    // Clean up old events from cache
    this.metricsCache.forEach((events, botId) => {
      const recentEvents = events.filter(e => new Date(e.timestamp) > oneDayAgo);
      this.metricsCache.set(botId, recentEvents);
    });
  }
}