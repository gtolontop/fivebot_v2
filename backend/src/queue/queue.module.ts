import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

import { QueueService } from './queue.service';
import { BotWorker } from './workers/bot.worker';
import { EncryptionService } from '../common/encryption/encryption.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: '83.150.218.42',
          port: 26078,
          password: 'admin',
          db: 0,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'bot-queue',
    }),
  ],
  providers: [QueueService, BotWorker, EncryptionService],
  exports: [QueueService],
})
export class QueueModule {}