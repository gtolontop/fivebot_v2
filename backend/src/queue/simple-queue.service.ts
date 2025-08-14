import { Injectable } from '@nestjs/common';

interface JobData {
  [key: string]: any;
}

interface QueuedJob {
  id: string;
  type: string;
  data: JobData;
  priority: number;
  createdAt: Date;
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  error?: string;
}

@Injectable()
export class SimpleQueueService {
  private jobs: QueuedJob[] = [];
  private processing = false;

  async addJob(jobType: string, data: JobData, options?: any): Promise<void> {
    const job: QueuedJob = {
      id: `${jobType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: jobType,
      data,
      priority: this.getJobPriority(jobType),
      createdAt: new Date(),
      status: 'waiting',
    };

    this.jobs.push(job);
    this.jobs.sort((a, b) => b.priority - a.priority); // Higher priority first

    console.log(`📋 Queued job: ${jobType}`, data);

    // Start processing if not already processing
    if (!this.processing) {
      setImmediate(() => this.processJobs());
    }
  }

  private async processJobs(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.jobs.length > 0) {
      const job = this.jobs.find(j => j.status === 'waiting');
      if (!job) break;

      job.status = 'processing';
      console.log(`🔄 Processing job: ${job.type}`, job.data);

      try {
        await this.executeJob(job);
        job.status = 'completed';
        console.log(`✅ Job completed: ${job.type}`);
      } catch (error) {
        job.status = 'failed';
        job.error = error.message;
        console.error(`❌ Job failed: ${job.type}`, error.message);
      }

      // Remove completed/failed jobs after 1 hour
      this.jobs = this.jobs.filter(j => 
        j.status === 'waiting' || 
        j.status === 'processing' || 
        (Date.now() - j.createdAt.getTime()) < 3600000
      );
    }

    this.processing = false;
  }

  private async executeJob(job: QueuedJob): Promise<void> {
    switch (job.type) {
      case 'create-bot':
        await this.handleCreateBot(job.data);
        break;
      case 'start-bot':
        await this.handleStartBot(job.data);
        break;
      case 'stop-bot':
        await this.handleStopBot(job.data);
        break;
      case 'delete-bot':
        await this.handleDeleteBot(job.data);
        break;
      default:
        console.log(`Unknown job type: ${job.type}`);
    }
  }

  private async handleCreateBot(data: JobData): Promise<void> {
    // Bot creation logic would go here
    console.log(`Creating bot container for bot ${data.botId}`);
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async handleStartBot(data: JobData): Promise<void> {
    console.log(`Starting bot ${data.botId}`);
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async handleStopBot(data: JobData): Promise<void> {
    console.log(`Stopping bot ${data.botId}`);
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async handleDeleteBot(data: JobData): Promise<void> {
    console.log(`Deleting bot ${data.botId}`);
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async getJobs(status: 'waiting' | 'processing' | 'completed' | 'failed' = 'waiting') {
    return this.jobs.filter(job => job.status === status);
  }

  async getJobCounts() {
    const counts = {
      waiting: 0,
      active: 0, // processing
      completed: 0,
      failed: 0,
    };

    this.jobs.forEach(job => {
      if (job.status === 'processing') {
        counts.active++;
      } else if (job.status in counts) {
        counts[job.status]++;
      }
    });

    return counts;
  }

  async pauseQueue(): Promise<void> {
    console.log('Queue paused (simple queue - no-op)');
  }

  async resumeQueue(): Promise<void> {
    console.log('Queue resumed (simple queue - no-op)');
  }

  async cleanJobs(type: 'completed' | 'failed', olderThan: number = 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = Date.now() - olderThan;
    this.jobs = this.jobs.filter(job => 
      job.status !== type || job.createdAt.getTime() > cutoff
    );
    console.log(`Cleaned ${type} jobs older than ${olderThan}ms`);
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