import { Controller, Post, Body } from '@nestjs/common';
import { EventsService } from '../common/events/events.service';

@Controller('internal')
export class InternalController {
  constructor(private eventsService: EventsService) {}

  @Post('bot-status')
  async updateBotStatus(@Body() body: { botId: string; status: string }) {
    this.eventsService.emitBotStatusChange(body.botId, body.status);
    return { success: true };
  }
}
