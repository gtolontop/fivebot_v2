import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateWelcomeConfigDto } from './dto/update-welcome-config.dto';
import { WelcomeImageService, MemberData } from './welcome-image.service';

export interface Member {
  id: string;
  username: string;
  discriminator?: string;
  avatar?: string;
  bot?: boolean;
}

export interface Guild {
  id: string;
  name: string;
  memberCount: number;
}

@Injectable()
export class WelcomeService {
  private readonly logger = new Logger(WelcomeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly welcomeImageService: WelcomeImageService,
  ) {}

  /**
   * Get welcome configuration for a guild
   * @param guildId - Guild ID
   */
  async getConfig(guildId: string): Promise<any> {
    try {
      const config = await this.prisma.welcomeConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        throw new NotFoundException('Welcome config not found');
      }

      // Parse JSON fields
      return {
        ...config,
        welcomeEmbed: config.welcomeEmbed
          ? JSON.parse(config.welcomeEmbed)
          : null,
        leaveEmbed: config.leaveEmbed ? JSON.parse(config.leaveEmbed) : null,
        autoRoles: config.autoRoles ? JSON.parse(config.autoRoles) : [],
      };
    } catch (error) {
      this.logger.error(`Failed to get config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update welcome configuration
   * @param guildId - Guild ID
   * @param data - Update data
   */
  async updateConfig(
    guildId: string,
    data: UpdateWelcomeConfigDto,
  ): Promise<any> {
    try {
      const config = await this.prisma.welcomeConfig.findUnique({
        where: { guildId },
      });

      if (!config) {
        throw new NotFoundException('Welcome config not found');
      }

      // Stringify JSON fields if provided
      const updateData: any = { ...data };
      if (data.welcomeEmbed) {
        updateData.welcomeEmbed =
          typeof data.welcomeEmbed === 'string'
            ? data.welcomeEmbed
            : JSON.stringify(data.welcomeEmbed);
      }
      if (data.leaveEmbed) {
        updateData.leaveEmbed =
          typeof data.leaveEmbed === 'string'
            ? data.leaveEmbed
            : JSON.stringify(data.leaveEmbed);
      }
      if (data.autoRoles) {
        updateData.autoRoles =
          typeof data.autoRoles === 'string'
            ? data.autoRoles
            : JSON.stringify(data.autoRoles);
      }

      const updated = await this.prisma.welcomeConfig.update({
        where: { guildId },
        data: updateData,
      });

      // Parse JSON fields for response
      return {
        ...updated,
        welcomeEmbed: updated.welcomeEmbed
          ? JSON.parse(updated.welcomeEmbed)
          : null,
        leaveEmbed: updated.leaveEmbed ? JSON.parse(updated.leaveEmbed) : null,
        autoRoles: updated.autoRoles ? JSON.parse(updated.autoRoles) : [],
      };
    } catch (error) {
      this.logger.error(
        `Failed to update config: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle member join event
   * @param guildId - Guild ID
   * @param member - Member who joined
   * @param guild - Guild information
   */
  async handleMemberJoin(
    guildId: string,
    member: Member,
    guild: Guild,
  ): Promise<any> {
    try {
      const config = await this.prisma.welcomeConfig.findUnique({
        where: { guildId },
      });

      if (!config || !config.enabled || !config.welcomeEnabled) {
        return { success: false, reason: 'Welcome not enabled' };
      }

      const results = {
        messageSent: false,
        dmSent: false,
        imageSent: false,
        rolesApplied: false,
        errors: [] as string[],
      };

      // Send welcome message
      if (config.welcomeChannelId && config.welcomeMessage) {
        try {
          await this.sendWelcomeMessage(member, guild, config);
          results.messageSent = true;
        } catch (error) {
          this.logger.error(
            `Failed to send welcome message: ${error.message}`,
          );
          results.errors.push(`Welcome message: ${error.message}`);
        }
      }

      // Send welcome DM
      if (config.welcomeDM && config.welcomeDMMessage) {
        try {
          await this.sendWelcomeDM(member, guild, config);
          results.dmSent = true;
        } catch (error) {
          this.logger.error(`Failed to send welcome DM: ${error.message}`);
          results.errors.push(`Welcome DM: ${error.message}`);
        }
      }

      // Apply auto roles
      if (config.autoRoleEnabled && config.autoRoles) {
        try {
          await this.applyAutoRoles(member, config);
          results.rolesApplied = true;
        } catch (error) {
          this.logger.error(`Failed to apply auto roles: ${error.message}`);
          results.errors.push(`Auto roles: ${error.message}`);
        }
      }

      return { success: true, results };
    } catch (error) {
      this.logger.error(
        `Failed to handle member join: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle member leave event
   * @param guildId - Guild ID
   * @param member - Member who left
   * @param guild - Guild information
   */
  async handleMemberLeave(
    guildId: string,
    member: Member,
    guild: Guild,
  ): Promise<any> {
    try {
      const config = await this.prisma.welcomeConfig.findUnique({
        where: { guildId },
      });

      if (!config || !config.enabled || !config.leaveEnabled) {
        return { success: false, reason: 'Leave messages not enabled' };
      }

      if (!config.leaveChannelId || !config.leaveMessage) {
        return { success: false, reason: 'Leave channel or message not set' };
      }

      const results = {
        messageSent: false,
        imageSent: false,
        errors: [] as string[],
      };

      try {
        await this.sendLeaveMessage(member, guild, config);
        results.messageSent = true;
      } catch (error) {
        this.logger.error(`Failed to send leave message: ${error.message}`);
        results.errors.push(`Leave message: ${error.message}`);
      }

      return { success: true, results };
    } catch (error) {
      this.logger.error(
        `Failed to handle member leave: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate welcome image
   * @param member - Member data
   * @param guild - Guild data
   * @param config - Welcome configuration
   */
  async generateWelcomeImage(
    member: Member,
    guild: Guild,
    config: any,
  ): Promise<Buffer> {
    try {
      const memberData: MemberData = {
        username: member.username,
        discriminator: member.discriminator,
        avatarUrl: this.getAvatarUrl(member),
        memberCount: guild.memberCount,
        guildName: guild.name,
      };

      return await this.welcomeImageService.generateWelcomeImage(
        memberData,
        {
          welcomeImageBg: config.welcomeImageBg,
          welcomeImageColor: config.welcomeImageColor,
          welcomeImageFont: config.welcomeImageFont,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate welcome image: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate leave image
   * @param member - Member data
   * @param guild - Guild data
   * @param config - Welcome configuration
   */
  async generateLeaveImage(
    member: Member,
    guild: Guild,
    config: any,
  ): Promise<Buffer> {
    try {
      const memberData: MemberData = {
        username: member.username,
        discriminator: member.discriminator,
        avatarUrl: this.getAvatarUrl(member),
        memberCount: guild.memberCount,
        guildName: guild.name,
      };

      return await this.welcomeImageService.generateLeaveImage(memberData, {
        welcomeImageBg: config.leaveImageBg,
        welcomeImageColor: config.welcomeImageColor,
        welcomeImageFont: config.welcomeImageFont,
      });
    } catch (error) {
      this.logger.error(
        `Failed to generate leave image: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send welcome message to channel
   * @param member - Member who joined
   * @param guild - Guild information
   * @param config - Welcome configuration
   */
  async sendWelcomeMessage(
    member: Member,
    guild: Guild,
    config: any,
  ): Promise<void> {
    try {
      // Replace variables in message
      let message = config.welcomeMessage || '';
      message = this.replaceVariables(message, member, guild);

      // Parse embed if exists
      let embed = null;
      if (config.welcomeEmbed) {
        embed =
          typeof config.welcomeEmbed === 'string'
            ? JSON.parse(config.welcomeEmbed)
            : config.welcomeEmbed;

        // Replace variables in embed
        embed = this.replaceVariablesInEmbed(embed, member, guild);
      }

      // Here you would send the message to Discord
      // This is a placeholder for the actual Discord API call
      this.logger.log(
        `Would send welcome message to channel ${config.welcomeChannelId}: ${message}`,
      );

      // If image is enabled, generate and attach it
      if (config.welcomeImageEnabled) {
        const imageBuffer = await this.generateWelcomeImage(
          member,
          guild,
          config,
        );
        this.logger.log(`Generated welcome image (${imageBuffer.length} bytes)`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send welcome message: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send welcome DM to member
   * @param member - Member who joined
   * @param guild - Guild information
   * @param config - Welcome configuration
   */
  async sendWelcomeDM(
    member: Member,
    guild: Guild,
    config: any,
  ): Promise<void> {
    try {
      // Replace variables in DM message
      let message = config.welcomeDMMessage || '';
      message = this.replaceVariables(message, member, guild);

      // Here you would send the DM to Discord
      // This is a placeholder for the actual Discord API call
      this.logger.log(`Would send welcome DM to user ${member.id}: ${message}`);
    } catch (error) {
      this.logger.error(
        `Failed to send welcome DM: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send leave message to channel
   * @param member - Member who left
   * @param guild - Guild information
   * @param config - Welcome configuration
   */
  async sendLeaveMessage(
    member: Member,
    guild: Guild,
    config: any,
  ): Promise<void> {
    try {
      // Replace variables in message
      let message = config.leaveMessage || '';
      message = this.replaceVariables(message, member, guild);

      // Parse embed if exists
      let embed = null;
      if (config.leaveEmbed) {
        embed =
          typeof config.leaveEmbed === 'string'
            ? JSON.parse(config.leaveEmbed)
            : config.leaveEmbed;

        // Replace variables in embed
        embed = this.replaceVariablesInEmbed(embed, member, guild);
      }

      // Here you would send the message to Discord
      // This is a placeholder for the actual Discord API call
      this.logger.log(
        `Would send leave message to channel ${config.leaveChannelId}: ${message}`,
      );

      // If image is enabled, generate and attach it
      if (config.leaveImageEnabled) {
        const imageBuffer = await this.generateLeaveImage(
          member,
          guild,
          config,
        );
        this.logger.log(`Generated leave image (${imageBuffer.length} bytes)`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send leave message: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Apply auto roles to member
   * @param member - Member to apply roles to
   * @param config - Welcome configuration
   */
  async applyAutoRoles(member: Member, config: any): Promise<void> {
    try {
      if (!config.autoRoles) {
        return;
      }

      const roleIds =
        typeof config.autoRoles === 'string'
          ? JSON.parse(config.autoRoles)
          : config.autoRoles;

      if (!Array.isArray(roleIds) || roleIds.length === 0) {
        return;
      }

      // Here you would apply the roles via Discord API
      // This is a placeholder for the actual Discord API call
      this.logger.log(
        `Would apply auto roles to user ${member.id}: ${roleIds.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to apply auto roles: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Replace variables in message string
   * @param message - Message template
   * @param member - Member data
   * @param guild - Guild data
   */
  private replaceVariables(
    message: string,
    member: Member,
    guild: Guild,
  ): string {
    const displayName = member.discriminator
      ? `${member.username}#${member.discriminator}`
      : member.username;

    return message
      .replace(/{user}/g, `<@${member.id}>`)
      .replace(/{username}/g, displayName)
      .replace(/{user\.mention}/g, `<@${member.id}>`)
      .replace(/{user\.tag}/g, displayName)
      .replace(/{user\.id}/g, member.id)
      .replace(/{server}/g, guild.name)
      .replace(/{server\.name}/g, guild.name)
      .replace(/{memberCount}/g, guild.memberCount.toString())
      .replace(/{member\.count}/g, guild.memberCount.toString())
      .replace(/{user\.avatar}/g, this.getAvatarUrl(member));
  }

  /**
   * Replace variables in embed object
   * @param embed - Embed template
   * @param member - Member data
   * @param guild - Guild data
   */
  private replaceVariablesInEmbed(
    embed: any,
    member: Member,
    guild: Guild,
  ): any {
    const processValue = (value: any): any => {
      if (typeof value === 'string') {
        return this.replaceVariables(value, member, guild);
      } else if (Array.isArray(value)) {
        return value.map(processValue);
      } else if (typeof value === 'object' && value !== null) {
        const processed: any = {};
        for (const [key, val] of Object.entries(value)) {
          processed[key] = processValue(val);
        }
        return processed;
      }
      return value;
    };

    return processValue(embed);
  }

  /**
   * Get avatar URL for member
   * @param member - Member data
   */
  private getAvatarUrl(member: Member): string {
    if (member.avatar) {
      return `https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png?size=256`;
    }
    // Default Discord avatar
    const defaultAvatarNum = member.discriminator
      ? parseInt(member.discriminator) % 5
      : 0;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNum}.png`;
  }
}
