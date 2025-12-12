import { Module } from '@nestjs/common';
import { EconomyController } from './economy.controller';
import { EconomyService } from './economy.service';
import { ShopService } from './shop.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  imports: [],
  controllers: [EconomyController],
  providers: [EconomyService, ShopService, PrismaService],
  exports: [EconomyService, ShopService],
})
export class EconomyModule {}
