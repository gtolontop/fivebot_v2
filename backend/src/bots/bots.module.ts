import { Module } from '@nestjs/common';
import { BotsService } from './bots.service';
import { BotsController } from './bots.controller';
import { TicketMessagesController } from './ticket-messages.controller';
import { BotRecoveryService } from './bot-recovery.service';
import { BotMetricsService } from './bot-metrics.service';
import { SetupMetricsService } from './setup-metrics.service';
import { BotMonitorService } from './bot-monitor.service';
import { BotLogsService } from './bot-logs.service';
import { ConsoleBufferService } from './console-buffer.service';
import { BotRealtimeMetricsService } from './bot-realtime-metrics.service';
import { TicketService } from './ticket.service';
import { CollaboratorsService } from './collaborators.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { DiscordModule } from '../common/discord/discord.module';
import { QueueModule } from '../queue/queue.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [QueueModule, UsersModule, DiscordModule],
  controllers: [BotsController, TicketMessagesController],
  providers: [BotsService, BotRecoveryService, BotMetricsService, SetupMetricsService, BotMonitorService, BotLogsService, ConsoleBufferService, BotRealtimeMetricsService, TicketService, CollaboratorsService, EncryptionService],
  exports: [BotsService, BotRecoveryService, BotLogsService, ConsoleBufferService, BotMetricsService, CollaboratorsService],
})
export class BotsModule {}