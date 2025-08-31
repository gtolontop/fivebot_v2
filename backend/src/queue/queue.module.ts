import { Module, forwardRef } from '@nestjs/common';
import { SimpleQueueService } from './simple-queue.service';
import { QueueService } from './queue.service';
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
      provide: QueueService,
      useClass: SimpleQueueService,
    },
  ],
  exports: [QueueService],
})
export class QueueModule {}