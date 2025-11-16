import { Client, ActivityType, PresenceStatusData } from 'discord.js';
import { FiveLinkService, FiveLinkGlobalStats } from './fivelink.service';
import { getRedisClient } from './redis.service';
import { ModuleLoaderService } from './module-loader.service';

export interface StatusConfig {
  enabled: boolean;
  rotationInterval: number; // in seconds
  statuses: StatusItem[];
  enableFiveLinkStats?: boolean;
}

export interface StatusItem {
  text: string;
  type: 'playing' | 'streaming' | 'listening' | 'watching' | 'competing';
  url?: string; // For streaming type
  status?: 'online' | 'idle' | 'dnd' | 'invisible';
}

export class StatusService {
  private client: Client;
  private config: StatusConfig;
  private currentIndex: number = 0;
  private rotationTimer?: NodeJS.Timeout;
  private moduleLoader?: ModuleLoaderService;
  private fivelinkService?: FiveLinkService;
  private fivelinkStatsCache?: FiveLinkGlobalStats;
  private fivelinkCacheExpiry: number = 0;
  private readonly FIVELINK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(client: Client, moduleConfig?: any, moduleLoader?: ModuleLoaderService) {
    this.client = client;
    this.moduleLoader = moduleLoader;
    this.config = this.loadConfig(moduleConfig);
    this.initializeFiveLinkService();
  }

  private loadConfig(moduleConfig?: any): StatusConfig {
    // Default statuses with variables
    const defaultStatuses: StatusItem[] = [
      {
        text: '{guilds} servers | {users} users',
        type: 'watching',
        status: 'online'
      },
      {
        text: '/help for commands',
        type: 'playing',
        status: 'online'
      },
    ];

    // If module config is provided, use it
    if (moduleConfig && moduleConfig.statuses && Array.isArray(moduleConfig.statuses)) {
      const statuses = moduleConfig.statuses.map((s: any) => ({
        text: s.text || '',
        type: (s.type || 'PLAYING').toLowerCase() as StatusItem['type'],
        status: 'online' as const
      }));

      return {
        enabled: statuses.length > 0,
        rotationInterval: moduleConfig.interval || 60,
        statuses: statuses.length > 0 ? statuses : defaultStatuses,
        enableFiveLinkStats: moduleConfig.enableFiveLinkStats ?? false
      };
    }

    return {
      enabled: false,
      rotationInterval: 60,
      statuses: defaultStatuses,
      enableFiveLinkStats: false
    };
  }

  private initializeFiveLinkService() {
    // Only initialize if FiveLink stats are enabled
    if (!this.config.enableFiveLinkStats || !this.moduleLoader) {
      return;
    }

    try {
      // Check if FiveLink module is enabled
      if (!this.moduleLoader.isModuleEnabled('fivelink')) {
        console.log('⚠️ FiveLink stats requested but FiveLink module is not enabled');
        return;
      }

      // Get FiveLink module config
      const fivelinkConfig = this.moduleLoader.getModuleConfig('fivelink');
      if (!fivelinkConfig || !fivelinkConfig.apiKey) {
        console.log('⚠️ FiveLink stats requested but API key not configured');
        return;
      }

      // Initialize FiveLink service
      const redis = getRedisClient();
      this.fivelinkService = new FiveLinkService(
        {
          apiKey: fivelinkConfig.apiKey,
          cacheEnabled: true,
          cacheTTL: 300, // 5 minutes
        },
        redis
      );

      console.log('✅ FiveLink stats integration enabled for status rotation');
    } catch (error) {
      console.error('⚠️ Failed to initialize FiveLink service for status rotation:', error);
    }
  }

  public start(): { enabled: boolean; interval?: number } {
    // Set initial status
    this.updateStatus();

    if (!this.config.enabled) {
      return { enabled: false };
    }

    // Start rotation
    this.rotationTimer = setInterval(() => {
      this.updateStatus();
    }, this.config.rotationInterval * 1000);

    return { enabled: true, interval: this.config.rotationInterval };
  }

