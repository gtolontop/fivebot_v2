import { Client, TextChannel, ThreadChannel, Message, Guild, ChannelType } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';

interface ScrapedMessage {
  id: string;
  channelId: string;
  channelName: string;
  authorId: string;
  authorName: string;
  authorBot: boolean;
  content: string;
  timestamp: string;
  attachments: string[];
  embeds: number;
}

interface ScrapedChannel {
  id: string;
  name: string;
  type: string;
  messageCount: number;
}

interface ServerData {
  guildId: string;
  guildName: string;
  scrapedAt: string;
  channels: ScrapedChannel[];
  messages: ScrapedMessage[];
  totalMessages: number;
  totalChannels: number;
}

export class ScraperService {
  private client: Client;
  private dataPath: string;

  constructor(client: Client) {
    this.client = client;
    this.dataPath = path.join(process.cwd(), 'data');

    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
  }

  /**
   * Scrape all messages from a guild
   */
  async scrapeGuild(guild: Guild, limit: number = 100): Promise<ServerData> {
    const serverData: ServerData = {
      guildId: guild.id,
      guildName: guild.name,
      scrapedAt: new Date().toISOString(),
      channels: [],
      messages: [],
      totalMessages: 0,
      totalChannels: 0,
    };

    // Get all text channels
    const textChannels = guild.channels.cache.filter(
      channel => channel.isTextBased() && !channel.isDMBased()
    );

    for (const [, channel] of textChannels) {
      try {
        const textChannel = channel as TextChannel;

        // Skip if we can't view the channel
        if (!textChannel.viewable) continue;

        const channelData: ScrapedChannel = {
          id: textChannel.id,
          name: textChannel.name,
          type: textChannel.type.toString(),
          messageCount: 0,
        };

        // Fetch messages
        const messages = await this.fetchAllMessages(textChannel, limit);

        for (const msg of messages) {
          const scrapedMsg: ScrapedMessage = {
            id: msg.id,
            channelId: textChannel.id,
            channelName: textChannel.name,
            authorId: msg.author.id,
            authorName: msg.author.username,
            authorBot: msg.author.bot,
            content: msg.content,
            timestamp: msg.createdAt.toISOString(),
            attachments: msg.attachments.map(a => a.url),
            embeds: msg.embeds.length,
          };

          serverData.messages.push(scrapedMsg);
          channelData.messageCount++;
        }

        serverData.channels.push(channelData);
        serverData.totalChannels++;
        serverData.totalMessages += channelData.messageCount;

      } catch (error) {
        console.error(`[Scraper] Error scraping channel:`, error);
      }
    }

    // Save to file
    await this.saveData(guild.id, serverData);

    return serverData;
  }

  /**
   * Fetch all messages from a channel (up to limit)
   */
  private async fetchAllMessages(
    channel: TextChannel | ThreadChannel,
    limit: number
  ): Promise<Message[]> {
    const messages: Message[] = [];
    let lastId: string | undefined;

    while (messages.length < limit) {
      const options: { limit: number; before?: string } = { limit: Math.min(100, limit - messages.length) };
      if (lastId) options.before = lastId;

      try {
        const fetched = await channel.messages.fetch(options);
        if (fetched.size === 0) break;

        messages.push(...fetched.values());
        lastId = fetched.last()?.id;

        if (fetched.size < 100) break;
      } catch {
        break;
      }
    }

    return messages;
  }

  /**
   * Save scraped data to JSON file
   */
  private async saveData(guildId: string, data: ServerData): Promise<void> {
    const filePath = path.join(this.dataPath, `${guildId}_data.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`[Scraper] Saved data to ${filePath}`);
  }

  /**
   * Load scraped data from JSON file
   */
  loadData(guildId: string): ServerData | null {
    const filePath = path.join(this.dataPath, `${guildId}_data.json`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Search messages in scraped data
   */
  searchMessages(guildId: string, query: string, limit: number = 10): ScrapedMessage[] {
    const data = this.loadData(guildId);
    if (!data) return [];

    const lowerQuery = query.toLowerCase();
    return data.messages
      .filter(msg =>
        msg.content.toLowerCase().includes(lowerQuery) ||
        msg.authorName.toLowerCase().includes(lowerQuery) ||
        msg.channelName.toLowerCase().includes(lowerQuery)
      )
      .slice(0, limit);
  }

  /**
   * Get recent messages from a specific channel
   */
  getChannelMessages(guildId: string, channelName: string, limit: number = 20): ScrapedMessage[] {
    const data = this.loadData(guildId);
    if (!data) return [];

    const lowerChannelName = channelName.toLowerCase();
    return data.messages
      .filter(msg => msg.channelName.toLowerCase().includes(lowerChannelName))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get context summary for AI
   */
  getContextSummary(guildId: string): string {
    const data = this.loadData(guildId);
    if (!data) return 'No server data available. Use /scrape to collect data.';

    const recentMessages = data.messages
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);

    const channelSummary = data.channels
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 10)
      .map(c => `#${c.name}: ${c.messageCount} messages`)
      .join('\n');

    const recentActivity = recentMessages
      .slice(0, 10)
      .map(m => `[#${m.channelName}] ${m.authorName}: ${m.content.substring(0, 100)}`)
      .join('\n');

    return `SERVER CONTEXT (${data.guildName}):
Scraped: ${data.scrapedAt}
Total channels: ${data.totalChannels}
Total messages: ${data.totalMessages}

TOP CHANNELS:
${channelSummary}

RECENT ACTIVITY:
${recentActivity}`;
  }
}
