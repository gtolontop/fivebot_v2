import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CollaboratorsService } from './collaborators.service';
import { PrismaService } from '../common/prisma/prisma.service';

interface InviteCollaboratorDto {
  userDiscordId: string;
  role: 'VIEWER' | 'MODERATOR' | 'DEVELOPER' | 'ADMIN';
  permissions?: any;
  message?: string;
}

interface UpdateCollaboratorDto {
  role?: 'VIEWER' | 'MODERATOR' | 'DEVELOPER' | 'ADMIN';
  permissions?: any;
  status?: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
}

@Controller('bots/:botId/collaborators')
@UseGuards(AuthGuard('jwt'))
export class CollaboratorsController {
  constructor(
    private readonly collaboratorsService: CollaboratorsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getCollaborators(@Param('botId') botId: string, @Req() req: any) {
    // Vérifier que l'utilisateur a accès au bot
    await this.verifyBotAccess(botId, req.user.id);

    const collaborators = await this.prisma.botCollaborator.findMany({
      where: { botId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            discordId: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return collaborators.map((collab) => ({
      ...collab,
      permissions: collab.permissions ? JSON.parse(collab.permissions) : undefined,
    }));
  }

  @Post('invite')
  async inviteCollaborator(
    @Param('botId') botId: string,
    @Body() dto: InviteCollaboratorDto,
    @Req() req: any,
  ) {
    // Vérifier que l'utilisateur est propriétaire ou admin du bot
    await this.verifyBotOwnerOrAdmin(botId, req.user.id);

    // Trouver l'utilisateur à inviter par son Discord ID
    const targetUser = await this.prisma.user.findUnique({
      where: { discordId: dto.userDiscordId },
    });

    if (!targetUser) {
      throw new NotFoundException('Utilisateur non trouvé sur la plateforme');
    }

    // Vérifier que l'utilisateur n'est pas déjà collaborateur
    const existing = await this.prisma.botCollaborator.findUnique({
      where: {
        botId_userId: {
          botId,
          userId: targetUser.id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Cet utilisateur est déjà collaborateur');
    }

    // Créer l'invitation
    const collaborator = await this.prisma.botCollaborator.create({
      data: {
        botId,
        userId: targetUser.id,
        invitedBy: req.user.id,
        role: dto.role,
        permissions: dto.permissions ? JSON.stringify(dto.permissions) : null,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            discordId: true,
            avatar: true,
          },
        },
      },
    });

    // TODO: Envoyer une notification à l'utilisateur invité

    return {
      ...collaborator,
      permissions: collaborator.permissions ? JSON.parse(collaborator.permissions) : undefined,
    };
  }

  @Put(':collaboratorId')
  async updateCollaborator(
    @Param('botId') botId: string,
    @Param('collaboratorId') collaboratorId: string,
    @Body() dto: UpdateCollaboratorDto,
    @Req() req: any,
  ) {
    // Vérifier que l'utilisateur est propriétaire ou admin du bot
    await this.verifyBotOwnerOrAdmin(botId, req.user.id);

    const collaborator = await this.prisma.botCollaborator.findUnique({
      where: { id: collaboratorId },
    });

    if (!collaborator || collaborator.botId !== botId) {
      throw new NotFoundException('Collaborateur non trouvé');
    }

    const updated = await this.prisma.botCollaborator.update({
      where: { id: collaboratorId },
      data: {
        ...(dto.role && { role: dto.role }),
        ...(dto.status && { status: dto.status }),
        ...(dto.permissions && { permissions: JSON.stringify(dto.permissions) }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            discordId: true,
            avatar: true,
          },
        },
      },
    });

    return {
      ...updated,
      permissions: updated.permissions ? JSON.parse(updated.permissions) : undefined,
    };
  }

  @Delete(':collaboratorId')
  async removeCollaborator(
    @Param('botId') botId: string,
    @Param('collaboratorId') collaboratorId: string,
    @Req() req: any,
  ) {
    // Vérifier que l'utilisateur est propriétaire ou admin du bot
    await this.verifyBotOwnerOrAdmin(botId, req.user.id);

    const collaborator = await this.prisma.botCollaborator.findUnique({
      where: { id: collaboratorId },
    });

    if (!collaborator || collaborator.botId !== botId) {
      throw new NotFoundException('Collaborateur non trouvé');
    }

    await this.prisma.botCollaborator.delete({
      where: { id: collaboratorId },
    });

    return { success: true, message: 'Collaborateur supprimé' };
  }

  @Post(':collaboratorId/accept')
  async acceptInvitation(
    @Param('botId') botId: string,
    @Param('collaboratorId') collaboratorId: string,
    @Req() req: any,
  ) {
    const collaborator = await this.prisma.botCollaborator.findUnique({
      where: { id: collaboratorId },
    });

    if (!collaborator || collaborator.botId !== botId) {
      throw new NotFoundException('Invitation non trouvée');
    }

    if (collaborator.userId !== req.user.id) {
      throw new ForbiddenException('Cette invitation ne vous est pas destinée');
    }

    if (collaborator.status !== 'PENDING') {
      throw new BadRequestException('Cette invitation a déjà été traitée');
    }

    const updated = await this.prisma.botCollaborator.update({
      where: { id: collaboratorId },
      data: {
        status: 'ACTIVE',
        acceptedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            discordId: true,
            avatar: true,
          },
        },
      },
    });

    return {
      ...updated,
      permissions: updated.permissions ? JSON.parse(updated.permissions) : undefined,
    };
  }

  @Post(':collaboratorId/decline')
  async declineInvitation(
    @Param('botId') botId: string,
    @Param('collaboratorId') collaboratorId: string,
    @Req() req: any,
  ) {
    const collaborator = await this.prisma.botCollaborator.findUnique({
      where: { id: collaboratorId },
    });

    if (!collaborator || collaborator.botId !== botId) {
      throw new NotFoundException('Invitation non trouvée');
    }

    if (collaborator.userId !== req.user.id) {
      throw new ForbiddenException('Cette invitation ne vous est pas destinée');
    }

    if (collaborator.status !== 'PENDING') {
      throw new BadRequestException('Cette invitation a déjà été traitée');
    }

    await this.prisma.botCollaborator.delete({
      where: { id: collaboratorId },
    });

    return { success: true, message: 'Invitation refusée' };
  }

  @Get('my-invitations')
  async getMyInvitations(@Req() req: any) {
    const invitations = await this.prisma.botCollaborator.findMany({
      where: {
        userId: req.user.id,
        status: 'PENDING',
      },
      include: {
        bot: {
          select: {
            id: true,
            name: true,
            clientId: true,
            status: true,
          },
        },
      },
      orderBy: { invitedAt: 'desc' },
    });

    return invitations.map((inv) => ({
      ...inv,
      permissions: inv.permissions ? JSON.parse(inv.permissions) : undefined,
    }));
  }

  private async verifyBotAccess(botId: string, userId: string) {
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot) {
      throw new NotFoundException('Bot non trouvé');
    }

    // Vérifier si propriétaire
    if (bot.ownerId === userId) {
      return;
    }

    // Vérifier si collaborateur actif
    const collaborator = await this.prisma.botCollaborator.findFirst({
      where: {
        botId,
        userId,
        status: 'ACTIVE',
      },
    });

    if (!collaborator) {
      throw new ForbiddenException('Vous n\'avez pas accès à ce bot');
    }
  }

  private async verifyBotOwnerOrAdmin(botId: string, userId: string) {
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot) {
      throw new NotFoundException('Bot non trouvé');
    }

    // Vérifier si propriétaire
    if (bot.ownerId === userId) {
      return;
    }

    // Vérifier si admin collaborateur
    const collaborator = await this.prisma.botCollaborator.findFirst({
      where: {
        botId,
        userId,
        status: 'ACTIVE',
        role: 'ADMIN',
      },
    });

    if (!collaborator) {
      throw new ForbiddenException('Vous devez être propriétaire ou administrateur');
    }
  }
}
