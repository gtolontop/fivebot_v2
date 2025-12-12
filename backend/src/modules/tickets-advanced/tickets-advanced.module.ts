import { Module } from '@nestjs/common';
import { TicketsAdvancedController } from './tickets-advanced.controller';
import { TicketsAdvancedService } from './tickets-advanced.service';
import { TranscriptService } from './transcript.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TicketsAdvancedController],
  providers: [TicketsAdvancedService, TranscriptService],
  exports: [TicketsAdvancedService, TranscriptService],
})
export class TicketsAdvancedModule {}
