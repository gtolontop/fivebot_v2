import { Module } from '@nestjs/common';
import { MusicController } from './music.controller';
import { MusicService } from './music.service';
import { PlaylistService } from './playlist.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  imports: [],
  controllers: [MusicController],
  providers: [MusicService, PlaylistService, PrismaService],
  exports: [MusicService, PlaylistService],
})
export class MusicModule {}
