import { Client, EmbedBuilder, User, Guild, TextChannel } from 'discord.js';
import { Ticket, TicketConfig } from '@prisma/client';
import { TicketService } from './ticket.service';

interface NotificationTemplate {
  subject: string;
  embedColor: number;
  embedTitle: string;
  embedDescription: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

export class TicketNotificationService {
  private client: Client;
  private ticketService: TicketService;

  constructor(client: Client, ticketService: TicketService) {
    this.client = client;
    this.ticketService = ticketService;
  }

  // Send notification to user
  async notifyUser(
    userId: string,
    template: NotificationTemplate,
    variables: Record<string, string> = {}
  ): Promise<boolean> {
    try {
      const user = await this.client.users.fetch(userId);
      if (!user) return false;

      const embed = this.buildEmbed(template, variables);
      await user.send({ embeds: [embed] });
      
      return true;
    } catch (error) {
      // User has DMs disabled or bot is blocked
      console.warn(`[TicketNotification] Could not DM user ${userId}:`, error);
      return false;
    }
  }

  // Send notification to log channel
  async notifyLogChannel(
    guildId: string,
    template: NotificationTemplate,
    variables: Record<string, string> = {}
  ): Promise<boolean> {
    try {
      const config = await this.ticketService.getConfig(guildId);
      if (!config || !config.logChannelId) return false;

      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) return false;

      const channel = await guild.channels.fetch(config.logChannelId) as TextChannel;
      if (!channel || !channel.isTextBased()) return false;

      const embed = this.buildEmbed(template, variables);
      await channel.send({ embeds: [embed] });
      
      return true;
    } catch (error) {
      console.error('[TicketNotification] Error sending to log channel:', error);
      return false;
    }
  }

  // Ticket created notification
  async sendTicketCreated(ticket: Ticket, creator: User): Promise<void> {
    const guild = this.client.guilds.cache.get(ticket.guildId);
    if (!guild) return;

    const variables = {
      ticketNumber: ticket.ticketNumber.toString(),
      ticketId: ticket.id,
      username: creator.username,
      userId: creator.id,
      guildName: guild.name,
      channelId: ticket.threadId || ticket.channelId || 'unknown'
    };

    // Notify creator
    const creatorTemplate: NotificationTemplate = {
      subject: 'Ticket Created',
      embedColor: 0x00FF00,
      embedTitle: '🎫 Ticket Created',
      embedDescription: `Your ticket #${variables.ticketNumber} has been created in ${variables.guildName}.`,
      fields: [
        {
          name: 'Ticket Number',
          value: `#${variables.ticketNumber}`,
          inline: true
        },
        {
          name: 'Access Your Ticket',
          value: `[Click here](https://discord.com/channels/${ticket.guildId}/${variables.channelId})`,
          inline: true
        }
      ]
    };

    await this.notifyUser(creator.id, creatorTemplate, variables);

    // Log channel notification
    const logTemplate: NotificationTemplate = {
      subject: 'New Ticket',
      embedColor: 0x5865F2,
      embedTitle: '🎫 New Ticket Created',
      embedDescription: `A new ticket has been created by ${creator}.`,
      fields: [
        {
          name: 'Ticket',
          value: `#${variables.ticketNumber}`,
          inline: true
        },
        {
          name: 'Creator',
          value: `<@${creator.id}>`,
          inline: true
        },
        {
          name: 'Channel',
          value: `<#${variables.channelId}>`,
          inline: true
        }
      ]
    };

    await this.notifyLogChannel(ticket.guildId, logTemplate, variables);
  }

