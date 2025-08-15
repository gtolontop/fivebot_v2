import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheCleanupService } from './cache-cleanup.service';
import { CacheController } from './cache.controller';

@Global()
@Module({
  controllers: [CacheController],
  providers: [CacheService, CacheCleanupService],
  exports: [CacheService],
})
export class CacheModule {}