import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface LogEntry {
  botId: string;
  line: string;
  timestamp: Date;
  level?: 'info' | 'warn' | 'error' | 'debug' | 'success';
  source?: string;
}

export interface BotLogStream {
  botId: string;
  logs: LogEntry[];
  status: 'online' | 'offline' | 'starting' | 'stopping';
}

@Injectable()
export class ConsoleBufferService {
  private buffers: Map<string, LogEntry[]> = new Map();
  private readonly maxBufferSize = 2000; // Increased from 200 to 2000 for better debugging
  private readonly maxOfflineBufferAge = 30 * 60 * 1000; // 30 minutes retention for offline bots

  // Real-time log streaming via RxJS Subject
  private logSubject = new Subject<LogEntry>();
  private statusSubject = new Subject<{ botId: string; status: string }>();

  // Track last activity for cleanup
  private lastActivity: Map<string, Date> = new Map();

  // Track bot online status
  private botStatus: Map<string, 'online' | 'offline' | 'starting' | 'stopping'> = new Map();

  constructor() {
    // Start cleanup interval for stale offline buffers
    setInterval(() => this.cleanupStaleBuffers(), 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Get observable for real-time log streaming
   */
  getLogStream(): Observable<LogEntry> {
    return this.logSubject.asObservable();
  }

  /**
   * Get observable for bot status changes
   */
  getStatusStream(): Observable<{ botId: string; status: string }> {
    return this.statusSubject.asObservable();
  }

  /**
   * Add a log entry to the buffer for a specific bot
   */
  addLog(botId: string, logLine: string, level?: string, source?: string): void {
    // Check if this is a clear console marker
    if (logLine.includes('[CLEAR_CONSOLE]')) {
      this.softClearBuffer(botId);
      return;
    }

    if (!this.buffers.has(botId)) {
      this.buffers.set(botId, []);
    }

    const entry: LogEntry = {
      botId,
      line: logLine,
      timestamp: new Date(),
      level: this.detectLogLevel(logLine, level),
      source: source || this.detectSource(logLine),
    };

    const buffer = this.buffers.get(botId)!;
    buffer.push(entry);

    // Keep only the last maxBufferSize lines
    if (buffer.length > this.maxBufferSize) {
      buffer.splice(0, buffer.length - this.maxBufferSize);
    }

    // Update last activity
    this.lastActivity.set(botId, new Date());

    // Emit to real-time stream
    this.logSubject.next(entry);
  }

  /**
   * Add a structured log entry
   */
  addStructuredLog(entry: Omit<LogEntry, 'timestamp'>): void {
    const fullEntry: LogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    if (!this.buffers.has(entry.botId)) {
      this.buffers.set(entry.botId, []);
    }

    const buffer = this.buffers.get(entry.botId)!;
    buffer.push(fullEntry);

    if (buffer.length > this.maxBufferSize) {
      buffer.splice(0, buffer.length - this.maxBufferSize);
    }

    this.lastActivity.set(entry.botId, new Date());
    this.logSubject.next(fullEntry);
  }

  /**
   * Get the buffer content for a specific bot (as strings for backward compatibility)
   */
  getBuffer(botId: string): string[] {
    const buffer = this.buffers.get(botId) || [];
    return buffer.map(entry => entry.line);
  }

  /**
   * Get structured log entries
   */
  getStructuredBuffer(botId: string): LogEntry[] {
    return this.buffers.get(botId) || [];
  }

  /**
   * Get logs since a specific timestamp (for delta updates)
   */
  getLogsSince(botId: string, since: Date): LogEntry[] {
    const buffer = this.buffers.get(botId) || [];
    return buffer.filter(entry => entry.timestamp > since);
  }

  /**
   * Get the buffer content as a single string
   */
  getBufferAsString(botId: string): string {
    const buffer = this.buffers.get(botId);
    return buffer ? buffer.map(e => e.line).join('\n') : '';
  }

  /**
   * Soft clear - marks separation but keeps last 100 lines for context
   */
  softClearBuffer(botId: string): void {
    const buffer = this.buffers.get(botId);
    if (buffer && buffer.length > 100) {
      // Keep last 100 lines and add separator
      const keepLines = buffer.slice(-100);
      keepLines.unshift({
        botId,
        line: '─'.repeat(50) + ' Session End ' + '─'.repeat(50),
        timestamp: new Date(),
        level: 'info',
        source: 'System',
      });
      this.buffers.set(botId, keepLines);
    }
  }

  /**
   * Hard clear - completely removes buffer
   */
  clearBuffer(botId: string): void {
    this.buffers.delete(botId);
    this.lastActivity.delete(botId);
  }

  /**
   * Called when a bot goes offline - DOES NOT clear buffer anymore
   * Instead, marks the session end and keeps logs for debugging
   */
  onBotOffline(botId: string): void {
    this.botStatus.set(botId, 'offline');
    this.statusSubject.next({ botId, status: 'offline' });

    // Add session end marker but keep the buffer
    this.addLog(botId, '⏹️ Bot process stopped', 'info', 'System');

    // Keep logs for offline debugging - they'll be cleaned up after maxOfflineBufferAge
    this.lastActivity.set(botId, new Date());
  }

  /**
   * Called when a bot starts
   */
  onBotStarting(botId: string): void {
    this.botStatus.set(botId, 'starting');
    this.statusSubject.next({ botId, status: 'starting' });

    // Soft clear for fresh start but keep some history
    this.softClearBuffer(botId);
    this.addLog(botId, '🚀 Bot process starting...', 'info', 'System');
  }

  /**
   * Called when a bot is online
   */
  onBotOnline(botId: string): void {
    this.botStatus.set(botId, 'online');
    this.statusSubject.next({ botId, status: 'online' });
  }

  /**
   * Get bot status
   */
  getBotStatus(botId: string): string {
    return this.botStatus.get(botId) || 'offline';
  }

  /**
   * Get the size of a specific buffer
   */
  getBufferSize(botId: string): number {
    const buffer = this.buffers.get(botId);
    return buffer ? buffer.length : 0;
  }

  /**
   * Get all bot IDs that have buffers
   */
  getActiveBotIds(): string[] {
    return Array.from(this.buffers.keys());
  }

  /**
   * Clear all buffers (useful for cleanup or testing)
   */
  clearAllBuffers(): void {
    this.buffers.clear();
    this.lastActivity.clear();
    this.botStatus.clear();
  }

  /**
   * Get memory usage statistics
   */
  getStats(): {
    totalBots: number;
    totalLines: number;
    bufferSizes: Record<string, number>;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    const stats = {
      totalBots: this.buffers.size,
      totalLines: 0,
      bufferSizes: {} as Record<string, number>,
      oldestEntry: null as Date | null,
      newestEntry: null as Date | null,
    };

    for (const [botId, buffer] of this.buffers.entries()) {
      stats.bufferSizes[botId] = buffer.length;
      stats.totalLines += buffer.length;

      if (buffer.length > 0) {
        const oldest = buffer[0].timestamp;
        const newest = buffer[buffer.length - 1].timestamp;

        if (!stats.oldestEntry || oldest < stats.oldestEntry) {
          stats.oldestEntry = oldest;
        }
        if (!stats.newestEntry || newest > stats.newestEntry) {
          stats.newestEntry = newest;
        }
      }
    }

    return stats;
  }

  /**
   * Cleanup stale buffers for offline bots after retention period
   */
  private cleanupStaleBuffers(): void {
    const now = new Date().getTime();

    for (const [botId, lastActive] of this.lastActivity.entries()) {
      const status = this.botStatus.get(botId);

      // Only cleanup offline bots after retention period
      if (status === 'offline' && (now - lastActive.getTime()) > this.maxOfflineBufferAge) {
        console.log(`🧹 Cleaning up stale buffer for offline bot ${botId}`);
        this.clearBuffer(botId);
        this.botStatus.delete(botId);
      }
    }
  }

  /**
   * Detect log level from content
   */
  private detectLogLevel(line: string, providedLevel?: string): 'info' | 'warn' | 'error' | 'debug' | 'success' {
    if (providedLevel) {
      const normalized = providedLevel.toLowerCase();
      if (['info', 'warn', 'error', 'debug', 'success'].includes(normalized)) {
        return normalized as any;
      }
    }

    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('error') || lowerLine.includes('❌') || lowerLine.includes('failed')) {
      return 'error';
    }
    if (lowerLine.includes('warn') || lowerLine.includes('⚠️')) {
      return 'warn';
    }
    if (lowerLine.includes('debug')) {
      return 'debug';
    }
    if (lowerLine.includes('success') || lowerLine.includes('✅') || lowerLine.includes('ready')) {
      return 'success';
    }
    return 'info';
  }

  /**
   * Detect source from log content
   */
  private detectSource(line: string): string {
    if (line.includes('discord@') || line.includes('[Discord]')) return 'Discord';
    if (line.includes('container@') || line.includes('[System]')) return 'System';
    if (line.includes('cmd@') || line.includes('[Command]')) return 'Commands';
    if (line.includes('[Bot]')) return 'Bot';
    return 'Bot';
  }
}