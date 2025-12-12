import { Module } from '@nestjs/common';
import { GiveawayController } from './giveaway.controller';
import { GiveawayService } from './giveaway.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GiveawayController],
  providers: [GiveawayService],
  exports: [GiveawayService],
})
export class GiveawayModule {}
