import { Module } from '@nestjs/common';
import { LoggingController } from './logging.controller';
import { LoggingService } from './logging.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  imports: [],
  controllers: [LoggingController],
  providers: [LoggingService, PrismaService],
  exports: [LoggingService],
})
export class LoggingModule {}
