import { Module } from '@nestjs/common';
import { TempChannelsService } from './temp-channels.service';
import { TempChannelsController } from './temp-channels.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TempChannelsController],
  providers: [TempChannelsService],
  exports: [TempChannelsService],
})
export class TempChannelsModule {}
