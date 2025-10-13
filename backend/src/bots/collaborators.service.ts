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

    // Vérifier permissions personnalisées uniquement
    if (collaborator.permissions) {
      try {
        const perms = JSON.parse(collaborator.permissions);
        return perms[permission] === true;
      } catch (e) {
        return false;
      }
    }

    return false;
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
