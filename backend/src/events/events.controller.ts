import { Controller, Post, Body } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Controller('events')
export class EventsController {
  constructor(private gateway: EventsGateway) {}

  @Post('bot-status')
  notifyBotStatus(@Body() body: { botId: string; status: string }) {
    this.gateway.emitBotStatus(body.botId, body.status);
    return { success: true };
  }
}
