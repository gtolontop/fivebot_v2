import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CollaboratorsService {
  constructor(private readonly prisma: PrismaService) {}

  async checkPermission(
    botId: string,
    userId: string,
    permission: string,
  ): Promise<boolean> {
    // Vérifier si propriétaire (tous les droits)
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
    });

    if (bot?.ownerId === userId) {
      return true;
    }

    // Vérifier collaborateur
    const collaborator = await this.prisma.botCollaborator.findFirst({
      where: {
        botId,
        userId,
        status: 'ACTIVE',
      },
    });

    if (!collaborator) {
      return false;
    }

    // Admins ont tous les droits sauf deleteBot
    if (collaborator.role === 'ADMIN') {
      if (permission === 'deleteBot') {
        return false;
      }
      return true;
    }

    // Vérifier permissions personnalisées
    if (collaborator.permissions) {
      try {
        const perms = JSON.parse(collaborator.permissions);

        // Vérifier permission spécifique
        if (perms[permission] === true) {
          return true;
        }

        // Permissions par défaut selon le rôle
        return this.getDefaultRolePermissions(collaborator.role, permission);
      } catch (e) {
        // En cas d'erreur de parsing, utiliser les permissions par défaut
        return this.getDefaultRolePermissions(collaborator.role, permission);
      }
    }

    // Permissions par défaut selon le rôle
    return this.getDefaultRolePermissions(collaborator.role, permission);
  }

  private getDefaultRolePermissions(role: string, permission: string): boolean {
    const rolePermissions: Record<string, string[]> = {
      VIEWER: [
        'viewDashboard',
        'viewLogs',
        'viewAnalytics',
        'viewMetrics',
      ],
      MODERATOR: [
        'viewDashboard',
        'viewLogs',
        'viewAnalytics',
        'viewMetrics',
        'viewTickets',
        'manageTickets',
        'closeTickets',
        'editModeration',
        'editLogging',
      ],
      DEVELOPER: [
        'viewDashboard',
        'viewLogs',
        'viewAnalytics',
        'viewMetrics',
        'startBot',
        'stopBot',
        'restartBot',
        'editWelcome',
        'editAutoRoles',
        'editModeration',
        'editLogging',
        'editCustomCommands',
        'editStatusRotation',
        'editEmbedCommands',
        'viewTickets',
        'manageTickets',
        'configureTickets',
      ],
      ADMIN: [
        'viewDashboard',
        'viewLogs',
        'viewAnalytics',
        'viewMetrics',
        'startBot',
        'stopBot',
        'restartBot',
        'editWelcome',
        'editAutoRoles',
        'editModeration',
        'editLogging',
        'editCustomCommands',
        'editTicketSystem',
        'editStatusRotation',
        'editEmbedCommands',
        'viewTickets',
        'manageTickets',
        'closeTickets',
        'deleteTickets',
        'configureTickets',
        'manageCollaborators',
      ],
    };

    return rolePermissions[role]?.includes(permission) || false;
  }

  async getAllPermissions(botId: string, userId: string): Promise<string[]> {
    // Vérifier si propriétaire (tous les droits)
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
    });

    if (bot?.ownerId === userId) {
      return ['*']; // Wildcard pour tous les droits
    }

    // Vérifier collaborateur
    const collaborator = await this.prisma.botCollaborator.findFirst({
      where: {
        botId,
        userId,
        status: 'ACTIVE',
      },
    });

    if (!collaborator) {
      return [];
    }

    // Récupérer toutes les permissions
    const allPermissions = [
      'viewDashboard',
      'viewLogs',
      'viewAnalytics',
      'viewMetrics',
      'startBot',
      'stopBot',
      'restartBot',
      'editWelcome',
      'editAutoRoles',
      'editModeration',
      'editLogging',
      'editCustomCommands',
      'editTicketSystem',
      'editStatusRotation',
      'editEmbedCommands',
      'viewTickets',
      'manageTickets',
      'closeTickets',
      'deleteTickets',
      'configureTickets',
      'manageCollaborators',
      'deleteBot',
    ];

    const granted: string[] = [];

    for (const perm of allPermissions) {
      if (await this.checkPermission(botId, userId, perm)) {
        granted.push(perm);
      }
    }

    return granted;
  }

  async hasAccessToBot(botId: string, userId: string): Promise<boolean> {
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot) {
      return false;
    }

    if (bot.ownerId === userId) {
      return true;
    }

    const collaborator = await this.prisma.botCollaborator.findFirst({
      where: {
        botId,
        userId,
        status: 'ACTIVE',
      },
    });

    return !!collaborator;
  }

  async updateLastAccess(botId: string, userId: string): Promise<void> {
    await this.prisma.botCollaborator.updateMany({
      where: {
        botId,
        userId,
        status: 'ACTIVE',
      },
      data: {
        lastAccessAt: new Date(),
      },
    });
  }
}
