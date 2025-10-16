import { Client, Message, CommandInteraction, Guild, GuildMember } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import * as os from 'os';

interface MetricEvent {
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

export class MetricsService {
  private events: MetricEvent[] = [];
  private lastSent: Date = new Date();
  private sendInterval: NodeJS.Timeout | null = null;
  private commandStartTimes: Map<string, number> = new Map();

  // CPU tracking
  private lastCpuCheck = Date.now();

  // Network tracking - cumulative totals for the session
  private networkStats = {
    totalBytesReceived: 0,
    totalBytesSent: 0,
  };

  constructor(
    private client: Client,
    private prisma: PrismaClient,
    private botId: string,
    private backendUrl: string = process.env.BACKEND_URL || 'http://localhost:8000'
  ) {
    this.setupEventListeners();
    this.startPeriodicSending();
    this.startNetworkTracking();
  }

  private setupEventListeners() {
    // Track message events
    this.client.on('messageCreate', (message: Message) => {
      if (message.author.bot) return;
      
      this.addEvent({
        type: 'message',
        timestamp: new Date(),
        guildId: message.guild?.id,
        userId: message.author.id,
      });
    });

    // Track command executions
    this.client.on('interactionCreate', (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const startTime = Date.now();
      const interactionId = interaction.id;
      this.commandStartTimes.set(interactionId, startTime);

      // Track command start
      this.addEvent({
        type: 'command',
        timestamp: new Date(),
        guildId: interaction.guild?.id,
        userId: interaction.user.id,
        commandName: interaction.commandName,
      });

      // Simple response time tracking without modifying interaction methods
      setTimeout(() => {
        const responseTime = Date.now() - startTime;
        this.commandStartTimes.delete(interactionId);
        
        // Update the last event with approximate response time
        const lastEvent = this.events[this.events.length - 1];
        if (lastEvent && lastEvent.type === 'command' && lastEvent.commandName === interaction.commandName) {
          lastEvent.responseTime = responseTime;
        }
      }, 100); // Check after 100ms
    });

    // Track guild events
    this.client.on('guildCreate', (guild: Guild) => {
      this.addEvent({
        type: 'guild_join',
        timestamp: new Date(),
        guildId: guild.id,
      });
    });

    this.client.on('guildDelete', (guild: Guild) => {
      this.addEvent({
        type: 'guild_leave',
        timestamp: new Date(),
        guildId: guild.id,
      });
    });

    // Track member events
    this.client.on('guildMemberAdd', (member: GuildMember) => {
      this.addEvent({
        type: 'member_join',
        timestamp: new Date(),
        guildId: member.guild.id,
        userId: member.id,
      });
    });

    this.client.on('guildMemberRemove', (member) => {
      this.addEvent({
        type: 'member_leave',
        timestamp: new Date(),
        guildId: member.guild.id,
        userId: member.id,
      });
    });

    // Track errors
    this.client.on('error', (error: Error) => {
      this.addEvent({
        type: 'error',
        timestamp: new Date(),
        errorMessage: error.message,
      });
    });

    // Also track unhandled promise rejections
    process.on('unhandledRejection', (error: Error) => {
      this.addEvent({
        type: 'error',
        timestamp: new Date(),
        errorMessage: `Unhandled rejection: ${error.message}`,
      });
    });
  }

  private addEvent(event: MetricEvent) {
    this.events.push(event);
    
    // Keep only last 10000 events to prevent memory issues
    if (this.events.length > 10000) {
      this.events = this.events.slice(-5000);
    }
  }

  private startPeriodicSending() {
    // Send metrics every 30 seconds
    this.sendInterval = setInterval(() => {
      this.sendMetrics();
    }, 30000);

    // Send process metrics every 10 seconds (more frequent for real-time dashboard)
    setInterval(() => {
      this.sendProcessMetrics();
    }, 10000);

    // Also send on shutdown
    process.on('SIGTERM', () => this.sendMetrics());
    process.on('SIGINT', () => this.sendMetrics());
  }

