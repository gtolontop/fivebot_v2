import { Module } from '@nestjs/common';
import { BotsService } from './bots.service';
import { BotsController } from './bots.controller';
import { BotRecoveryService } from './bot-recovery.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { DiscordService } from '../common/discord/discord.service';
import { QueueModule } from '../queue/queue.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [QueueModule, UsersModule],
  controllers: [BotsController],
  providers: [BotsService, BotRecoveryService, EncryptionService, DiscordService],
  exports: [BotsService, BotRecoveryService],
})
export class BotsModule {}