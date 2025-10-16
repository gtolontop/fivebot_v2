import { Controller, Post, Body } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Controller('events')
export class EventsController {
  constructor(private eventsGateway: EventsGateway) {}

  @Post('bot-online')
  notifyBotOnline(@Body() body: { botId: string }) {
    this.eventsGateway.notifyBotOnline(body.botId);
    return { success: true };
  }
}
