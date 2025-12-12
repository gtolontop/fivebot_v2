import { Module } from '@nestjs/common';
import { SuggestionsController } from './suggestions.controller';
import { SuggestionsService } from './suggestions.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  imports: [],
  controllers: [SuggestionsController],
  providers: [SuggestionsService, PrismaService],
  exports: [SuggestionsService],
})
export class SuggestionsModule {}
