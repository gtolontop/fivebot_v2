import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AutoResponder, TriggerType, Prisma } from '@prisma/client';
import { CreateAutoResponderDto, UpdateAutoResponderDto, UpdateAutoResponderConfigDto } from './dto';

@Injectable()
export class AutoRespondersService {
  private readonly logger = new Logger(AutoRespondersService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get or create auto-responder configuration for a guild
   */
  async getConfig(guildId: string) {
    let config = await this.prisma.autoResponderConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      // Auto-create config if it doesn't exist
      config = await this.prisma.autoResponderConfig.create({
        data: {
          guildId,
          botId: '', // Will be set when updated
        },
      });
    }

    return config;
  }

  /**
   * Update auto-responder configuration
   */
  async updateConfig(guildId: string, botId: string, data: UpdateAutoResponderConfigDto) {
    const config = await this.getConfig(guildId);

    return this.prisma.autoResponderConfig.update({
      where: { id: config.id },
      data: {
        ...data,
        botId,
      },
    });
  }

  /**
   * Get all auto-responders for a guild
   */
  async getResponders(guildId: string) {
    return this.prisma.autoResponder.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific auto-responder by ID
   */
  async getResponder(responderId: string) {
    const responder = await this.prisma.autoResponder.findUnique({
      where: { id: responderId },
    });

    if (!responder) {
      throw new NotFoundException(`Auto-responder with ID ${responderId} not found`);
    }

    return responder;
  }

  /**
   * Create a new auto-responder
   */
  async createResponder(guildId: string, botId: string, data: CreateAutoResponderDto) {
    // Get or create config
    const config = await this.getConfig(guildId);

    // Update botId if not set
    if (!config.botId || config.botId === '') {
      await this.prisma.autoResponderConfig.update({
        where: { id: config.id },
        data: { botId },
      });
    }

    // Validate that at least response or embedJson is provided
    if (!data.response && !data.embedJson && !data.reactionEmojis) {
      throw new BadRequestException('At least one of response, embedJson, or reactionEmojis must be provided');
    }

    // Prepare data for creation
    const createData: Prisma.AutoResponderCreateInput = {
      name: data.name,
      trigger: data.trigger,
      triggerType: data.triggerType || TriggerType.CONTAINS,
      caseSensitive: data.caseSensitive ?? false,
      response: data.response,
      embedJson: data.embedJson,
      reactionEmojis: data.reactionEmojis,
      deleteOriginal: data.deleteOriginal ?? false,
      replyToMessage: data.replyToMessage ?? true,
      dmResponse: data.dmResponse ?? false,
      allowedChannels: data.allowedChannels ? JSON.stringify(data.allowedChannels) : null,
      ignoredChannels: data.ignoredChannels ? JSON.stringify(data.ignoredChannels) : null,
      allowedRoles: data.allowedRoles ? JSON.stringify(data.allowedRoles) : null,
      ignoredRoles: data.ignoredRoles ? JSON.stringify(data.ignoredRoles) : null,
      guildId,
      config: {
        connect: { id: config.id },
      },
    };

    return this.prisma.autoResponder.create({
      data: createData,
    });
  }

  /**
   * Update an existing auto-responder
   */
  async updateResponder(responderId: string, data: UpdateAutoResponderDto) {
    // Check if responder exists
    await this.getResponder(responderId);

    // Prepare update data
    const updateData: any = {
      ...data,
    };

    // Handle array fields
    if (data.allowedChannels !== undefined) {
      updateData.allowedChannels = data.allowedChannels ? JSON.stringify(data.allowedChannels) : null;
    }
    if (data.ignoredChannels !== undefined) {
      updateData.ignoredChannels = data.ignoredChannels ? JSON.stringify(data.ignoredChannels) : null;
    }
    if (data.allowedRoles !== undefined) {
      updateData.allowedRoles = data.allowedRoles ? JSON.stringify(data.allowedRoles) : null;
    }
    if (data.ignoredRoles !== undefined) {
      updateData.ignoredRoles = data.ignoredRoles ? JSON.stringify(data.ignoredRoles) : null;
    }

    return this.prisma.autoResponder.update({
      where: { id: responderId },
      data: updateData,
    });
  }

  /**
   * Delete an auto-responder
   */
  async deleteResponder(responderId: string) {
    // Check if responder exists
    await this.getResponder(responderId);

    await this.prisma.autoResponder.delete({
      where: { id: responderId },
    });

    return { success: true, message: 'Auto-responder deleted successfully' };
  }

  /**
   * Toggle auto-responder active status
   */
  async toggleResponder(responderId: string, isActive: boolean) {
    // Check if responder exists
    await this.getResponder(responderId);

    return this.prisma.autoResponder.update({
      where: { id: responderId },
      data: { isActive },
    });
  }

  /**
   * Check if a message matches any active auto-responders
   */
  async checkMessage(
    guildId: string,
    content: string,
    channelId: string,
    userId: string,
    roleIds: string[],
  ): Promise<AutoResponder[]> {
    // Get config
    const config = await this.getConfig(guildId);

    if (!config.enabled) {
      return [];
    }

    // Get all active responders for this guild
    const responders = await this.prisma.autoResponder.findMany({
      where: {
        guildId,
        isActive: true,
      },
    });

    const matches: AutoResponder[] = [];

    for (const responder of responders) {
      // Check channel restrictions
      if (responder.allowedChannels) {
        const allowedChannels = JSON.parse(responder.allowedChannels);
        if (allowedChannels.length > 0 && !allowedChannels.includes(channelId)) {
          continue;
        }
      }

      if (responder.ignoredChannels) {
        const ignoredChannels = JSON.parse(responder.ignoredChannels);
        if (ignoredChannels.includes(channelId)) {
          continue;
        }
      }

      // Check role restrictions
      if (responder.allowedRoles) {
        const allowedRoles = JSON.parse(responder.allowedRoles);
        if (allowedRoles.length > 0) {
          const hasAllowedRole = roleIds.some((roleId) => allowedRoles.includes(roleId));
          if (!hasAllowedRole) {
            continue;
          }
        }
      }

      if (responder.ignoredRoles) {
        const ignoredRoles = JSON.parse(responder.ignoredRoles);
        const hasIgnoredRole = roleIds.some((roleId) => ignoredRoles.includes(roleId));
        if (hasIgnoredRole) {
          continue;
        }
      }

      // Check trigger match
      if (this.matchesTrigger(content, responder)) {
        matches.push(responder);
      }
    }

    return matches;
  }

  /**
   * Check if content matches a responder's trigger
   */
  private matchesTrigger(content: string, responder: AutoResponder): boolean {
    let messageContent = content;
    let trigger = responder.trigger;

    if (!responder.caseSensitive) {
      messageContent = messageContent.toLowerCase();
      trigger = trigger.toLowerCase();
    }

    switch (responder.triggerType) {
      case TriggerType.EXACT:
        return messageContent === trigger;

      case TriggerType.CONTAINS:
        return messageContent.includes(trigger);

      case TriggerType.STARTS_WITH:
        return messageContent.startsWith(trigger);

      case TriggerType.ENDS_WITH:
        return messageContent.endsWith(trigger);

      case TriggerType.REGEX:
        try {
          const flags = responder.caseSensitive ? '' : 'i';
          const regex = new RegExp(responder.trigger, flags);
          return regex.test(content);
        } catch (error) {
          this.logger.error(`Invalid regex pattern in responder ${responder.id}: ${error.message}`);
          return false;
        }

      case TriggerType.WILDCARD:
        try {
          // Convert wildcard pattern to regex
          const pattern = trigger
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
            .replace(/\*/g, '.*') // Replace * with .*
            .replace(/\?/g, '.'); // Replace ? with .
          const flags = responder.caseSensitive ? '' : 'i';
          const regex = new RegExp(`^${pattern}$`, flags);
          return regex.test(messageContent);
        } catch (error) {
          this.logger.error(`Invalid wildcard pattern in responder ${responder.id}: ${error.message}`);
          return false;
        }

      default:
        return false;
    }
  }

  /**
   * Increment use count for an auto-responder
   */
  async incrementUses(responderId: string) {
    return this.prisma.autoResponder.update({
      where: { id: responderId },
      data: {
        uses: { increment: 1 },
        lastUsed: new Date(),
      },
    });
  }

  /**
   * Get statistics for auto-responders in a guild
   */
  async getStatistics(guildId: string) {
    const responders = await this.prisma.autoResponder.findMany({
      where: { guildId },
      select: {
        id: true,
        name: true,
        uses: true,
        lastUsed: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { uses: 'desc' },
    });

    const totalUses = responders.reduce((sum, r) => sum + r.uses, 0);
    const activeCount = responders.filter((r) => r.isActive).length;
    const inactiveCount = responders.filter((r) => !r.isActive).length;

    return {
      totalResponders: responders.length,
      activeResponders: activeCount,
      inactiveResponders: inactiveCount,
      totalUses,
      responders,
    };
  }
}
