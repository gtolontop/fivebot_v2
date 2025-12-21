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

// Feature Modules (cleaned up - removed incomplete modules)

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
  ],
  controllers: [UrlMetadataController, UploadController],
  providers: [AppService],
})
export class AppModule {}