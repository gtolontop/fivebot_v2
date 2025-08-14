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
          host: configService.get('REDIS_HOST') || 'localhost',
          port: parseInt(configService.get('REDIS_PORT')) || 6379,
          password: configService.get('REDIS_PASSWORD'),
          db: parseInt(configService.get('REDIS_DB')) || 0,
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
    BullModule.registerQueue(
      {
        name: 'bot-queue',
      },
    ),
  ],
  providers: [QueueService, BotWorker, EncryptionService],
  exports: [QueueService],
})
export class QueueModule {}