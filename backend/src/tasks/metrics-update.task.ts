import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BotMetricsService } from '../bots/bot-metrics.service';

@Injectable()
export class MetricsUpdateTask {
  private readonly logger = new Logger(MetricsUpdateTask.name);

  constructor(private botMetricsService: BotMetricsService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateMetrics() {
    this.logger.debug('Running metrics update task');
    try {
      await this.botMetricsService.updateAllBotMetrics();
      this.logger.debug('Metrics update completed');
    } catch (error) {
      this.logger.error('Error updating metrics:', error);
    }
  }
}