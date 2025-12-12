import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { TicketsAdvancedService } from './tickets-advanced.service';
import {
  CreateTicketDto,
  CloseTicketDto,
  TransferTicketDto,
  RatingDto,
  CreateTicketPanelDto,
  UpdateTicketPanelDto,
} from './dto';

@Controller('bots/:botId/tickets')
@UseGuards(JwtAuthGuard)
export class TicketsAdvancedController {
  constructor(private readonly ticketsService: TicketsAdvancedService) {}

  // ==================== TICKETS ====================

  @Post()
  async createTicket(
    @Param('botId') botId: string,
    @Body() createDto: CreateTicketDto,
  ) {
    return this.ticketsService.createTicket(
      createDto.guildId,
      createDto.userId,
      createDto.categoryId,
      createDto.topic,
      createDto.type,
      createDto.priority,
    );
  }

  @Get()
  async getTickets(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Query('state') state?: string,
    @Query('priority') priority?: string,
    @Query('assignedStaffId') assignedStaffId?: string,
    @Query('creatorId') creatorId?: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }

    return this.ticketsService.getTickets(guildId, {
      state,
      priority,
      assignedStaffId,
      creatorId,
    });
  }

  @Get(':id')
  async getTicket(@Param('id') id: string) {
    return this.ticketsService.getTicket(id);
  }

  @Patch(':id/close')
  async closeTicket(
    @Param('id') id: string,
    @Body() closeDto: CloseTicketDto,
  ) {
    return this.ticketsService.closeTicket(id, closeDto.closedBy, closeDto.reason);
  }

  @Get(':id/transcript')
  @Header('Content-Type', 'text/html')
  async getTranscript(@Param('id') id: string) {
    return this.ticketsService.generateTranscript(id);
  }

  @Post(':id/transcript/save')
  @HttpCode(HttpStatus.OK)
  async saveTranscript(
    @Param('id') id: string,
    @Body() body: { outputDir?: string },
  ) {
    const filepath = await this.ticketsService.saveTranscript(id, body.outputDir);
    return { filepath };
  }

  @Post(':id/rating')
  @HttpCode(HttpStatus.OK)
  async addRating(
    @Param('id') id: string,
    @Body() ratingDto: RatingDto,
  ) {
    return this.ticketsService.addRating(id, ratingDto.rating, ratingDto.feedback);
  }

  @Patch(':id/claim')
  async claimTicket(
    @Param('id') id: string,
    @Body() body: { staffId: string },
  ) {
    return this.ticketsService.claimTicket(id, body.staffId);
  }

  @Patch(':id/transfer')
  async transferTicket(
    @Param('id') id: string,
    @Body() transferDto: TransferTicketDto,
    @Query('transferredBy') transferredBy?: string,
  ) {
    if (!transferredBy) {
      return { error: 'transferredBy query parameter is required' };
    }
    return this.ticketsService.transferTicket(id, transferDto.newStaffId, transferredBy);
  }

  @Patch(':id/priority')
  async setTicketPriority(
    @Param('id') id: string,
    @Body() body: { priority: string; updatedBy: string },
  ) {
    return this.ticketsService.setTicketPriority(id, body.priority, body.updatedBy);
  }

  @Post(':id/users')
  @HttpCode(HttpStatus.OK)
  async addUser(
    @Param('id') id: string,
    @Body() body: { userId: string; addedBy: string },
  ) {
    return this.ticketsService.addUser(id, body.userId, body.addedBy);
  }

  @Delete(':id/users/:userId')
  @HttpCode(HttpStatus.OK)
  async removeUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Query('removedBy') removedBy?: string,
  ) {
    if (!removedBy) {
      return { error: 'removedBy query parameter is required' };
    }
    return this.ticketsService.removeUser(id, userId, removedBy);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.OK)
  async addMessage(
    @Param('id') id: string,
    @Body() body: {
      userId: string;
      authorId: string;
      content: string;
      isStaff?: boolean;
      attachments?: any;
    },
  ) {
    return this.ticketsService.addMessage(
      id,
      body.userId,
      body.authorId,
      body.content,
      body.isStaff,
      body.attachments,
    );
  }

  // ==================== STATS ====================

  @Get('stats/overview')
  async getTicketStats(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.ticketsService.getTicketStats(guildId);
  }

  // ==================== PANELS ====================

  @Post('panels')
  async createPanel(
    @Param('botId') botId: string,
    @Body() createDto: CreateTicketPanelDto,
  ) {
    return this.ticketsService.createPanel(
      createDto.guildId,
      createDto.botId,
      createDto.channelId,
      createDto.type,
      createDto.config,
    );
  }

  @Get('panels')
  async getPanels(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.ticketsService.getPanels(guildId);
  }

  @Patch('panels/:panelId')
  async updatePanel(
    @Param('panelId') panelId: string,
    @Body() updateDto: UpdateTicketPanelDto,
  ) {
    return this.ticketsService.updatePanel(panelId, updateDto);
  }

  @Delete('panels/:panelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePanel(@Param('panelId') panelId: string) {
    await this.ticketsService.deletePanel(panelId);
  }
}
