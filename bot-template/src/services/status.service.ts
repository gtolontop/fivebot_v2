import { Client, ActivityType, PresenceStatusData } from 'discord.js';

export interface StatusConfig {
  enabled: boolean;
  rotationInterval: number; // in seconds
  statuses: StatusItem[];
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

  constructor(client: Client) {
    this.client = client;
    this.config = this.loadConfig();
  }

  private loadConfig(): StatusConfig {
    const envConfig = process.env.CONFIG ? JSON.parse(process.env.CONFIG) : {};
    
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
      {
        text: 'Version 2.0',
        type: 'playing',
        status: 'online'
      },
      {
        text: '{members} members',
        type: 'watching',
        status: 'online'
      },
      {
        text: 'with {channels} channels',
        type: 'playing',
        status: 'online'
      }
    ];

    // Parse statusRotation if it exists
    let statusRotation = envConfig.statusRotation || {};
    if (typeof statusRotation === 'string') {
      try {
        statusRotation = JSON.parse(statusRotation);
      } catch (e) {
        console.error('Failed to parse statusRotation:', e);
        statusRotation = {};
      }
    }

    return {
      enabled: statusRotation.enabled ?? false, // Disabled by default until configured
      rotationInterval: statusRotation.interval ?? 60, // 60 seconds default
      statuses: statusRotation.statuses || defaultStatuses
    };
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

  private updateStatus() {
    if (!this.client.user) return;

    const statusItem = this.config.statuses[this.currentIndex];
    if (!statusItem) return;

    // Replace variables in text
    const text = this.replaceVariables(statusItem.text);

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

  private replaceVariables(text: string): string {
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