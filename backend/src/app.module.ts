import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { CacheModule } from './common/cache/cache.module';
import { DiscordModule } from './common/discord/discord.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BotsModule } from './bots/bots.module';
import { CreditsModule } from './credits/credits.module';
import { QueueModule } from './queue/queue.module';
import { TasksModule } from './tasks/tasks.module';
import { UrlMetadataController } from './utils/url-metadata.controller';
import { UploadController } from './utils/upload.controller';

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
    PrismaModule,
    CacheModule,
    DiscordModule,
    AuthModule,
    UsersModule,
    BotsModule,
    CreditsModule,
    QueueModule,
    TasksModule,
  ],
  controllers: [UrlMetadataController],
  providers: [AppService],
})
export class AppModule {}