  private async sendMetrics() {
    if (this.events.length === 0) return;

    const now = new Date();
    const batch: MetricsBatch = {
      botId: this.botId,
      startTime: this.lastSent,
      endTime: now,
      events: [...this.events],
      summary: this.calculateSummary(),
    };

    try {
      // Send to backend
      const response = await fetch(`${this.backendUrl}/api/bots/${this.botId}/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${this.botId}`, // Simple auth using bot ID
        },
        body: JSON.stringify(batch),
      });

      if (response.ok) {
        // Clear events after successful send
        this.events = [];
        this.lastSent = now;
        console.log(`[Metrics] Successfully sent ${batch.events.length} events`);
      } else {
        console.error(`[Metrics] Failed to send metrics: ${response.status}`);
      }
    } catch (error) {
      console.error('[Metrics] Error sending metrics:', error);
    }

    // Also store in local database for redundancy
    try {
      await this.storeMetricsLocally(batch);
    } catch (error) {
      console.error('[Metrics] Error storing metrics locally:', error);
    }
  }

  private calculateSummary() {
    const summary = {
      messageCount: 0,
      commandCount: 0,
      errorCount: 0,
      guildJoins: 0,
      guildLeaves: 0,
      memberJoins: 0,
      memberLeaves: 0,
      uniqueUsers: new Set<string>(),
      uniqueGuilds: new Set<string>(),
      avgResponseTime: 0,
    };

    let totalResponseTime = 0;
    let commandsWithResponseTime = 0;

    for (const event of this.events) {
      switch (event.type) {
        case 'message':
          summary.messageCount++;
          break;
        case 'command':
          summary.commandCount++;
          if (event.responseTime) {
            totalResponseTime += event.responseTime;
            commandsWithResponseTime++;
          }
          break;
        case 'error':
          summary.errorCount++;
          break;
        case 'guild_join':
          summary.guildJoins++;
          break;
        case 'guild_leave':
          summary.guildLeaves++;
          break;
        case 'member_join':
          summary.memberJoins++;
          break;
        case 'member_leave':
          summary.memberLeaves++;
          break;
      }

      if (event.userId) summary.uniqueUsers.add(event.userId);
      if (event.guildId) summary.uniqueGuilds.add(event.guildId);
    }

    if (commandsWithResponseTime > 0) {
      summary.avgResponseTime = Math.round(totalResponseTime / commandsWithResponseTime);
    }

    return summary;
  }

  private async storeMetricsLocally(batch: MetricsBatch) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Check if we have a record for today
      const existingMetric = await this.prisma.$queryRaw`
        SELECT * FROM bot_metrics 
        WHERE bot_id = ${this.botId} 
        AND date = ${today}
        LIMIT 1
      ` as any[];

      const summary = batch.summary;
      const currentGuilds = this.client.guilds.cache.size;
      const currentUsers = this.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

      if (existingMetric.length > 0) {
        // Update existing record
        await this.prisma.$executeRaw`
          UPDATE bot_metrics SET
            commands_used = commands_used + ${summary.commandCount},
            messages_processed = messages_processed + ${summary.messageCount},
            errors_count = errors_count + ${summary.errorCount},
            guilds_count = ${currentGuilds},
            users_count = ${currentUsers},
            avg_response_time_ms = ${summary.avgResponseTime || 45},
            updated_at = CURRENT_TIMESTAMP
          WHERE bot_id = ${this.botId} AND date = ${today}
        `;
      } else {
        // Create new record
        const uuid = require('crypto').randomUUID();
        const uptimeSeconds = Math.floor((Date.now() - this.client.readyTimestamp!) / 1000);

        await this.prisma.$executeRaw`
          INSERT INTO bot_metrics (
            id, bot_id, date, commands_used, messages_processed,
            guilds_count, users_count, uptime_seconds, avg_response_time_ms, errors_count,
            created_at, updated_at
          ) VALUES (
            ${uuid}, ${this.botId}, ${today}, ${summary.commandCount}, ${summary.messageCount},
            ${currentGuilds}, ${currentUsers}, ${uptimeSeconds}, ${summary.avgResponseTime || 45}, ${summary.errorCount},
            NOW(), NOW()
          )
          ON CONFLICT (bot_id, date) DO UPDATE SET
            commands_used = bot_metrics.commands_used + ${summary.commandCount},
            messages_processed = bot_metrics.messages_processed + ${summary.messageCount},
            guilds_count = ${currentGuilds},
            users_count = ${currentUsers},
            uptime_seconds = ${uptimeSeconds},
            avg_response_time_ms = ${summary.avgResponseTime || 45},
            errors_count = bot_metrics.errors_count + ${summary.errorCount},
            updated_at = NOW()
        `;
      }
    } catch (error) {
      console.error('[Metrics] Error storing locally:', error);
    }
  }

  public trackCustomEvent(eventName: string, data?: any) {
    this.addEvent({
      type: 'message', // Use message type for custom events
      timestamp: new Date(),
      errorMessage: `Custom: ${eventName}${data ? ` - ${JSON.stringify(data)}` : ''}`,
    });
  }

  public async forceSync() {
    await this.sendMetrics();
  }

  private startNetworkTracking() {
    const networkStats = this.networkStats;

    // Track incoming WebSocket messages via raw event
    this.client.on('raw' as any, (packet: any) => {
      if (packet) {
        try {
          const packetSize = JSON.stringify(packet).length;
          networkStats.totalBytesReceived += packetSize;
        } catch (e) {
          // Ignore parse errors
        }
      }
    });

    // Track outgoing traffic via REST API
    const patchREST = () => {
      try {
        const rest = (this.client as any).rest;

        if (!rest) {
          console.log('[Metrics] REST API not available');
          return;
        }

        // Patch the request method
        const originalRequest = rest.request.bind(rest);
        rest.request = async function(...args: any[]) {
          const result = await originalRequest(...args);

          // Estimate upload size from request
          try {
            if (args[0] && args[0].body) {
              const body = args[0].body;
              const bytes = typeof body === 'string' ? Buffer.byteLength(body) :
                           Buffer.isBuffer(body) ? body.length :
                           JSON.stringify(body).length;
              networkStats.totalBytesSent += bytes;

              if (networkStats.totalBytesSent < 10000) {
                console.log(`[Metrics] REST Upload: ${bytes} bytes (total: ${Math.round(networkStats.totalBytesSent / 1024)} KB)`);
              }
            }
          } catch (e) {
            // Ignore
          }

          return result;
        };

        console.log('[Metrics] ✅ REST API patched for upload tracking');
      } catch (error) {
        console.error('[Metrics] Failed to patch REST:', error);
      }
    };

    // Also patch WebSocket for gateway traffic
    const patchWebSocket = () => {
      try {
        const ws = (this.client.ws as any);

        if (!ws || !ws.shards || ws.shards.size === 0) {
          console.log('[Metrics] WebSocket not ready (ws:', !!ws, 'shards:', !!ws?.shards, 'size:', ws?.shards?.size || 0, ')');
          return false;
        }

        let patchedCount = 0;
        for (const [shardId, shard] of ws.shards) {
          if (shard && shard.connection && shard.connection.send) {
            const originalSend = shard.connection.send.bind(shard.connection);
            shard.connection.send = function(data: any, cb?: any) {
              try {
                const bytes = Buffer.isBuffer(data) ? data.length :
                             typeof data === 'string' ? Buffer.byteLength(data) :
                             JSON.stringify(data).length;
                networkStats.totalBytesSent += bytes;

                if (networkStats.totalBytesSent < 10000) {
                  console.log(`[Metrics] WS Upload: ${bytes} bytes (total: ${Math.round(networkStats.totalBytesSent / 1024)} KB)`);
                }
              } catch (e) {
                // Ignore
              }
              return originalSend(data, cb);
            };
            patchedCount++;
          }
        }

        if (patchedCount > 0) {
          console.log(`[Metrics] ✅ Patched ${patchedCount} WebSocket shard(s)`);
          return true;
        } else {
          console.log('[Metrics] ❌ No shards to patch');
          return false;
        }
      } catch (error) {
        console.error('[Metrics] WebSocket patch error:', error);
        return false;
      }
    };

    // Try to patch immediately and on ready
    patchREST();

    let wsPatched = false;
    const tryPatchWS = () => {
      if (!wsPatched) {
        wsPatched = patchWebSocket();
        if (!wsPatched) {
          setTimeout(tryPatchWS, 3000); // Retry every 3s until success
        }
      }
    };

    this.client.once('ready', () => {
      console.log('[Metrics] Client ready, attempting WebSocket patch...');
      setTimeout(tryPatchWS, 2000);
    });

    if (this.client.isReady()) {
      console.log('[Metrics] Client already ready, attempting WebSocket patch...');
      setTimeout(tryPatchWS, 2000);
    }
  }

  private async sendProcessMetrics() {
    try {
      // Get ABSOLUTE CPU usage since process started
      const now = Date.now();
      const timeDeltaMs = now - this.lastCpuCheck;
      const absoluteCpuUsage = process.cpuUsage(); // Total depuis le début
      const processUptimeSeconds = process.uptime(); // Temps depuis le démarrage

      // CPU % = (Total CPU microseconds) / (Process uptime microseconds) * 100
      const totalCpuMicroseconds = absoluteCpuUsage.user + absoluteCpuUsage.system;
      const processUptimeMicroseconds = processUptimeSeconds * 1000000;

      const cpuPercent = Math.min(100, Math.max(0,
        (totalCpuMicroseconds / processUptimeMicroseconds) * 100
      ));

      // Debug
      console.log('[Metrics] CPU:', {
        percent: cpuPercent.toFixed(2) + '%',
        totalCpuMs: (totalCpuMicroseconds / 1000).toFixed(0),
        uptimeMs: (processUptimeMicroseconds / 1000).toFixed(0),
        user: absoluteCpuUsage.user,
        system: absoluteCpuUsage.system
      });

      this.lastCpuCheck = now;

      // Get memory usage - use RSS (actual physical memory used)
      const memoryUsage = process.memoryUsage();
      const usedMemoryMB = Math.round(memoryUsage.rss / 1024 / 1024);
      // Calculate percentage: RSS / 512MB (reasonable limit for a bot process)
      const memoryLimit = 512 * 1024 * 1024; // 512 MB
      const memoryPercent = Math.min(100, (memoryUsage.rss / memoryLimit) * 100);

      // Get Discord stats
      const guildsCount = this.client.guilds.cache.size;
      const usersCount = this.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

      // Get uptime
      const uptime = Math.floor(process.uptime());

      const processMetrics = {
        cpuUsage: Math.round(cpuPercent * 10) / 10,
        memoryUsage: Math.round(memoryPercent * 10) / 10,
        memoryMB: usedMemoryMB,
        uptime,
        guildsCount,
        usersCount,
        networkDownload: Math.round(this.networkStats.totalBytesReceived / 1024), // Total KB downloaded
        networkUpload: Math.round(this.networkStats.totalBytesSent / 1024), // Total KB uploaded
      };

      // Debug log
      if (processMetrics.networkDownload > 0 || processMetrics.networkUpload > 0) {
        console.log('[Metrics] Network stats:', {
          down: processMetrics.networkDownload + ' KB',
          up: processMetrics.networkUpload + ' KB',
          downBytes: this.networkStats.totalBytesReceived,
          upBytes: this.networkStats.totalBytesSent
        });
      }

      // Send to backend
      const response = await fetch(`${this.backendUrl}/api/bots/${this.botId}/metrics/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${this.botId}`,
        },
        body: JSON.stringify(processMetrics),
      });

      if (!response.ok) {
        console.error(`[Metrics] Failed to send process metrics: ${response.status}`);
      }
    } catch (error) {
      // Silently fail - don't spam console with errors
    }
  }

  public destroy() {
    if (this.sendInterval) {
      clearInterval(this.sendInterval);
      this.sendInterval = null;
    }
    // Send any remaining metrics
    this.sendMetrics();
  }
}