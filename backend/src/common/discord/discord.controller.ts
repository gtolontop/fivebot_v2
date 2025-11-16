import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DiscordService } from './discord.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

@Controller('discord')
@UseGuards(JwtAuthGuard)
export class DiscordController {
  constructor(
    private readonly discordService: DiscordService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  @Get('bots/:botId/guilds')
  async getBotGuilds(@Param('botId') botId: string, @Request() req: any) {
    // Verify user has access to this bot
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
      include: {
        collaborators: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!bot) {
      throw new HttpException('Bot not found', HttpStatus.NOT_FOUND);
    }

    // Check if user is owner or collaborator
    const isOwner = bot.ownerId === req.user.id;
    const isCollaborator = bot.collaborators.some(
      (collab) => collab.userId === req.user.id,
    );

    if (!isOwner && !isCollaborator) {
      throw new HttpException(
        'You do not have access to this bot',
        HttpStatus.FORBIDDEN,
      );
    }

    if (!bot.tokenEncrypted) {
      throw new HttpException('Bot token not configured', HttpStatus.BAD_REQUEST);
    }

    try {
      const decryptedToken = this.encryptionService.decrypt(bot.tokenEncrypted);
      const guilds = await this.discordService.getBotGuilds(decryptedToken);
      return guilds;
    } catch (error) {
      console.error('Error fetching bot guilds:', error);
      throw new HttpException(
        error.message || 'Failed to fetch bot guilds',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('guilds/:guildId/channels')
  async getGuildChannels(
    @Param('guildId') guildId: string,
    @Request() req: any,
  ) {
    // Find a bot that the user owns/collaborates on that is in this guild
    const bots = await this.prisma.bot.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          {
            collaborators: {
              some: {
                userId: req.user.id,
              },
            },
          },
        ],
      },
    });

    if (!bots || bots.length === 0) {
      throw new HttpException('No bots found', HttpStatus.NOT_FOUND);
    }

    // Try to fetch channels using the first bot with a token
    for (const bot of bots) {
      if (bot.tokenEncrypted) {
        try {
          const decryptedToken = this.encryptionService.decrypt(bot.tokenEncrypted);
          const channels = await this.discordService.getGuildChannels(
            decryptedToken,
            guildId,
          );
          return channels;
        } catch (error) {
          console.error(`Failed to fetch channels with bot ${bot.id}:`, error);
          // Continue to next bot
        }
      }
    }

    throw new HttpException(
      'Failed to fetch channels with available bots',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  @Get('guilds/:guildId/roles')
  async getGuildRoles(@Param('guildId') guildId: string, @Request() req: any) {
    // Find a bot that the user owns/collaborates on
    const bots = await this.prisma.bot.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          {
            collaborators: {
              some: {
                userId: req.user.id,
              },
            },
          },
        ],
      },
    });

    if (!bots || bots.length === 0) {
      throw new HttpException('No bots found', HttpStatus.NOT_FOUND);
    }

    // Try to fetch roles using the first bot with a token
    for (const bot of bots) {
      if (bot.tokenEncrypted) {
        try {
          const decryptedToken = this.encryptionService.decrypt(bot.tokenEncrypted);
          const roles = await this.discordService.getGuildRoles(
            decryptedToken,
            guildId,
          );
          return roles;
        } catch (error) {
          console.error(`Failed to fetch roles with bot ${bot.id}:`, error);
          // Continue to next bot
        }
      }
    }

    throw new HttpException(
      'Failed to fetch roles with available bots',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
