import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { AppService } from './app.service';
import { LoggerModule } from './common/logger';
import { PrismaModule } from './common/prisma/prisma.module';
import { CacheModule } from './common/cache/cache.module';
import { RedisModule } from './common/redis/redis.module';
import { DiscordModule } from './common/discord/discord.module';
import { WebsocketModule } from './common/websocket/websocket.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BotsModule } from './bots/bots.module';
import { CreditsModule } from './credits/credits.module';
import { QueueModule } from './queue/queue.module';
import { TasksModule } from './tasks/tasks.module';
import { UrlMetadataController } from './utils/url-metadata.controller';
import { UploadController } from './utils/upload.controller';
import { NotificationsModule } from './notifications/notifications.module';
import { ModulesModule } from './modules/modules/modules.module';
import { AdminModule } from './modules/admin/admin.module';

// New Feature Modules
import { ModerationModule } from './modules/moderation/moderation.module';
import { LevelingModule } from './modules/leveling/leveling.module';
import { EconomyModule } from './modules/economy/economy.module';
import { GiveawayModule } from './modules/giveaway/giveaway.module';
import { MusicModule } from './modules/music/music.module';
import { SocialFeedsModule } from './modules/social-feeds/social-feeds.module';
import { LoggingModule } from './modules/logging/logging.module';
import { StarboardModule } from './modules/starboard/starboard.module';
import { SuggestionsModule } from './modules/suggestions/suggestions.module';
import { PollsModule } from './modules/polls/polls.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { AutoRespondersModule } from './modules/auto-responders/auto-responders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      ttl: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
      limit: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    }),
    ScheduleModule.forRoot(),
    LoggerModule,
    PrismaModule,
    CacheModule,
    RedisModule,
    DiscordModule,
    WebsocketModule,
    AuthModule,
    UsersModule,
    BotsModule,
    CreditsModule,
    QueueModule,
    TasksModule,
    NotificationsModule,
    ModulesModule,
    AdminModule,
    // Feature Modules
    ModerationModule,
    LevelingModule,
    EconomyModule,
    GiveawayModule,
    MusicModule,
    SocialFeedsModule,
    LoggingModule,
    StarboardModule,
    SuggestionsModule,
    PollsModule,
    RemindersModule,
    AutoRespondersModule,
  ],
  controllers: [UrlMetadataController, UploadController],
  providers: [AppService],
})
export class AppModule {}