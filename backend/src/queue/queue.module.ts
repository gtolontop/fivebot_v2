import { Module } from '@nestjs/common';
import { SimpleQueueService } from './simple-queue.service';
import { QueueService } from './queue.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EncryptionModule } from '../common/encryption/encryption.module';

@Module({
  imports: [PrismaModule, EncryptionModule],
  providers: [
    {
      provide: QueueService,
      useClass: SimpleQueueService,
    },
  ],
  exports: [QueueService],
})
export class QueueModule {}