import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LogLevel } from '@prisma/client';
import { ConsoleBufferService } from './console-buffer.service';

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
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ConsoleBufferService))
    private consoleBufferService: ConsoleBufferService,
  ) {}

  // Add a log entry for a specific bot
  async addLog(
    botId: string,
    level: LogLevel,
    message: string,
    source?: string,
    metadata?: any
  ): Promise<void> {
    try {
      // Save to database
      await this.prisma.botLog.create({
        data: {
          botId,
          level,
          message,
          source,
          metadata,
        },
      });

      // Add to console buffer
      // Get bot name for prefix
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        select: { name: true }
      });
      const botName = bot?.name || 'unknown';
      
      const timestamp = new Date().toLocaleTimeString();
      const prefix = source === 'Discord' ? `discord@${botName}` : 
                     source === 'System' ? `container@fivebot` : 
                     source === 'Commands' ? `cmd@${botName}` : 
                     `${source?.toLowerCase() || 'bot'}@${botName}`;
      
      const formattedLog = `[${timestamp}] [${prefix}]: ${message}`;
      this.consoleBufferService.addLog(botId, formattedLog);
      
    } catch (error) {
      // Silently fail log creation to not crash the main functionality
      console.error(`Failed to create log for bot ${botId}:`, error);
    }
  }

  // Get recent logs for a bot (for live console)
  async getRecentLogs(botId: string, limit: number = 100): Promise<BotLogEntry[]> {
    // Get logs from the last hour to avoid showing old duplicate messages
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const logs = await this.prisma.botLog.findMany({
      where: { 
        botId,
        createdAt: {
          gte: oneHourAgo
        }
      },
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
    // Check for recent duplicate events to avoid spam
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    
    const recentSimilarLog = await this.prisma.botLog.findFirst({
      where: {
        botId,
        source: 'System',
        message: {
          contains: event === 'START' ? 'Bot starting' : 
                   event === 'STOP' ? 'Bot stopping' :
                   event
        },
        createdAt: {
          gte: fiveMinutesAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // If we found a similar log recently, don't create a duplicate
    if (recentSimilarLog) {
      console.log(`Skipping duplicate ${event} log for bot ${botId}`);
      return;
    }
    
    const messages = {
      START: 'Server marked as starting...',
      STOP: 'Server marked as stopping...',
      ERROR: 'Server encountered an error',
      RESTART: 'Server marked as restarting...',
      CONFIG_UPDATE: 'Configuration updated',
    };

    const levels = {
      START: LogLevel.INFO,
      STOP: LogLevel.INFO,
      ERROR: LogLevel.ERROR,
      RESTART: LogLevel.WARN,
      CONFIG_UPDATE: LogLevel.INFO,
    };

    // Simple message without details for cleaner console
    const message = messages[event];

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
  
  // Clean duplicate logs for a specific bot
  async cleanDuplicateLogs(botId: string): Promise<number> {
    try {
      // Get all logs for the bot
      const allLogs = await this.prisma.botLog.findMany({
        where: { botId },
        orderBy: { createdAt: 'desc' }
      });
      
      const seenMessages = new Set<string>();
      const duplicateIds: string[] = [];
      
      // Find duplicates (same message within 1 minute)
      for (let i = 0; i < allLogs.length; i++) {
        const log = allLogs[i];
        const messageKey = `${log.message}-${log.source}`;
        const timeKey = Math.floor(log.createdAt.getTime() / 60000); // Round to minute
        const uniqueKey = `${messageKey}-${timeKey}`;
        
        if (seenMessages.has(uniqueKey)) {
          duplicateIds.push(log.id);
        } else {
          seenMessages.add(uniqueKey);
        }
      }
      
      // Delete duplicates
      if (duplicateIds.length > 0) {
        const result = await this.prisma.botLog.deleteMany({
          where: {
            id: { in: duplicateIds }
          }
        });
        console.log(`Cleaned ${result.count} duplicate logs for bot ${botId}`);
        return result.count;
      }
      
      return 0;
    } catch (error) {
      console.error('Error cleaning duplicate logs:', error);
      return 0;
    }
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