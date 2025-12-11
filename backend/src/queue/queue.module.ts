import { Module, forwardRef } from '@nestjs/common';
import { SimpleQueueService } from './simple-queue.service';
import { QUEUE_SERVICE } from './queue.interface';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EncryptionModule } from '../common/encryption/encryption.module';
import { BotsModule } from '../bots/bots.module';

@Module({
  imports: [
    PrismaModule,
    EncryptionModule,
    forwardRef(() => BotsModule),
  ],
  providers: [
    {
      provide: QUEUE_SERVICE,
      useClass: SimpleQueueService,
    },
  ],
  exports: [QUEUE_SERVICE],
})
export class QueueModule {}