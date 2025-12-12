import { Module } from '@nestjs/common';
import { AfkService } from './afk.service';
import { AfkController } from './afk.controller';

@Module({
  controllers: [AfkController],
  providers: [AfkService],
  exports: [AfkService],
})
export class AfkModule {}
