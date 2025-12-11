import { Module } from '@nestjs/common';
import { BotsService } from './bots.service';
import { BotsController } from './bots.controller';
import { TicketMessagesController } from './ticket-messages.controller';
import { AIController } from './ai.controller';
import { CollaboratorsController } from './collaborators.controller';
import { BotRecoveryService } from './bot-recovery.service';
import { BotMetricsService } from './bot-metrics.service';
import { SetupMetricsService } from './setup-metrics.service';
import { BotMonitorService } from './bot-monitor.service';
import { BotLogsService } from './bot-logs.service';
import { ConsoleBufferService } from './console-buffer.service';
import { BotRealtimeMetricsService } from './bot-realtime-metrics.service';
import { BotProcessMetricsService } from './bot-process-metrics.service';
import { BotStateService } from './bot-state.service';
import { TicketService } from './ticket.service';
import { CollaboratorsService } from './collaborators.service';
import { AIService } from './ai.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { EventsService } from '../common/events/events.service';
import { DiscordModule } from '../common/discord/discord.module';
import { QueueModule } from '../queue/queue.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [QueueModule, UsersModule, DiscordModule, NotificationsModule],
  controllers: [BotsController, TicketMessagesController, AIController, CollaboratorsController],
  providers: [
    BotsService,
    BotRecoveryService,
    BotMetricsService,
    SetupMetricsService,
    BotMonitorService,
    BotLogsService,
    ConsoleBufferService,
    BotRealtimeMetricsService,
    BotProcessMetricsService,
    BotStateService,
    TicketService,
    CollaboratorsService,
    AIService,
    EncryptionService,
    EventsService,
  ],
  exports: [
    BotsService,
    BotRecoveryService,
    BotLogsService,
    ConsoleBufferService,
    BotMetricsService,
    BotProcessMetricsService,
    BotStateService,
    CollaboratorsService,
    AIService,
    EventsService,
  ],
})
export class BotsModule {}