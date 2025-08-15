import { Module } from '@nestjs/common';
import { BotsService } from './bots.service';
import { BotsController } from './bots.controller';
import { BotRecoveryService } from './bot-recovery.service';
import { BotMetricsService } from './bot-metrics.service';
import { SetupMetricsService } from './setup-metrics.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { DiscordModule } from '../common/discord/discord.module';
import { QueueModule } from '../queue/queue.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [QueueModule, UsersModule, DiscordModule],
  controllers: [BotsController],
  providers: [BotsService, BotRecoveryService, BotMetricsService, SetupMetricsService, EncryptionService],
  exports: [BotsService, BotRecoveryService],
})
export class BotsModule {}