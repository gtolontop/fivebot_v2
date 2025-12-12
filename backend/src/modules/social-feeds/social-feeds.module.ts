import { Module } from '@nestjs/common';
import { SocialFeedsService } from './social-feeds.service';
import { SocialFeedsController } from './social-feeds.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import {
  YouTubeService,
  TwitchService,
  TwitterService,
  RSSService,
} from './platforms';

@Module({
  imports: [PrismaModule],
  controllers: [SocialFeedsController],
  providers: [
    SocialFeedsService,
    YouTubeService,
    TwitchService,
    TwitterService,
    RSSService,
  ],
  exports: [SocialFeedsService],
})
export class SocialFeedsModule {}
