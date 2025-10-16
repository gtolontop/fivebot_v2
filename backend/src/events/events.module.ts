import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventsController } from './events.controller';
import { BotMonitorService } from './bot-monitor.service';

@Module({
  controllers: [EventsController],
  providers: [EventsGateway, BotMonitorService],
  exports: [EventsGateway],
})
export class EventsModule {}
