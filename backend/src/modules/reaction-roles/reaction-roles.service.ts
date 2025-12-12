import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReactionRoleType, ReactionRoleMode } from '@prisma/client';

@Injectable()
export class ReactionRolesService {
  constructor(private prisma: PrismaService) {}

  async getConfig(guildId: string, botId: string) {
    let config = await this.prisma.reactionRoleConfig.findUnique({
      where: { guildId },
      include: {
        panels: {
          include: {
            roles: true,
          },
        },
      },
    });

    if (!config) {
      config = await this.prisma.reactionRoleConfig.create({
        data: {
          guildId,
          botId,
          enabled: true,
        },
        include: {
          panels: {
            include: {
              roles: true,
            },
          },
        },
      });
    }

    return config;
  }

  async updateConfig(guildId: string, botId: string, data: { enabled?: boolean; dmOnRole?: boolean; logChannelId?: string }) {
    return this.prisma.reactionRoleConfig.upsert({
      where: { guildId },
      update: data,
      create: {
        guildId,
        botId,
        ...data,
      },
    });
  }

  async createPanel(guildId: string, botId: string, dto: {
    name: string;
    channelId: string;
    messageId?: string;
    type?: ReactionRoleType;
    mode?: ReactionRoleMode;
    title?: string;
    description?: string;
    color?: string;
    thumbnail?: string;
    image?: string;
    requiredRoleId?: string;
    blacklistedRoleIds?: string[];
  }) {
    const config = await this.getConfig(guildId, botId);

    return this.prisma.reactionRolePanel.create({
      data: {
        configId: config.id,
        guildId,
        name: dto.name,
        channelId: dto.channelId,
        messageId: dto.messageId,
        type: dto.type || 'REACTION',
        mode: dto.mode || 'NORMAL',
        title: dto.title,
        description: dto.description,
        color: dto.color,
        thumbnail: dto.thumbnail,
        image: dto.image,
        requiredRoleId: dto.requiredRoleId,
        blacklistedRoleIds: dto.blacklistedRoleIds ? JSON.stringify(dto.blacklistedRoleIds) : null,
      },
      include: {
        roles: true,
      },
    });
  }

  async updatePanel(panelId: string, dto: {
    name?: string;
    type?: ReactionRoleType;
    mode?: ReactionRoleMode;
    title?: string;
    description?: string;
    color?: string;
    thumbnail?: string;
    image?: string;
    requiredRoleId?: string;
    blacklistedRoleIds?: string[];
  }) {
    const panel = await this.prisma.reactionRolePanel.findUnique({
      where: { id: panelId },
    });

    if (!panel) {
      throw new NotFoundException('Panel not found');
    }

    return this.prisma.reactionRolePanel.update({
      where: { id: panelId },
      data: {
        name: dto.name,
        type: dto.type,
        mode: dto.mode,
        title: dto.title,
        description: dto.description,
        color: dto.color,
        thumbnail: dto.thumbnail,
        image: dto.image,
        requiredRoleId: dto.requiredRoleId,
        blacklistedRoleIds: dto.blacklistedRoleIds ? JSON.stringify(dto.blacklistedRoleIds) : undefined,
      },
      include: {
        roles: true,
      },
    });
  }

  async deletePanel(panelId: string) {
    await this.prisma.reactionRolePanel.delete({
      where: { id: panelId },
    });
    return { success: true };
  }

  async getPanel(panelId: string) {
    const panel = await this.prisma.reactionRolePanel.findUnique({
      where: { id: panelId },
      include: {
        roles: true,
      },
    });

    if (!panel) {
      throw new NotFoundException('Panel not found');
    }

    return panel;
  }

  async getPanelByMessage(messageId: string) {
    return this.prisma.reactionRolePanel.findFirst({
      where: { messageId },
      include: {
        roles: true,
      },
    });
  }

  async addRole(panelId: string, dto: { roleId: string; emoji: string; label?: string; description?: string; style?: number }) {
    const panel = await this.prisma.reactionRolePanel.findUnique({
      where: { id: panelId },
      include: { roles: true },
    });

    if (!panel) {
      throw new NotFoundException('Panel not found');
    }

    // Check if emoji already exists
    const existingRole = panel.roles.find(r => r.emoji === dto.emoji);
    if (existingRole) {
      throw new BadRequestException('This emoji is already used for another role');
    }

    return this.prisma.reactionRole.create({
      data: {
        panelId,
        roleId: dto.roleId,
        emoji: dto.emoji,
        label: dto.label,
        description: dto.description,
        style: dto.style || 2,
      },
    });
  }

  async updateRole(roleId: string, dto: { roleId?: string; emoji?: string; label?: string; description?: string; style?: number }) {
    return this.prisma.reactionRole.update({
      where: { id: roleId },
      data: {
        roleId: dto.roleId,
        emoji: dto.emoji,
        label: dto.label,
        description: dto.description,
        style: dto.style,
      },
    });
  }

  async removeRole(roleId: string) {
    await this.prisma.reactionRole.delete({
      where: { id: roleId },
    });
    return { success: true };
  }

  async getStats(guildId: string) {
    const config = await this.prisma.reactionRoleConfig.findUnique({
      where: { guildId },
      include: {
        panels: {
          include: {
            roles: true,
          },
        },
      },
    });

    if (!config) {
      return { totalPanels: 0, totalRoles: 0 };
    }

    let totalRoles = 0;

    for (const panel of config.panels) {
      totalRoles += panel.roles.length;
    }

    return {
      totalPanels: config.panels.length,
      totalRoles,
    };
  }
}
