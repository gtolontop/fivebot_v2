import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

interface JobData {
  [key: string]: any;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('bot-queue') private botQueue: Queue,
  ) {}

  async addJob(jobType: string, data: JobData, options?: any): Promise<void> {
    await this.botQueue.add(jobType, data, {
      priority: this.getJobPriority(jobType),
      delay: options?.delay || 0,
      ...options,
    });

    console.log(`📋 Queued job: ${jobType}`, data);
  }

  async getJobs(status: 'waiting' | 'active' | 'completed' | 'failed' = 'waiting') {
    return this.botQueue.getJobs([status], 0, 50);
  }

  async getJobCounts() {
    return this.botQueue.getJobCounts();
  }

  async pauseQueue(): Promise<void> {
    await this.botQueue.pause();
  }

  async resumeQueue(): Promise<void> {
    await this.botQueue.resume();
  }

  async cleanJobs(type: 'completed' | 'failed', olderThan: number = 24 * 60 * 60 * 1000): Promise<void> {
    await this.botQueue.clean(olderThan, type);
  }

  private getJobPriority(jobType: string): number {
    const priorities = {
      'create-bot': 10,
      'start-bot': 8,
      'stop-bot': 9,
      'delete-bot': 7,
      'update-bot-config': 5,
      'health-check': 3,
      'cleanup': 1,
    };

    return priorities[jobType] || 5;
  }
}