  public stop() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = undefined;
      console.log('Status rotation stopped');
    }
  }

  private async updateStatus() {
    if (!this.client.user) return;

    const statusItem = this.config.statuses[this.currentIndex];
    if (!statusItem) return;

    // Replace variables in text
    let text = await this.replaceVariables(statusItem.text);

    // Validate and truncate text to Discord's 128 character limit
    const MAX_STATUS_LENGTH = 128;
    if (text.length > MAX_STATUS_LENGTH) {
      console.warn(`Status text exceeds ${MAX_STATUS_LENGTH} characters (${text.length}), truncating...`);
      text = text.substring(0, MAX_STATUS_LENGTH - 3) + '...';
    }

    // Map activity type
    const activityType = this.getActivityType(statusItem.type);

    // Set presence
    this.client.user.setPresence({
      activities: [{
        name: text,
        type: activityType,
        url: statusItem.url
      }],
      status: (statusItem.status || 'online') as PresenceStatusData
    });

    // Move to next status
    this.currentIndex = (this.currentIndex + 1) % this.config.statuses.length;
  }

  private async getFiveLinkStats(): Promise<FiveLinkGlobalStats | null> {
    if (!this.fivelinkService) {
      return null;
    }

    try {
      // Check if cache is still valid
      const now = Date.now();
      if (this.fivelinkStatsCache && now < this.fivelinkCacheExpiry) {
        return this.fivelinkStatsCache;
      }

      // Fetch fresh stats
      const stats = await this.fivelinkService.getGlobalStats();
      this.fivelinkStatsCache = stats;
      this.fivelinkCacheExpiry = now + this.FIVELINK_CACHE_TTL;

      return stats;
    } catch (error) {
      console.error('⚠️ Failed to fetch FiveLink stats for status:', error);
      // Return cached data if available, even if expired
      return this.fivelinkStatsCache || null;
    }
  }

  private async replaceVariables(text: string): Promise<string> {
    const variables: Record<string, string> = {
      '{guilds}': this.client.guilds.cache.size.toString(),
      '{users}': this.client.users.cache.size.toString(),
      '{members}': this.getTotalMembers().toString(),
      '{channels}': this.getTotalChannels().toString(),
      '{voice}': this.getVoiceConnections().toString(),
      '{uptime}': this.getUptime(),
      '{ping}': Math.round(this.client.ws.ping).toString() + 'ms',
      '{commands}': this.getCommandCount().toString(),
      '{version}': '2.0.0',
      '{shards}': this.client.ws.shards.size.toString(),
    };

    // Add FiveLink stats if enabled
    if (this.config.enableFiveLinkStats && this.fivelinkService) {
      const fivelinkStats = await this.getFiveLinkStats();
      if (fivelinkStats) {
        variables['{fivelink-users}'] = fivelinkStats.allTime.totalUsers.toLocaleString();
        variables['{fivelink-views}'] = fivelinkStats.allTime.totalViews.toLocaleString();
        variables['{fivelink-clicks}'] = fivelinkStats.allTime.totalClicks.toLocaleString();
        variables['{fivelink-profiles}'] = fivelinkStats.allTime.totalProfiles.toLocaleString();
      }
    }

    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(key, 'g'), value);
    });

    return result;
  }

  private getActivityType(type: string): ActivityType {
    const types: Record<string, ActivityType> = {
      'playing': ActivityType.Playing,
      'streaming': ActivityType.Streaming,
      'listening': ActivityType.Listening,
      'watching': ActivityType.Watching,
      'competing': ActivityType.Competing,
    };
    return types[type] || ActivityType.Playing;
  }

  private getTotalMembers(): number {
    return this.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  }

  private getTotalChannels(): number {
    return this.client.channels.cache.size;
  }

  private getVoiceConnections(): number {
    return this.client.voice?.adapters.size || 0;
  }

  private getUptime(): string {
    const totalSeconds = Math.floor(this.client.uptime! / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h`;
  }

  private getCommandCount(): number {
    // This would need to be tracked elsewhere
    return this.client.application?.commands.cache.size || 0;
  }

  // Public methods for dynamic control
  public addStatus(status: StatusItem) {
    this.config.statuses.push(status);
  }

  public removeStatus(index: number) {
    if (index >= 0 && index < this.config.statuses.length) {
      this.config.statuses.splice(index, 1);
    }
  }

  public setInterval(seconds: number) {
    this.config.rotationInterval = seconds;
    // Restart rotation with new interval
    this.stop();
    this.start();
  }

  public getStatuses(): StatusItem[] {
    return [...this.config.statuses];
  }
}