import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '@prisma/client';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Req() req: any,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const notifications = await this.notificationsService.getUserNotifications(
      req.user.id,
      unreadOnly === 'true',
    );

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type.toLowerCase(),
        title: n.title,
        message: n.message,
        read: n.read,
        metadata: n.metadata ? JSON.parse(n.metadata) : null,
        timestamp: n.createdAt,
      })),
    };
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Post(':id/read')
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    await this.notificationsService.markAsRead(id, req.user.id);
    return { success: true };
  }

  @Post('read-all')
  async markAllAsRead(@Req() req: any) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true };
  }

  @Delete(':id')
  async deleteNotification(@Req() req: any, @Param('id') id: string) {
    await this.notificationsService.deleteNotification(id, req.user.id);
    return { success: true };
  }

  @Delete()
  async deleteAllNotifications(@Req() req: any) {
    await this.notificationsService.deleteAllNotifications(req.user.id);
    return { success: true };
  }

  // Admin/System endpoint to create notifications (can be called internally)
  @Post('create')
  async createNotification(
    @Req() req: any,
    @Body()
    body: {
      userId?: string;
      type: NotificationType;
      title: string;
      message: string;
      metadata?: any;
    },
  ) {
    const userId = body.userId || req.user.id;
    await this.notificationsService.createNotification(
      userId,
      body.type,
      body.title,
      body.message,
      body.metadata,
    );
    return { success: true };
  }
}
