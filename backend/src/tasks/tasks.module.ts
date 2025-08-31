import { Module } from '@nestjs/common';
import { MetricsUpdateTask } from './metrics-update.task';
import { BotsModule } from '../bots/bots.module';

@Module({
  imports: [BotsModule],
  providers: [MetricsUpdateTask],
})
export class TasksModule {}