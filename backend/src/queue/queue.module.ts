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
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get('REDIS_URL');
        if (redisUrl) {
          return { 
            redis: redisUrl,
            defaultJobOptions: {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
              removeOnComplete: 100,
              removeOnFail: 50,
            },
          };
        }
        return {
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
        };
      },
    }),
    BullModule.registerQueueAsync({
      name: 'bot-queue',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get('REDIS_URL');
        if (redisUrl) {
          return { redis: redisUrl };
        }
        return {
          redis: {
            host: configService.get('REDIS_HOST') || '83.150.218.42',
            port: parseInt(configService.get('REDIS_PORT')) || 26078,
            password: configService.get('REDIS_PASSWORD') || 'admin',
            db: parseInt(configService.get('REDIS_DB')) || 0,
          },
        };
      },
    }),
  ],
  providers: [QueueService, BotWorker, EncryptionService],
  exports: [QueueService],
})
export class QueueModule {}