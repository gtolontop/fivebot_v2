import { Module } from '@nestjs/common';
import { ServerStatsService } from './server-stats.service';
import { ServerStatsController } from './server-stats.controller';

@Module({
  controllers: [ServerStatsController],
  providers: [ServerStatsService],
  exports: [ServerStatsService],
})
export class ServerStatsModule {}
