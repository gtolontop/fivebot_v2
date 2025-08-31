import { Injectable } from '@nestjs/common';

@Injectable()
export class ConsoleBufferService {
  private buffers: Map<string, string[]> = new Map();
  private readonly maxBufferSize = 200;

  /**
   * Add a log entry to the buffer for a specific bot
   * @param botId - The ID of the bot
   * @param logLine - The formatted log line (already includes timestamp and prefix)
   */
  addLog(botId: string, logLine: string): void {
    if (!this.buffers.has(botId)) {
      this.buffers.set(botId, []);
    }

    const buffer = this.buffers.get(botId)!;
    buffer.push(logLine);

    // Keep only the last 200 lines
    if (buffer.length > this.maxBufferSize) {
      buffer.splice(0, buffer.length - this.maxBufferSize);
    }
  }

  /**
   * Get the buffer content for a specific bot
   * @param botId - The ID of the bot
   * @returns Array of log lines or empty array if no buffer exists
   */
  getBuffer(botId: string): string[] {
    return this.buffers.get(botId) || [];
  }

  /**
   * Get the buffer content as a single string
   * @param botId - The ID of the bot
   * @returns Joined log lines or empty string if no buffer exists
   */
  getBufferAsString(botId: string): string {
    const buffer = this.buffers.get(botId);
    return buffer ? buffer.join('\n') : '';
  }

  /**
   * Clear the buffer for a specific bot
   * @param botId - The ID of the bot
   */
  clearBuffer(botId: string): void {
    this.buffers.delete(botId);
  }

  /**
   * Clean up buffers when a bot goes offline
   * @param botId - The ID of the bot
   */
  onBotOffline(botId: string): void {
    // Add a final log entry before clearing
    const timestamp = new Date().toISOString();
    this.addLog(botId, `[${timestamp}] [System] Bot went offline, clearing console buffer`);
    
    // Clear the buffer after a short delay to allow final messages to be seen
    setTimeout(() => {
      this.clearBuffer(botId);
    }, 5000);
  }

  /**
   * Get the size of a specific buffer
   * @param botId - The ID of the bot
   * @returns Number of log lines in the buffer
   */
  getBufferSize(botId: string): number {
    const buffer = this.buffers.get(botId);
    return buffer ? buffer.length : 0;
  }

  /**
   * Get all bot IDs that have buffers
   * @returns Array of bot IDs
   */
  getActiveBotIds(): string[] {
    return Array.from(this.buffers.keys());
  }

  /**
   * Clear all buffers (useful for cleanup or testing)
   */
  clearAllBuffers(): void {
    this.buffers.clear();
  }

  /**
   * Get memory usage statistics
   * @returns Object with buffer statistics
   */
  getStats(): {
    totalBots: number;
    totalLines: number;
    bufferSizes: Record<string, number>;
  } {
    const stats = {
      totalBots: this.buffers.size,
      totalLines: 0,
      bufferSizes: {} as Record<string, number>,
    };

    for (const [botId, buffer] of this.buffers.entries()) {
      stats.bufferSizes[botId] = buffer.length;
      stats.totalLines += buffer.length;
    }

    return stats;
  }
}