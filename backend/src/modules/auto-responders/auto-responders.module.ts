import { Module } from '@nestjs/common';
import { AutoRespondersController } from './auto-responders.controller';
import { AutoRespondersService } from './auto-responders.service';
import { TagsService } from './tags.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AutoRespondersController],
  providers: [AutoRespondersService, TagsService],
  exports: [AutoRespondersService, TagsService],
})
export class AutoRespondersModule {}
