import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IQueueService, JobData } from './queue.interface';

@Injectable()
export class QueueService implements IQueueService {
  constructor(
    @InjectQueue('bot-queue') private botQueue: Queue,
  ) {}

  async addJob(jobType: string, data: JobData, options?: any): Promise<void> {
    // Add timeout to prevent hanging
    const addJobPromise = this.botQueue.add(jobType, data, {
      priority: this.getJobPriority(jobType),
      delay: options?.delay || 0,
      ...options,
    });

    // Timeout after 5 seconds
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Queue job timeout')), 5000)
    );

    await Promise.race([addJobPromise, timeoutPromise]);
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
    await this.botQueue.clean(olderThan, type as any);
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