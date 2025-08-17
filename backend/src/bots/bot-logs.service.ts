import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LogLevel } from '@prisma/client';

export interface BotLogEntry {
  id: string;
  level: LogLevel;
  message: string;
  source?: string;
  metadata?: any;
  createdAt: Date;
}

@Injectable()
export class BotLogsService {
  constructor(private prisma: PrismaService) {}

  // Add a log entry for a specific bot
  async addLog(
    botId: string,
    level: LogLevel,
    message: string,
    source?: string,
    metadata?: any
  ): Promise<void> {
    try {
      await this.prisma.botLog.create({
        data: {
          botId,
          level,
          message,
          source,
          metadata,
        },
      });
    } catch (error) {
      // Silently fail log creation to not crash the main functionality
      console.error(`Failed to create log for bot ${botId}:`, error);
    }
  }

  // Get recent logs for a bot (for live console)
  async getRecentLogs(botId: string, limit: number = 100): Promise<BotLogEntry[]> {
    const logs = await this.prisma.botLog.findMany({
      where: { botId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.reverse(); // Return in chronological order for console display
  }

  // Get logs with pagination (for full logs view)
  async getLogsPaginated(
    botId: string,
    page: number = 1,
    limit: number = 50,
    level?: LogLevel,
    search?: string
  ): Promise<{ logs: BotLogEntry[]; total: number; hasMore: boolean }> {
    const where: any = { botId };
    
    if (level) {
      where.level = level;
    }
    
    if (search) {
      where.message = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const [logs, total] = await Promise.all([
      this.prisma.botLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.botLog.count({ where }),
    ]);

    return {
      logs,
      total,
      hasMore: total > page * limit,
    };
  }

  // Log system events (start, stop, error, etc.)
  async logSystemEvent(
    botId: string,
    event: 'START' | 'STOP' | 'ERROR' | 'RESTART' | 'CONFIG_UPDATE',
    details?: string,
    metadata?: any
  ): Promise<void> {
    const messages = {
      START: '🚀 Bot starting...',
      STOP: '🛑 Bot stopping...',
      ERROR: '❌ Bot encountered an error',
      RESTART: '🔄 Bot restarting...',
      CONFIG_UPDATE: '⚙️ Configuration updated',
    };

    const levels = {
      START: LogLevel.INFO,
      STOP: LogLevel.INFO,
      ERROR: LogLevel.ERROR,
      RESTART: LogLevel.WARN,
      CONFIG_UPDATE: LogLevel.INFO,
    };

    const message = details ? `${messages[event]} ${details}` : messages[event];

    await this.addLog(botId, levels[event], message, 'System', metadata);
  }

  // Log Discord events
  async logDiscordEvent(
    botId: string,
    event: string,
    message: string,
    level: LogLevel = LogLevel.INFO,
    metadata?: any
  ): Promise<void> {
    await this.addLog(botId, level, `[Discord] ${message}`, 'Discord', {
      event,
      ...metadata,
    });
  }

  // Log command executions
  async logCommandExecution(
    botId: string,
    command: string,
    user: string,
    guild?: string,
    success: boolean = true,
    error?: string
  ): Promise<void> {
    const level = success ? LogLevel.SUCCESS : LogLevel.ERROR;
    const message = success 
      ? `Command /${command} executed by ${user}${guild ? ` in ${guild}` : ''}`
      : `Command /${command} failed: ${error}`;

    await this.addLog(botId, level, `[Commands] ${message}`, 'Commands', {
      command,
      user,
      guild,
      success,
      error,
    });
  }

  // Clean old logs (keep last 30 days)
  async cleanOldLogs(botId?: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const where: any = {
      createdAt: {
        lt: thirtyDaysAgo,
      },
    };

    if (botId) {
      where.botId = botId;
    }

    const result = await this.prisma.botLog.deleteMany({ where });
    return result.count;
  }

  // Get log statistics
  async getLogStats(botId: string, days: number = 7): Promise<{
    total: number;
    byLevel: Record<LogLevel, number>;
    bySource: Record<string, number>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await this.prisma.botLog.findMany({
      where: {
        botId,
        createdAt: { gte: since },
      },
      select: {
        level: true,
        source: true,
      },
    });

    const byLevel: Record<LogLevel, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
      SUCCESS: 0,
    };

    const bySource: Record<string, number> = {};

    logs.forEach(log => {
      byLevel[log.level]++;
      const source = log.source || 'Unknown';
      bySource[source] = (bySource[source] || 0) + 1;
    });

    return {
      total: logs.length,
      byLevel,
      bySource,
    };
  }
}