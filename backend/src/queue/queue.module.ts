import { Module } from '@nestjs/common';
import { SimpleQueueService } from './simple-queue.service';
import { QueueService } from './queue.service';

@Module({
  providers: [
    {
      provide: QueueService,
      useClass: SimpleQueueService,
    },
  ],
  exports: [QueueService],
})
export class QueueModule {}