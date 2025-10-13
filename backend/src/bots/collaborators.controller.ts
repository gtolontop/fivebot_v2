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

@Controller('bots')
@UseGuards(AuthGuard('jwt'))
export class CollaboratorsController {
  constructor(
    private readonly collaboratorsService: CollaboratorsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':botId/collaborators')
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

  @Post(':botId/collaborators/invite')
  async inviteCollaborator(
    @Param('botId') botId: string,
    @Body() dto: InviteCollaboratorDto,
    @Req() req: any,
  ) {
    // Vérifier que l'utilisateur est propriétaire ou admin du bot
    await this.verifyBotOwnerOrAdmin(botId, req.user.id);

    console.log('[COLLABORATOR INVITE] Searching for Discord ID:', dto.userDiscordId);

    // Trouver l'utilisateur à inviter par son Discord ID
    const targetUser = await this.prisma.user.findUnique({
      where: { discordId: dto.userDiscordId },
    });

    console.log('[COLLABORATOR INVITE] Target user found:', targetUser ? `${targetUser.username} (${targetUser.id})` : 'NOT FOUND');

    if (!targetUser) {
      // List all users to help debug
      const allUsers = await this.prisma.user.findMany({
        select: { id: true, username: true, discordId: true },
        take: 10,
      });
      console.log('[COLLABORATOR INVITE] Available users:', allUsers);
      throw new NotFoundException('User not found on the platform');
    }

    // Check if user is already a collaborator
    const existing = await this.prisma.botCollaborator.findUnique({
      where: {
        botId_userId: {
          botId,
          userId: targetUser.id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('This user is already a collaborator');
    }

    // Create the invitation
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

    // TODO: Send notification to invited user

    return {
      ...collaborator,
      permissions: collaborator.permissions ? JSON.parse(collaborator.permissions) : undefined,
    };
  }

  @Put(':botId/collaborators/:collaboratorId')
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
      throw new NotFoundException('Collaborator not found');
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

  @Delete(':botId/collaborators/:collaboratorId')
  async removeCollaborator(
    @Param('botId') botId: string,
    @Param('collaboratorId') collaboratorId: string,
    @Req() req: any,
  ) {
    // Verify user is owner or admin of the bot
    await this.verifyBotOwnerOrAdmin(botId, req.user.id);

    const collaborator = await this.prisma.botCollaborator.findUnique({
      where: { id: collaboratorId },
    });

    if (!collaborator || collaborator.botId !== botId) {
      throw new NotFoundException('Collaborator not found');
    }

    await this.prisma.botCollaborator.delete({
      where: { id: collaboratorId },
    });

    return { success: true, message: 'Collaborator removed' };
  }

  @Post(':botId/collaborators/:collaboratorId/accept')
  async acceptInvitation(
    @Param('botId') botId: string,
    @Param('collaboratorId') collaboratorId: string,
    @Req() req: any,
  ) {
    const collaborator = await this.prisma.botCollaborator.findUnique({
      where: { id: collaboratorId },
    });

    if (!collaborator || collaborator.botId !== botId) {
      throw new NotFoundException('Invitation not found');
    }

    if (collaborator.userId !== req.user.id) {
      throw new ForbiddenException('This invitation is not for you');
    }

    if (collaborator.status !== 'PENDING') {
      throw new BadRequestException('This invitation has already been processed');
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

  @Post(':botId/collaborators/:collaboratorId/decline')
  async declineInvitation(
    @Param('botId') botId: string,
    @Param('collaboratorId') collaboratorId: string,
    @Req() req: any,
  ) {
    const collaborator = await this.prisma.botCollaborator.findUnique({
      where: { id: collaboratorId },
    });

    if (!collaborator || collaborator.botId !== botId) {
      throw new NotFoundException('Invitation not found');
    }

    if (collaborator.userId !== req.user.id) {
      throw new ForbiddenException('This invitation is not for you');
    }

    if (collaborator.status !== 'PENDING') {
      throw new BadRequestException('This invitation has already been processed');
    }

    await this.prisma.botCollaborator.delete({
      where: { id: collaboratorId },
    });

    return { success: true, message: 'Invitation declined' };
  }

  @Get('collaborators/my-invitations')
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
      throw new NotFoundException('Bot not found');
    }

    // Check if owner
    if (bot.ownerId === userId) {
      return;
    }

    // Check if active collaborator
    const collaborator = await this.prisma.botCollaborator.findFirst({
      where: {
        botId,
        userId,
        status: 'ACTIVE',
      },
    });

    if (!collaborator) {
      throw new ForbiddenException('You do not have access to this bot');
    }
  }

  private async verifyBotOwnerOrAdmin(botId: string, userId: string) {
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // Check if owner
    if (bot.ownerId === userId) {
      return;
    }

    // Check if admin collaborator
    const collaborator = await this.prisma.botCollaborator.findFirst({
      where: {
        botId,
        userId,
        status: 'ACTIVE',
        role: 'ADMIN',
      },
    });

    if (!collaborator) {
      throw new ForbiddenException('You must be the owner or an administrator');
    }
  }
}
