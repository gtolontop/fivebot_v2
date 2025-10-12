import { Client, TextChannel, ThreadChannel, Webhook, WebhookClient } from 'discord.js';

export class TicketWebhookService {
  private client: Client;
  private webhookCache: Map<string, WebhookClient> = new Map();

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Get or create a webhook for a channel
   */
  async getWebhook(channelId: string): Promise<WebhookClient | null> {
    try {
      // Check cache first
      if (this.webhookCache.has(channelId)) {
        return this.webhookCache.get(channelId)!;
      }

      const channel = await this.client.channels.fetch(channelId);

      if (!channel) {
        console.error(`Channel ${channelId} not found`);
        return null;
      }

      // Threads don't support webhooks directly, get parent channel
      let webhookChannel: TextChannel;
      if (channel.isThread()) {
        const thread = channel as ThreadChannel;
        const parent = await this.client.channels.fetch(thread.parentId!);
        if (!parent || !(parent instanceof TextChannel)) {
          console.error(`Parent channel not found for thread ${channelId}`);
          return null;
        }
        webhookChannel = parent;
      } else if (channel instanceof TextChannel) {
        webhookChannel = channel;
      } else {
        console.error(`Channel ${channelId} is not a text channel or thread (type: ${channel.type})`);
        return null;
      }

      // Fetch existing webhooks
      const webhooks = await webhookChannel.fetchWebhooks();
      let webhook = webhooks.find(wh => wh.name === 'FiveBot Tickets');

      // Create webhook if it doesn't exist
      if (!webhook) {
        webhook = await webhookChannel.createWebhook({
          name: 'FiveBot Tickets',
          reason: 'Webhook for dashboard ticket messages'
        });
      }

      // Create webhook client
      const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token! });

      // Cache it
      this.webhookCache.set(channelId, webhookClient);

      return webhookClient;
    } catch (error) {
      console.error(`Error getting webhook for channel ${channelId}:`, error);
      return null;
    }
  }

  /**
   * Send a message via webhook
   */
  async sendMessage(
    channelId: string,
    content: string,
    username: string,
    avatarURL?: string
  ): Promise<boolean> {
    try {
      const webhook = await this.getWebhook(channelId);

      if (!webhook) {
        console.error('Failed to get webhook');
        return false;
      }

      // Check if it's a thread
      const channel = await this.client.channels.fetch(channelId);
      const threadId = channel?.isThread() ? channelId : undefined;

      await webhook.send({
        content,
        username,
        avatarURL,
        threadId
      });

      return true;
    } catch (error) {
      console.error('Error sending webhook message:', error);
      return false;
    }
  }

  /**
   * Clear webhook cache for a channel
   */
  clearCache(channelId: string) {
    this.webhookCache.delete(channelId);
  }

  /**
   * Clear all webhook cache
   */
  clearAllCache() {
    this.webhookCache.clear();
  }
}
