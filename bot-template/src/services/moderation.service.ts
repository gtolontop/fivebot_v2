import { PrismaClient } from '@prisma/client';
import { Guild, User, EmbedBuilder, TextChannel, GuildMember } from 'discord.js';

interface ModerationConfigData {
  guildId: string;
  botId: string;
  enabled?: boolean;
  modLogChannelId?: string;
  mutedRoleId?: string;
  moderatorRoleIds?: string[];
  autoModEnabled?: boolean;
  dmOnAction?: boolean;
  warnThreshold?: number;
  warnActionType?: string;
  warnActionDuration?: number;
}

interface ModerationCaseData {
  guildId: string;
  userId: string;
  moderatorId: string;
  action: string;
  reason?: string;
  duration?: number;
  evidence?: any;
  notes?: string;
}

export class ModerationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get moderation configuration for a guild
   */
  async getConfig(guildId: string): Promise<any | null> {
    try {
      const config = await this.prisma.moderationConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        return null;
      }

      // Parse JSON fields
      const parsed = { ...config } as any;
      if (parsed.moderatorRoleIds && typeof parsed.moderatorRoleIds === 'string') {
        try {
          parsed.moderatorRoleIds = JSON.parse(parsed.moderatorRoleIds);
        } catch (e) {
          parsed.moderatorRoleIds = [];
        }
      }

      return parsed;
    } catch (error) {
      console.error('[ModerationService] Error fetching config:', error);
      return null;
    }
  }

  /**
   * Create moderation configuration for a guild
   */
  async createConfig(data: ModerationConfigData): Promise<any> {
    try {
      const config = await this.prisma.moderationConfig.create({
        data: {
          guildId: data.guildId,
          botId: data.botId,
          enabled: data.enabled ?? true,
          modLogChannelId: data.modLogChannelId,
          mutedRoleId: data.mutedRoleId,
          moderatorRoleIds: data.moderatorRoleIds ? JSON.stringify(data.moderatorRoleIds) : null,
          autoModEnabled: data.autoModEnabled ?? false,
          dmOnAction: data.dmOnAction ?? true,
          warnThreshold: data.warnThreshold ?? 3,
          warnActionType: data.warnActionType,
          warnActionDuration: data.warnActionDuration,
        },
      });

      return config;
    } catch (error) {
      console.error('[ModerationService] Error creating config:', error);
      throw error;
    }
  }

  /**
   * Update moderation configuration
   */
  async updateConfig(guildId: string, data: Partial<ModerationConfigData>): Promise<any> {
    try {
      const updateData: any = { ...data };

      if (data.moderatorRoleIds) {
        updateData.moderatorRoleIds = JSON.stringify(data.moderatorRoleIds);
      }

      const config = await this.prisma.moderationConfig.update({
        where: { guildId },
        data: updateData,
      });

      return config;
    } catch (error) {
      console.error('[ModerationService] Error updating config:', error);
      throw error;
    }
  }

  /**
   * Get next case number for a guild
   */
  async getNextCaseNumber(guildId: string): Promise<number> {
    try {
      const lastCase = await this.prisma.moderationCase.findFirst({
        where: { guildId },
        orderBy: { caseNumber: 'desc' },
      });

      return (lastCase?.caseNumber || 0) + 1;
    } catch (error) {
      console.error('[ModerationService] Error getting next case number:', error);
      return 1;
    }
  }

  /**
   * Create a moderation case
   */
  async createCase(data: ModerationCaseData): Promise<any> {
    try {
      const caseNumber = await this.getNextCaseNumber(data.guildId);

      const caseData: any = {
        guildId: data.guildId,
        caseNumber,
        userId: data.userId,
        moderatorId: data.moderatorId,
        action: data.action,
        reason: data.reason || 'No reason provided',
        duration: data.duration,
        notes: data.notes,
      };

      // Set expiration date for temporary actions
      if (data.duration && data.duration > 0) {
        caseData.expiresAt = new Date(Date.now() + data.duration * 60 * 1000);
      }

      // Store evidence as JSON string
      if (data.evidence) {
        caseData.evidence = JSON.stringify(data.evidence);
      }

      const modCase = await this.prisma.moderationCase.create({
        data: caseData,
      });

      return modCase;
    } catch (error) {
      console.error('[ModerationService] Error creating case:', error);
      throw error;
    }
  }

  /**
   * Get a moderation case by case number
   */
  async getCase(guildId: string, caseNumber: number): Promise<any | null> {
    try {
      const modCase = await this.prisma.moderationCase.findUnique({
        where: {
          guildId_caseNumber: {
            guildId,
            caseNumber,
          },
        },
      });

      if (!modCase) {
        return null;
      }

      // Parse JSON fields
      const parsed = { ...modCase } as any;
      if (parsed.evidence && typeof parsed.evidence === 'string') {
        try {
          parsed.evidence = JSON.parse(parsed.evidence);
        } catch (e) {
          parsed.evidence = null;
        }
      }

      return parsed;
    } catch (error) {
      console.error('[ModerationService] Error fetching case:', error);
      return null;
    }
  }

  /**
   * Get all cases for a user
   */
  async getUserCases(guildId: string, userId: string): Promise<any[]> {
    try {
      const cases = await this.prisma.moderationCase.findMany({
        where: {
          guildId,
          userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return cases.map(c => {
        const parsed = { ...c } as any;
        if (parsed.evidence && typeof parsed.evidence === 'string') {
          try {
            parsed.evidence = JSON.parse(parsed.evidence);
          } catch (e) {
            parsed.evidence = null;
          }
        }
        return parsed;
      });
    } catch (error) {
      console.error('[ModerationService] Error fetching user cases:', error);
      return [];
    }
  }

  /**
   * Get warnings for a user
   */
  async getUserWarnings(guildId: string, userId: string): Promise<any[]> {
    try {
      const warnings = await this.prisma.moderationCase.findMany({
        where: {
          guildId,
          userId,
          action: 'warn',
          resolved: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return warnings;
    } catch (error) {
      console.error('[ModerationService] Error fetching warnings:', error);
      return [];
    }
  }

  /**
   * Update case reason
   */
  async updateCaseReason(guildId: string, caseNumber: number, reason: string): Promise<any> {
    try {
      const modCase = await this.prisma.moderationCase.update({
        where: {
          guildId_caseNumber: {
            guildId,
            caseNumber,
          },
        },
        data: {
          reason,
          updatedAt: new Date(),
        },
      });

      return modCase;
    } catch (error) {
      console.error('[ModerationService] Error updating case reason:', error);
      throw error;
    }
  }

  /**
   * Update case log message ID
   */
  async updateCaseLogMessage(guildId: string, caseNumber: number, messageId: string): Promise<void> {
    try {
      await this.prisma.moderationCase.update({
        where: {
          guildId_caseNumber: {
            guildId,
            caseNumber,
          },
        },
        data: {
          logMessageId: messageId,
        },
      });
    } catch (error) {
      console.error('[ModerationService] Error updating case log message:', error);
    }
  }

  /**
   * Mark case as DM sent
   */
  async markDMSent(guildId: string, caseNumber: number): Promise<void> {
    try {
      await this.prisma.moderationCase.update({
        where: {
          guildId_caseNumber: {
            guildId,
            caseNumber,
          },
        },
        data: {
          messagesSent: true,
        },
      });
    } catch (error) {
      console.error('[ModerationService] Error marking DM sent:', error);
    }
  }

  /**
   * Clear warnings for a user
   */
  async clearWarnings(guildId: string, userId: string, caseNumber?: number): Promise<number> {
    try {
      if (caseNumber) {
        // Clear specific warning
        await this.prisma.moderationCase.update({
          where: {
            guildId_caseNumber: {
              guildId,
              caseNumber,
            },
          },
          data: {
            resolved: true,
            resolvedAt: new Date(),
          },
        });
        return 1;
      } else {
        // Clear all warnings
        const result = await this.prisma.moderationCase.updateMany({
          where: {
            guildId,
            userId,
            action: 'warn',
            resolved: false,
          },
          data: {
            resolved: true,
            resolvedAt: new Date(),
          },
        });
        return result.count;
      }
    } catch (error) {
      console.error('[ModerationService] Error clearing warnings:', error);
      throw error;
    }
  }

  /**
   * Send moderation log to channel
   */
  async sendModLog(
    guild: Guild,
    modCase: any,
    moderator: User,
    target: User
  ): Promise<void> {
    try {
      const config = await this.getConfig(guild.id);
      if (!config || !config.modLogChannelId) {
        return;
      }

      const logChannel = guild.channels.cache.get(config.modLogChannelId) as TextChannel;
      if (!logChannel) {
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`${this.getActionEmoji(modCase.action)} Case #${modCase.caseNumber} | ${this.capitalizeAction(modCase.action)}`)
        .setColor(this.getActionColor(modCase.action))
        .addFields(
          { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
          { name: 'Moderator', value: `${moderator.tag}`, inline: true },
          { name: 'Reason', value: modCase.reason || 'No reason provided', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `User ID: ${target.id}` });

      if (modCase.duration) {
        embed.addFields({
          name: 'Duration',
          value: this.formatDuration(modCase.duration),
          inline: true,
        });
      }

      const message = await logChannel.send({ embeds: [embed] });

      // Update case with log message ID
      await this.updateCaseLogMessage(guild.id, modCase.caseNumber, message.id);
    } catch (error) {
      console.error('[ModerationService] Error sending mod log:', error);
    }
  }

  /**
   * Send DM to user about moderation action
   */
  async sendUserDM(
    user: User,
    guild: Guild,
    modCase: any
  ): Promise<boolean> {
    try {
      const embed = new EmbedBuilder()
        .setTitle(`${this.getActionEmoji(modCase.action)} ${this.capitalizeAction(modCase.action)} in ${guild.name}`)
        .setColor(this.getActionColor(modCase.action))
        .addFields(
          { name: 'Reason', value: modCase.reason || 'No reason provided', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Case #${modCase.caseNumber}` });

      if (modCase.duration) {
        embed.addFields({
          name: 'Duration',
          value: this.formatDuration(modCase.duration),
          inline: true,
        });
      }

      await user.send({ embeds: [embed] });
      await this.markDMSent(guild.id, modCase.caseNumber);
      return true;
    } catch (error) {
      console.error('[ModerationService] Error sending user DM:', error);
      return false;
    }
  }

  /**
   * Check if user has moderator permissions
   */
  async canModerate(member: GuildMember, guildId: string): Promise<boolean> {
    // Check if user has admin/moderator permissions
    if (member.permissions.has('Administrator') || member.permissions.has('ModerateMembers')) {
      return true;
    }

    // Check if user has a moderator role
    const config = await this.getConfig(guildId);
    if (config && config.moderatorRoleIds) {
      const roleIds = Array.isArray(config.moderatorRoleIds)
        ? config.moderatorRoleIds
        : [];

      return member.roles.cache.some(role => roleIds.includes(role.id));
    }

    return false;
  }

  /**
   * Get action emoji
   */
  private getActionEmoji(action: string): string {
    const emojis: Record<string, string> = {
      warn: '⚠️',
      mute: '🔇',
      unmute: '🔊',
      kick: '👢',
      ban: '🔨',
      unban: '🔓',
      softban: '🧹',
      timeout: '⏱️',
      untimeout: '⏰',
    };
    return emojis[action.toLowerCase()] || '📝';
  }

  /**
   * Get action color
   */
  private getActionColor(action: string): number {
    const colors: Record<string, number> = {
      warn: 0xFFFF00,
      mute: 0xFFA500,
      unmute: 0x00FF00,
      kick: 0xFF8C00,
      ban: 0xFF0000,
      unban: 0x00FF00,
      softban: 0xFF69B4,
      timeout: 0xFFA500,
      untimeout: 0x00FF00,
    };
    return colors[action.toLowerCase()] || 0x808080;
  }

  /**
   * Capitalize action name
   */
  private capitalizeAction(action: string): string {
    return action.charAt(0).toUpperCase() + action.slice(1);
  }

  /**
   * Format duration in minutes to readable string
   */
  private formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Parse duration string to minutes
   */
  parseDuration(duration: string): number | null {
    const match = duration.match(/^(\d+)([smhdw])$/);
    if (!match) {
      return null;
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return Math.ceil(value / 60);
      case 'm':
        return value;
      case 'h':
        return value * 60;
      case 'd':
        return value * 1440;
      case 'w':
        return value * 10080;
      default:
        return null;
    }
  }
}
