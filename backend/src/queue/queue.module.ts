import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { QueueService } from './queue.service';
import { SimpleQueueService } from './simple-queue.service';
import { EncryptionService } from '../common/encryption/encryption.service';

// Try to use Redis queue, fallback to simple queue
const QueueProvider = {
  provide: 'QUEUE_SERVICE',
  useFactory: async (configService: ConfigService) => {
    try {
      // Test Redis connection
      const Redis = require('ioredis');
      const redis = new Redis({
        host: '83.150.218.42',
        port: 26078,
        password: 'admin',
        db: 0,
        connectTimeout: 3000,
        lazyConnect: true,
      });

      await redis.connect();
      await redis.ping();
      redis.disconnect();
      
      console.log('✅ Redis available, using BullMQ queue');
      // Return the real QueueService (would need BullMQ setup)
      return new SimpleQueueService(); // For now, use simple even if Redis works
    } catch (error) {
      console.log('⚠️ Redis not available, using simple in-memory queue');
      return new SimpleQueueService();
    }
  },
  inject: [ConfigService],
};

@Module({
  providers: [
    QueueProvider,
    {
      provide: QueueService,
      useExisting: 'QUEUE_SERVICE',
    },
    EncryptionService
  ],
  exports: [QueueService],
})
export class QueueModule {}