import { Module } from '@nestjs/common';
import { StarboardService } from './starboard.service';
import { StarboardController } from './starboard.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StarboardController],
  providers: [StarboardService],
  exports: [StarboardService],
})
export class StarboardModule {}
