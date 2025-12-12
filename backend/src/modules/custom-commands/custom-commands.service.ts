import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CustomCommand, CustomCommandConfig, Prisma } from '@prisma/client';
import { CreateCommandDto, UpdateCommandDto, UpdateConfigDto } from './dto';

interface CommandContext {
  userId: string;
  username: string;
  discriminator?: string;
  guildId: string;
  guildName: string;
  channelId: string;
  channelName: string;
  args: string[];
  content: string;
}

interface CooldownEntry {
  timestamp: number;
  userId?: string;
}

@Injectable()
export class CustomCommandsService {
  private readonly logger = new Logger(CustomCommandsService.name);
  private cooldowns = new Map<string, CooldownEntry[]>();

  constructor(private prisma: PrismaService) {}

  /**
   * Get or create custom command configuration for a guild
   */
  async getConfig(guildId: string): Promise<CustomCommandConfig> {
    let config = await this.prisma.customCommandConfig.findUnique({
      where: { guildId },
      include: {
        commands: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!config) {
      // Auto-create config if it doesn't exist
      config = await this.prisma.customCommandConfig.create({
        data: {
          guildId,
          botId: '', // Will be set when updated
        },
        include: {
          commands: true,
        },
      });
    }

    return config;
  }

  /**
   * Update custom command configuration
   */
  async updateConfig(guildId: string, botId: string, data: UpdateConfigDto): Promise<CustomCommandConfig> {
    const config = await this.getConfig(guildId);

    const updateData: any = {
      ...data,
      botId,
    };

    // Handle array fields
    if (data.allowedCreateRoles !== undefined) {
      updateData.allowedCreateRoles = data.allowedCreateRoles ? JSON.stringify(data.allowedCreateRoles) : null;
    }

    return this.prisma.customCommandConfig.update({
      where: { id: config.id },
      data: updateData,
      include: {
        commands: true,
      },
    });
  }

  /**
   * Create a new custom command
   */
  async createCommand(guildId: string, botId: string, createdBy: string, data: CreateCommandDto): Promise<CustomCommand> {
    // Get or create config
    const config = await this.getConfig(guildId);

    // Update botId if not set
    if (!config.botId || config.botId === '') {
      await this.prisma.customCommandConfig.update({
        where: { id: config.id },
        data: { botId },
      });
    }

    // Check if max commands reached
    const commandCount = await this.prisma.customCommand.count({
      where: { configId: config.id },
    });

    if (commandCount >= config.maxCommands) {
      throw new BadRequestException(`Maximum number of commands (${config.maxCommands}) reached for this guild`);
    }

    // Check if command with same name already exists
    const existingCommand = await this.prisma.customCommand.findUnique({
      where: {
        configId_name: {
          configId: config.id,
          name: data.name,
        },
      },
    });

    if (existingCommand) {
      throw new BadRequestException(`Command with name "${data.name}" already exists`);
    }

    // Validate responses
    if (!data.responses || data.responses.length === 0) {
      throw new BadRequestException('At least one response must be provided');
    }

    // Prepare data for creation
    const createData: Prisma.CustomCommandCreateInput = {
      name: data.name,
      description: data.description,
      trigger: data.trigger,
      triggerType: data.triggerType || 'COMMAND',
      caseSensitive: data.caseSensitive ?? false,
      responseType: data.responseType || 'TEXT',
      responses: JSON.stringify(data.responses),
      actions: data.actions ? JSON.stringify(data.actions) : null,
      allowedRoles: data.allowedRoles ? JSON.stringify(data.allowedRoles) : null,
      allowedChannels: data.allowedChannels ? JSON.stringify(data.allowedChannels) : null,
      blockedRoles: data.blockedRoles ? JSON.stringify(data.blockedRoles) : null,
      blockedChannels: data.blockedChannels ? JSON.stringify(data.blockedChannels) : null,
      nsfw: data.nsfw ?? false,
      userCooldown: data.userCooldown ?? 0,
      guildCooldown: data.guildCooldown ?? 0,
      enabled: data.enabled ?? true,
      createdBy,
      config: {
        connect: { id: config.id },
      },
    };

    return this.prisma.customCommand.create({
      data: createData,
    });
  }

  /**
   * Update an existing custom command
   */
  async updateCommand(commandId: string, data: UpdateCommandDto): Promise<CustomCommand> {
    // Check if command exists
    const command = await this.prisma.customCommand.findUnique({
      where: { id: commandId },
    });

    if (!command) {
      throw new NotFoundException(`Command with ID ${commandId} not found`);
    }

    // Prepare update data
    const updateData: any = { ...data };

    // Handle array and object fields
    if (data.responses !== undefined) {
      updateData.responses = JSON.stringify(data.responses);
    }
    if (data.actions !== undefined) {
      updateData.actions = data.actions ? JSON.stringify(data.actions) : null;
    }
    if (data.allowedRoles !== undefined) {
      updateData.allowedRoles = data.allowedRoles ? JSON.stringify(data.allowedRoles) : null;
    }
    if (data.allowedChannels !== undefined) {
      updateData.allowedChannels = data.allowedChannels ? JSON.stringify(data.allowedChannels) : null;
    }
    if (data.blockedRoles !== undefined) {
      updateData.blockedRoles = data.blockedRoles ? JSON.stringify(data.blockedRoles) : null;
    }
    if (data.blockedChannels !== undefined) {
      updateData.blockedChannels = data.blockedChannels ? JSON.stringify(data.blockedChannels) : null;
    }

    return this.prisma.customCommand.update({
      where: { id: commandId },
      data: updateData,
    });
  }

  /**
   * Delete a custom command
   */
  async deleteCommand(commandId: string): Promise<{ success: boolean; message: string }> {
    // Check if command exists
    const command = await this.prisma.customCommand.findUnique({
      where: { id: commandId },
    });

    if (!command) {
      throw new NotFoundException(`Command with ID ${commandId} not found`);
    }

    await this.prisma.customCommand.delete({
      where: { id: commandId },
    });

    return { success: true, message: 'Command deleted successfully' };
  }

  /**
   * Get a command by trigger in a guild
   */
  async getCommand(guildId: string, trigger: string): Promise<CustomCommand | null> {
    const config = await this.prisma.customCommandConfig.findUnique({
      where: { guildId },
      include: {
        commands: {
          where: {
            enabled: true,
            trigger,
          },
        },
      },
    });

    if (!config || config.commands.length === 0) {
      return null;
    }

    return config.commands[0];
  }

  /**
   * List all commands for a guild
   */
  async listCommands(guildId: string, includeDisabled = false): Promise<CustomCommand[]> {
    const config = await this.getConfig(guildId);

    const where: Prisma.CustomCommandWhereInput = {
      configId: config.id,
    };

    if (!includeDisabled) {
      where.enabled = true;
    }

    return this.prisma.customCommand.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Execute a command with variable replacement
   */
  async executeCommand(
    guildId: string,
    trigger: string,
    context: CommandContext,
  ): Promise<{ response: string; actions: any[] } | null> {
    const config = await this.getConfig(guildId);

    if (!config.enabled) {
      return null;
    }

    // Get all enabled commands
    const commands = await this.prisma.customCommand.findMany({
      where: {
        configId: config.id,
        enabled: true,
      },
    });

    // Find matching command
    let matchedCommand: CustomCommand | null = null;

    for (const command of commands) {
      if (this.matchesTrigger(trigger, command)) {
        matchedCommand = command;
        break;
      }
    }

    if (!matchedCommand) {
      return null;
    }

    // Check permissions
    const hasPermission = await this.checkPermissions(
      matchedCommand,
      context.userId,
      context.channelId,
      [], // Will be passed from Discord
    );

    if (!hasPermission) {
      return null;
    }

    // Check cooldown
    const onCooldown = this.checkCooldown(matchedCommand, context.userId, guildId);
    if (onCooldown) {
      return null;
    }

    // Parse responses
    const responses = JSON.parse(matchedCommand.responses);
    let selectedResponse = '';

    // Select response based on response type
    switch (matchedCommand.responseType) {
      case 'TEXT':
        selectedResponse = responses[0] || '';
        break;
      case 'RANDOM':
        selectedResponse = responses[Math.floor(Math.random() * responses.length)] || '';
        break;
      case 'SEQUENCE':
        // Use uses count to determine which response (cycle through)
        selectedResponse = responses[matchedCommand.uses % responses.length] || '';
        break;
      case 'EMBED':
        selectedResponse = responses[0] || '';
        break;
      default:
        selectedResponse = responses[0] || '';
    }

    // Replace variables
    selectedResponse = this.replaceVariables(selectedResponse, context);

    // Parse actions
    const actions = matchedCommand.actions ? JSON.parse(matchedCommand.actions) : [];

    // Increment uses
    await this.incrementUses(matchedCommand.id);

    return {
      response: selectedResponse,
      actions,
    };
  }

  /**
   * Check if a trigger matches a command
   */
  private matchesTrigger(trigger: string, command: CustomCommand): boolean {
    let triggerContent = trigger;
    let commandTrigger = command.trigger;

    if (!command.caseSensitive) {
      triggerContent = triggerContent.toLowerCase();
      commandTrigger = commandTrigger.toLowerCase();
    }

    switch (command.triggerType) {
      case 'COMMAND':
        return triggerContent === commandTrigger;
      case 'STARTSWITH':
        return triggerContent.startsWith(commandTrigger);
      case 'CONTAINS':
        return triggerContent.includes(commandTrigger);
      case 'REGEX':
        try {
          const flags = command.caseSensitive ? '' : 'i';
          const regex = new RegExp(command.trigger, flags);
          return regex.test(trigger);
        } catch (error) {
          this.logger.error(`Invalid regex pattern in command ${command.id}: ${error.message}`);
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * Replace variables in a string
   */
  private replaceVariables(text: string, context: CommandContext): string {
    let result = text;

    // User variables
    result = result.replace(/\{user\}/g, context.username);
    result = result.replace(/\{user\.mention\}/g, `<@${context.userId}>`);
    result = result.replace(/\{user\.id\}/g, context.userId);
    result = result.replace(/\{user\.tag\}/g, context.discriminator ? `${context.username}#${context.discriminator}` : context.username);

    // Server variables
    result = result.replace(/\{server\}/g, context.guildName);
    result = result.replace(/\{server\.id\}/g, context.guildId);

    // Channel variables
    result = result.replace(/\{channel\}/g, context.channelName);
    result = result.replace(/\{channel\.mention\}/g, `<#${context.channelId}>`);
    result = result.replace(/\{channel\.id\}/g, context.channelId);

    // Args variables
    result = result.replace(/\{args\}/g, context.args.join(' '));

    // Individual args {args.0}, {args.1}, etc.
    const argsRegex = /\{args\.(\d+)\}/g;
    result = result.replace(argsRegex, (match, index) => {
      const argIndex = parseInt(index, 10);
      return context.args[argIndex] || '';
    });

    // Random number {random:1-100}
    const randomRegex = /\{random:(\d+)-(\d+)\}/g;
    result = result.replace(randomRegex, (match, min, max) => {
      const minNum = parseInt(min, 10);
      const maxNum = parseInt(max, 10);
      const random = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
      return random.toString();
    });

    // Choice {choice:a|b|c}
    const choiceRegex = /\{choice:([^}]+)\}/g;
    result = result.replace(choiceRegex, (match, options) => {
      const choices = options.split('|');
      return choices[Math.floor(Math.random() * choices.length)];
    });

    return result;
  }

  /**
   * Check permissions for a command
   */
  async checkPermissions(
    command: CustomCommand,
    userId: string,
    channelId: string,
    roleIds: string[],
  ): Promise<boolean> {
    // Check allowed channels
    if (command.allowedChannels) {
      const allowedChannels = JSON.parse(command.allowedChannels);
      if (allowedChannels.length > 0 && !allowedChannels.includes(channelId)) {
        return false;
      }
    }

    // Check blocked channels
    if (command.blockedChannels) {
      const blockedChannels = JSON.parse(command.blockedChannels);
      if (blockedChannels.includes(channelId)) {
        return false;
      }
    }

    // Check allowed roles
    if (command.allowedRoles) {
      const allowedRoles = JSON.parse(command.allowedRoles);
      if (allowedRoles.length > 0) {
        const hasAllowedRole = roleIds.some((roleId) => allowedRoles.includes(roleId));
        if (!hasAllowedRole) {
          return false;
        }
      }
    }

    // Check blocked roles
    if (command.blockedRoles) {
      const blockedRoles = JSON.parse(command.blockedRoles);
      const hasBlockedRole = roleIds.some((roleId) => blockedRoles.includes(roleId));
      if (hasBlockedRole) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a command is on cooldown
   */
  checkCooldown(command: CustomCommand, userId: string, guildId: string): boolean {
    const now = Date.now();
    const cooldownKey = `${guildId}:${command.id}`;

    if (!this.cooldowns.has(cooldownKey)) {
      this.cooldowns.set(cooldownKey, []);
    }

    const entries = this.cooldowns.get(cooldownKey)!;

    // Check user cooldown
    if (command.userCooldown > 0) {
      const userEntry = entries.find((e) => e.userId === userId);
      if (userEntry && now - userEntry.timestamp < command.userCooldown * 1000) {
        return true;
      }
    }

    // Check guild cooldown
    if (command.guildCooldown > 0) {
      const guildEntry = entries.find((e) => !e.userId);
      if (guildEntry && now - guildEntry.timestamp < command.guildCooldown * 1000) {
        return true;
      }
    }

    // Add cooldown entries
    if (command.userCooldown > 0) {
      // Remove old user entry
      const index = entries.findIndex((e) => e.userId === userId);
      if (index !== -1) {
        entries.splice(index, 1);
      }
      entries.push({ timestamp: now, userId });
    }

    if (command.guildCooldown > 0) {
      // Remove old guild entry
      const index = entries.findIndex((e) => !e.userId);
      if (index !== -1) {
        entries.splice(index, 1);
      }
      entries.push({ timestamp: now });
    }

    // Clean up old entries (older than 1 hour)
    const oneHourAgo = now - 3600000;
    const filtered = entries.filter((e) => e.timestamp > oneHourAgo);
    this.cooldowns.set(cooldownKey, filtered);

    return false;
  }

  /**
   * Increment use count for a command
   */
  async incrementUses(commandId: string): Promise<CustomCommand> {
    return this.prisma.customCommand.update({
      where: { id: commandId },
      data: {
        uses: { increment: 1 },
      },
    });
  }

  /**
   * Duplicate a command with a new name
   */
  async duplicateCommand(commandId: string, newName: string, userId: string): Promise<CustomCommand> {
    const original = await this.prisma.customCommand.findUnique({
      where: { id: commandId },
    });

    if (!original) {
      throw new NotFoundException(`Command with ID ${commandId} not found`);
    }

    // Check if command with new name already exists
    const existing = await this.prisma.customCommand.findUnique({
      where: {
        configId_name: {
          configId: original.configId,
          name: newName,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Command with name "${newName}" already exists`);
    }

    // Create duplicate
    const createData: Prisma.CustomCommandCreateInput = {
      name: newName,
      description: original.description,
      trigger: original.trigger,
      triggerType: original.triggerType,
      caseSensitive: original.caseSensitive,
      responseType: original.responseType,
      responses: original.responses,
      actions: original.actions,
      allowedRoles: original.allowedRoles,
      allowedChannels: original.allowedChannels,
      blockedRoles: original.blockedRoles,
      blockedChannels: original.blockedChannels,
      nsfw: original.nsfw,
      userCooldown: original.userCooldown,
      guildCooldown: original.guildCooldown,
      enabled: original.enabled,
      createdBy: userId,
      config: {
        connect: { id: original.configId },
      },
    };

    return this.prisma.customCommand.create({
      data: createData,
    });
  }

  /**
   * Import commands from an array
   */
  async importCommands(guildId: string, botId: string, userId: string, commands: CreateCommandDto[]): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const config = await this.getConfig(guildId);
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (const commandData of commands) {
      try {
        await this.createCommand(guildId, botId, userId, commandData);
        imported++;
      } catch (error) {
        skipped++;
        errors.push(`${commandData.name}: ${error.message}`);
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Export commands for a guild
   */
  async exportCommands(guildId: string): Promise<CustomCommand[]> {
    return this.listCommands(guildId, true);
  }

  /**
   * Get command statistics
   */
  async getStatistics(guildId: string) {
    const config = await this.getConfig(guildId);
    const commands = await this.prisma.customCommand.findMany({
      where: { configId: config.id },
      select: {
        id: true,
        name: true,
        uses: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { uses: 'desc' },
    });

    const totalUses = commands.reduce((sum, cmd) => sum + cmd.uses, 0);
    const enabledCount = commands.filter((cmd) => cmd.enabled).length;
    const disabledCount = commands.filter((cmd) => !cmd.enabled).length;

    return {
      totalCommands: commands.length,
      enabledCommands: enabledCount,
      disabledCommands: disabledCount,
      totalUses,
      maxCommands: config.maxCommands,
      remainingSlots: config.maxCommands - commands.length,
      commands,
    };
  }
}