  // Ticket closed notification
  async sendTicketClosed(
    ticket: Ticket,
    closedBy: User,
    reason?: string
  ): Promise<void> {
    const guild = this.client.guilds.cache.get(ticket.guildId);
    if (!guild) return;

    const variables = {
      ticketNumber: ticket.ticketNumber.toString(),
      closedBy: closedBy.username,
      closedById: closedBy.id,
      reason: reason || 'No reason provided',
      guildName: guild.name
    };

    // Notify creator
    if (ticket.creatorId !== closedBy.id) {
      const creatorTemplate: NotificationTemplate = {
        subject: 'Ticket Closed',
        embedColor: 0xE74C3C,
        embedTitle: '🔒 Ticket Closed',
        embedDescription: `Your ticket #${variables.ticketNumber} in ${variables.guildName} has been closed.`,
        fields: [
          {
            name: 'Closed By',
            value: closedBy.tag,
            inline: true
          },
          {
            name: 'Reason',
            value: variables.reason,
            inline: true
          }
        ]
      };

      await this.notifyUser(ticket.creatorId, creatorTemplate, variables);
    }

    // Log channel notification
    const logTemplate: NotificationTemplate = {
      subject: 'Ticket Closed',
      embedColor: 0xE74C3C,
      embedTitle: '🔒 Ticket Closed',
      embedDescription: `Ticket #${variables.ticketNumber} has been closed.`,
      fields: [
        {
          name: 'Closed By',
          value: `<@${closedBy.id}>`,
          inline: true
        },
        {
          name: 'Reason',
          value: variables.reason,
          inline: false
        }
      ]
    };

    await this.notifyLogChannel(ticket.guildId, logTemplate, variables);
  }

  // Ticket assigned notification
  async sendTicketAssigned(
    ticket: Ticket,
    assignedTo: User,
    assignedBy: User
  ): Promise<void> {
    const guild = this.client.guilds.cache.get(ticket.guildId);
    if (!guild) return;

    const variables = {
      ticketNumber: ticket.ticketNumber.toString(),
      assignedTo: assignedTo.username,
      assignedBy: assignedBy.username,
      guildName: guild.name,
      channelId: ticket.threadId || ticket.channelId || 'unknown'
    };

    // Notify assigned staff
    const staffTemplate: NotificationTemplate = {
      subject: 'Ticket Assigned',
      embedColor: 0xFFA500,
      embedTitle: '📥 Ticket Assigned',
      embedDescription: `You have been assigned ticket #${variables.ticketNumber} in ${variables.guildName}.`,
      fields: [
        {
          name: 'Assigned By',
          value: assignedBy.tag,
          inline: true
        },
        {
          name: 'Access Ticket',
          value: `<#${variables.channelId}>`,
          inline: true
        }
      ]
    };

    await this.notifyUser(assignedTo.id, staffTemplate, variables);
  }

  // Build embed from template
  private buildEmbed(
    template: NotificationTemplate,
    variables: Record<string, string>
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(template.embedColor)
      .setTitle(this.processVariables(template.embedTitle, variables))
      .setDescription(this.processVariables(template.embedDescription, variables))
      .setTimestamp();

    if (template.fields) {
      for (const field of template.fields) {
        embed.addFields({
          name: this.processVariables(field.name, variables),
          value: this.processVariables(field.value, variables),
          inline: field.inline || false
        });
      }
    }

    return embed;
  }

  // Process variables in text
  private processVariables(
    text: string,
    variables: Record<string, string>
  ): string {
    let processed = text;
    for (const [key, value] of Object.entries(variables)) {
      processed = processed.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return processed;
  }

  // Send custom notification
  async sendCustomNotification(
    userId: string,
    guildId: string,
    embedData: {
      color?: number;
      title: string;
      description: string;
      fields?: Array<{ name: string; value: string; inline?: boolean }>;
      footer?: { text: string };
    }
  ): Promise<boolean> {
    try {
      const user = await this.client.users.fetch(userId);
      const guild = this.client.guilds.cache.get(guildId);
      
      if (!user || !guild) return false;

      const embed = new EmbedBuilder()
        .setColor(embedData.color || 0x5865F2)
        .setTitle(embedData.title)
        .setDescription(embedData.description)
        .setTimestamp();

      if (embedData.fields) {
        embed.addFields(embedData.fields);
      }

      if (embedData.footer) {
        embed.setFooter(embedData.footer);
      }

      await user.send({ embeds: [embed] });
      return true;
    } catch (error) {
      console.error('[TicketNotification] Error sending custom notification:', error);
      return false;
    }
  }
}