import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../common/prisma/prisma.service';
import { BotsService } from './bots.service';

@Controller('bots/:botId/tickets')
@UseGuards(AuthGuard('jwt'))
export class TicketMessagesController {
  // Cache for user info to avoid rate limiting
  private userCache = new Map<string, { username: string; avatar: string | null; timestamp: number }>();
  private readonly CACHE_TTL = 3600000; // 1 hour

  constructor(
    private prisma: PrismaService,
    private botsService: BotsService,
  ) {}

  // Get ticket details
  @Get(':ticketId')
  async getTicket(
    @Param('botId') botId: string,
    @Param('ticketId') ticketId: string,
    @Req() req: any,
  ) {
    // Verify bot ownership
    const bot = await this.botsService.findOne(botId, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // Get ticket with participants
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        participants: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return { ticket };
  }

  // Get ticket messages
  @Get(':ticketId/messages')
  async getMessages(
    @Param('botId') botId: string,
    @Param('ticketId') ticketId: string,
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    // Verify bot ownership
    const bot = await this.botsService.findOne(botId, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // Verify ticket exists
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Get messages
    const messages = await this.prisma.ticketMessage.findMany({
      where: {
        ticketId,
        ...(before && {
          createdAt: {
            lt: new Date(before),
          },
        }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit ? parseInt(limit) : 50,
    });

    // Get unique user IDs
    const uniqueUserIds = [...new Set(messages.map(m => m.userId))];
    const decryptedToken = await this.botsService.getDecryptedToken(botId);

    // Fetch only users not in cache or expired
    const usersToFetch = uniqueUserIds.filter(userId => {
      const cached = this.userCache.get(userId);
      if (!cached) return true;
      return Date.now() - cached.timestamp > this.CACHE_TTL;
    });

    // Batch fetch missing users (max 5 at a time to avoid rate limit)
    if (usersToFetch.length > 0) {
      const batchSize = 5;
      for (let i = 0; i < usersToFetch.length; i += batchSize) {
        const batch = usersToFetch.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (userId) => {
            try {
              const response = await fetch(`https://discord.com/api/v10/users/${userId}`, {
                headers: {
                  'Authorization': `Bot ${decryptedToken}`,
                },
              });

              if (response.ok) {
                const user = await response.json();
                this.userCache.set(userId, {
                  username: user.username,
                  avatar: user.avatar,
                  timestamp: Date.now()
                });
              }
            } catch (error) {
              // Silently fail, will show as Unknown User
            }
          })
        );
        // Small delay between batches to avoid rate limit
        if (i + batchSize < usersToFetch.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // Map messages with cached user info
    const messagesWithUserInfo = messages.map(message => {
      const cached = this.userCache.get(message.userId);
      return {
        ...message,
        username: cached?.username || 'Unknown User',
        avatar: cached?.avatar || null,
      };
    });

    // Reverse to get chronological order
    return { messages: messagesWithUserInfo.reverse() };
  }

  // Send message to ticket (via webhook)
  @Post(':ticketId/messages')
  async sendMessage(
    @Param('botId') botId: string,
    @Param('ticketId') ticketId: string,
    @Req() req: any,
    @Body() body: { content: string; userId: string; username: string; avatar?: string },
  ) {
    // Verify bot ownership
    const bot = await this.botsService.findOne(botId, req.user.id);
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // Verify ticket exists and is not closed
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.state === 'CLOSED') {
      throw new Error('Cannot send messages to a closed ticket');
    }

    // Send command to bot to send message via webhook
    const command = await this.prisma.botCommand.create({
      data: {
        botId,
        action: 'SEND_TICKET_MESSAGE',
        data: {
          ticketId,
          channelId: ticket.channelId || ticket.threadId,
          content: body.content,
          userId: body.userId,
          username: body.username,
          avatar: body.avatar,
          isStaff: true, // Messages from dashboard are from staff
        },
      },
    });

    // Wait a bit for command to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if command succeeded
    const processedCommand = await this.prisma.botCommand.findUnique({
      where: { id: command.id },
    });

    if (processedCommand?.status === 'FAILED') {
      throw new Error(processedCommand.error || 'Failed to send message');
    }

    return { success: true, commandId: command.id };
  }
}
