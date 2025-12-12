import { Module } from '@nestjs/common';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { AutoModService } from './auto-mod.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ModerationController],
  providers: [ModerationService, AutoModService],
  exports: [ModerationService, AutoModService],
})
export class ModerationModule {}
