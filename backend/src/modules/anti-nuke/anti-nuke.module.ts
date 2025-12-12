import { Module } from '@nestjs/common';
import { AntiNukeController } from './anti-nuke.controller';
import { AntiNukeService } from './anti-nuke.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [AntiNukeController],
  providers: [AntiNukeService],
  exports: [AntiNukeService],
})
export class AntiNukeModule {}
