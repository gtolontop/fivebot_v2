import { Module } from '@nestjs/common';
import { LevelingService } from './leveling.service';
import { LevelingConfigService } from './leveling-config.service';
import { LevelingController } from './leveling.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LevelingController],
  providers: [LevelingService, LevelingConfigService],
  exports: [LevelingService, LevelingConfigService],
})
export class LevelingModule {}
