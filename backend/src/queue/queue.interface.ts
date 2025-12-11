export interface JobData {
  [key: string]: any;
}

export interface IQueueService {
  addJob(jobType: string, data: JobData, options?: any): Promise<void>;
  getJobs(status?: 'waiting' | 'active' | 'completed' | 'failed'): Promise<any[]>;
  getJobCounts(): Promise<any>;
  pauseQueue(): Promise<void>;
  resumeQueue(): Promise<void>;
  cleanJobs(type: 'completed' | 'failed', olderThan?: number): Promise<void>;
  getRunningBots(): Promise<string[]>;
  forceStopBot(botId: string): Promise<void>;
  forceCleanupAndSync(): Promise<void>;
}

// Injection token for the queue service
export const QUEUE_SERVICE = 'QueueService';

// Type alias for DI convenience
export type QueueService = IQueueService;