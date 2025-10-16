import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { EventsService } from '../common/events/events.service';

@Module({
  controllers: [InternalController],
  providers: [EventsService],
})
export class InternalModule {}
