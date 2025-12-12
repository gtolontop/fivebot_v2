import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

// Types for music queue and playback
export interface Track {
  title: string;
  artist?: string;
  url: string;
  thumbnail?: string;
  duration: number;
  source: string; // youtube, spotify, soundcloud
  requestedBy: string;
  position?: number;
}

export interface QueueState {
  guildId: string;
  tracks: Track[];
  nowPlaying: Track | null;
  position: number;
  isPlaying: boolean;
  isPaused: boolean;
  volume: number;
  loop: 'off' | 'track' | 'queue';
  history: Track[];
}

@Injectable()
export class MusicService {
  private readonly logger = new Logger(MusicService.name);

  // In-memory queue storage (should be replaced with Redis in production)
  private queues: Map<string, QueueState> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  // ==================== CONFIG ====================

  /**
   * Get music configuration for a guild
   */
  async getConfig(guildId: string) {
    const config = await this.prisma.musicConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      throw new NotFoundException(`Music config not found for guild ${guildId}`);
    }

    return config;
  }

  /**
   * Get or create music configuration
   */
  async getOrCreateConfig(guildId: string, botId: string) {
    let config = await this.prisma.musicConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      config = await this.prisma.musicConfig.create({
        data: {
          guildId,
          botId,
        },
      });
    }

    return config;
  }

  /**
   * Update music configuration
   */
  async updateConfig(guildId: string, botId: string, data: any) {
    // Ensure config exists or create it
    await this.getOrCreateConfig(guildId, botId);

    // Parse JSON fields if needed
    if (data.allowedChannelIds && typeof data.allowedChannelIds === 'string') {
      try {
        data.allowedChannelIds = JSON.parse(data.allowedChannelIds);
      } catch (e) {
        // Keep as is if not valid JSON
      }
    }

    if (data.blockedUsers && typeof data.blockedUsers === 'string') {
      try {
        data.blockedUsers = JSON.parse(data.blockedUsers);
      } catch (e) {
        // Keep as is if not valid JSON
      }
    }

    return this.prisma.musicConfig.update({
      where: { guildId },
      data,
    });
  }

  // ==================== QUEUE MANAGEMENT ====================

  /**
   * Initialize queue state for a guild
   */
  private initQueue(guildId: string): QueueState {
    const queue: QueueState = {
      guildId,
      tracks: [],
      nowPlaying: null,
      position: 0,
      isPlaying: false,
      isPaused: false,
      volume: 50,
      loop: 'off',
      history: [],
    };
    this.queues.set(guildId, queue);
    return queue;
  }

  /**
   * Get current queue for a guild
   */
  async getQueue(guildId: string) {
    const queue = this.queues.get(guildId) || this.initQueue(guildId);
    return queue;
  }

  /**
   * Add track to queue
   */
  async addToQueue(guildId: string, track: Track) {
    const queue = this.queues.get(guildId) || this.initQueue(guildId);

    // Get config to check limits
    const config = await this.getConfig(guildId).catch(() => null);

    if (config) {
      // Check queue size limit
      if (queue.tracks.length >= config.maxQueueSize) {
        throw new BadRequestException(`Queue is full (max ${config.maxQueueSize} tracks)`);
      }

      // Check song duration limit
      if (track.duration > config.maxSongDuration) {
        throw new BadRequestException(
          `Track duration exceeds limit (max ${config.maxSongDuration} seconds)`
        );
      }
    }

    // Add position to track
    track.position = queue.tracks.length;
    queue.tracks.push(track);

    this.queues.set(guildId, queue);

    this.logger.log(`Added track to queue for guild ${guildId}: ${track.title}`);
    return queue;
  }

  /**
   * Remove track from queue by position
   */
  async removeFromQueue(guildId: string, position: number) {
    const queue = this.queues.get(guildId);

    if (!queue) {
      throw new NotFoundException('No active queue found');
    }

    if (position < 0 || position >= queue.tracks.length) {
      throw new BadRequestException('Invalid position');
    }

    const removed = queue.tracks.splice(position, 1)[0];

    // Update positions
    queue.tracks.forEach((track, index) => {
      track.position = index;
    });

    this.queues.set(guildId, queue);

    this.logger.log(`Removed track from queue for guild ${guildId}: ${removed.title}`);
    return queue;
  }

  /**
   * Clear entire queue
   */
  async clearQueue(guildId: string) {
    const queue = this.queues.get(guildId);

    if (!queue) {
      throw new NotFoundException('No active queue found');
    }

    queue.tracks = [];
    this.queues.set(guildId, queue);

    this.logger.log(`Cleared queue for guild ${guildId}`);
    return queue;
  }

  /**
   * Shuffle queue
   */
  async shuffleQueue(guildId: string) {
    const queue = this.queues.get(guildId);

    if (!queue) {
      throw new NotFoundException('No active queue found');
    }

    // Fisher-Yates shuffle
    for (let i = queue.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue.tracks[i], queue.tracks[j]] = [queue.tracks[j], queue.tracks[i]];
    }

    // Update positions
    queue.tracks.forEach((track, index) => {
      track.position = index;
    });

    this.queues.set(guildId, queue);

    this.logger.log(`Shuffled queue for guild ${guildId}`);
    return queue;
  }

  /**
   * Move track from one position to another
   */
  async moveTrack(guildId: string, from: number, to: number) {
    const queue = this.queues.get(guildId);

    if (!queue) {
      throw new NotFoundException('No active queue found');
    }

    if (from < 0 || from >= queue.tracks.length || to < 0 || to >= queue.tracks.length) {
      throw new BadRequestException('Invalid position');
    }

    const [track] = queue.tracks.splice(from, 1);
    queue.tracks.splice(to, 0, track);

    // Update positions
    queue.tracks.forEach((track, index) => {
      track.position = index;
    });

    this.queues.set(guildId, queue);

    this.logger.log(`Moved track in queue for guild ${guildId}: ${track.title} from ${from} to ${to}`);
    return queue;
  }

  // ==================== PLAYBACK CONTROL ====================

  /**
   * Get now playing track
   */
  async getNowPlaying(guildId: string) {
    const queue = this.queues.get(guildId);

    if (!queue || !queue.nowPlaying) {
      throw new NotFoundException('No track currently playing');
    }

    return {
      track: queue.nowPlaying,
      position: queue.position,
      isPlaying: queue.isPlaying,
      isPaused: queue.isPaused,
      volume: queue.volume,
      loop: queue.loop,
    };
  }

  /**
   * Skip to next track
   */
  async skip(guildId: string) {
    const queue = this.queues.get(guildId);

    if (!queue) {
      throw new NotFoundException('No active queue found');
    }

    if (!queue.nowPlaying) {
      throw new BadRequestException('No track currently playing');
    }

    // Add current track to history
    if (queue.nowPlaying) {
      queue.history.push(queue.nowPlaying);
      // Keep last 50 tracks in history
      if (queue.history.length > 50) {
        queue.history.shift();
      }
    }

    // Handle loop modes
    if (queue.loop === 'track' && queue.nowPlaying) {
      // Don't change track, just restart
      queue.position = 0;
    } else if (queue.loop === 'queue' && queue.nowPlaying) {
      // Add current track to end of queue
      queue.tracks.push({ ...queue.nowPlaying, position: queue.tracks.length });
    }

    // Get next track
    if (queue.tracks.length > 0) {
      queue.nowPlaying = queue.tracks.shift()!;
      queue.position = 0;

      // Update positions
      queue.tracks.forEach((track, index) => {
        track.position = index;
      });
    } else {
      queue.nowPlaying = null;
      queue.isPlaying = false;
    }

    this.queues.set(guildId, queue);

    this.logger.log(`Skipped track for guild ${guildId}`);
    return queue;
  }

  /**
   * Go to previous track
   */
  async previous(guildId: string) {
    const queue = this.queues.get(guildId);

    if (!queue) {
      throw new NotFoundException('No active queue found');
    }

    if (queue.history.length === 0) {
      throw new BadRequestException('No previous track in history');
    }

    // Add current track back to front of queue if exists
    if (queue.nowPlaying) {
      queue.tracks.unshift({ ...queue.nowPlaying, position: 0 });

      // Update positions
      queue.tracks.forEach((track, index) => {
        track.position = index;
      });
    }

    // Get last track from history
    queue.nowPlaying = queue.history.pop()!;
    queue.position = 0;

    this.queues.set(guildId, queue);

    this.logger.log(`Went to previous track for guild ${guildId}`);
    return queue;
  }

  /**
   * Pause playback
   */
  async pause(guildId: string) {
    const queue = this.queues.get(guildId);

    if (!queue) {
      throw new NotFoundException('No active queue found');
    }

    if (!queue.isPlaying) {
      throw new BadRequestException('No track currently playing');
    }

    queue.isPaused = true;
    queue.isPlaying = false;

    this.queues.set(guildId, queue);

    this.logger.log(`Paused playback for guild ${guildId}`);
    return queue;
  }

  /**
   * Resume playback
   */
  async resume(guildId: string) {
    const queue = this.queues.get(guildId);

    if (!queue) {
      throw new NotFoundException('No active queue found');
    }

    if (!queue.isPaused) {
      throw new BadRequestException('Playback is not paused');
    }

    queue.isPaused = false;
    queue.isPlaying = true;

    this.queues.set(guildId, queue);

    this.logger.log(`Resumed playback for guild ${guildId}`);
    return queue;
  }

  /**
   * Set volume
   */
  async setVolume(guildId: string, volume: number) {
    const queue = this.queues.get(guildId);

    if (!queue) {
      throw new NotFoundException('No active queue found');
    }

    // Get config to check max volume
    const config = await this.getConfig(guildId).catch(() => null);

    if (config && volume > config.maxVolume) {
      throw new BadRequestException(`Volume exceeds maximum (max ${config.maxVolume})`);
    }

    if (volume < 0 || volume > 200) {
      throw new BadRequestException('Volume must be between 0 and 200');
    }

    queue.volume = volume;

    this.queues.set(guildId, queue);

    this.logger.log(`Set volume to ${volume} for guild ${guildId}`);
    return queue;
  }

  /**
   * Seek to position in current track
   */
  async seek(guildId: string, position: number) {
    const queue = this.queues.get(guildId);

    if (!queue) {
      throw new NotFoundException('No active queue found');
    }

    if (!queue.nowPlaying) {
      throw new BadRequestException('No track currently playing');
    }

    if (position < 0 || position > queue.nowPlaying.duration) {
      throw new BadRequestException('Invalid seek position');
    }

    queue.position = position;

    this.queues.set(guildId, queue);

    this.logger.log(`Seeked to position ${position} for guild ${guildId}`);
    return queue;
  }

  /**
   * Set loop mode
   */
  async setLoop(guildId: string, mode: 'off' | 'track' | 'queue') {
    const queue = this.queues.get(guildId);

    if (!queue) {
      throw new NotFoundException('No active queue found');
    }

    if (!['off', 'track', 'queue'].includes(mode)) {
      throw new BadRequestException('Invalid loop mode (must be: off, track, queue)');
    }

    queue.loop = mode;

    this.queues.set(guildId, queue);

    this.logger.log(`Set loop mode to ${mode} for guild ${guildId}`);
    return queue;
  }

  /**
   * Get playback history
   */
  async getHistory(guildId: string) {
    const queue = this.queues.get(guildId);

    if (!queue) {
      throw new NotFoundException('No active queue found');
    }

    return queue.history;
  }

  /**
   * Start playback (move first track from queue to nowPlaying)
   */
  async startPlayback(guildId: string) {
    const queue = this.queues.get(guildId) || this.initQueue(guildId);

    if (queue.tracks.length === 0) {
      throw new BadRequestException('Queue is empty');
    }

    if (queue.nowPlaying) {
      throw new BadRequestException('A track is already playing');
    }

    queue.nowPlaying = queue.tracks.shift()!;
    queue.position = 0;
    queue.isPlaying = true;
    queue.isPaused = false;

    // Update positions
    queue.tracks.forEach((track, index) => {
      track.position = index;
    });

    this.queues.set(guildId, queue);

    this.logger.log(`Started playback for guild ${guildId}: ${queue.nowPlaying.title}`);
    return queue;
  }

  /**
   * Stop playback completely
   */
  async stop(guildId: string) {
    const queue = this.queues.get(guildId);

    if (!queue) {
      throw new NotFoundException('No active queue found');
    }

    queue.nowPlaying = null;
    queue.isPlaying = false;
    queue.isPaused = false;
    queue.position = 0;

    this.queues.set(guildId, queue);

    this.logger.log(`Stopped playback for guild ${guildId}`);
    return queue;
  }

  /**
   * Destroy queue (cleanup)
   */
  async destroyQueue(guildId: string) {
    this.queues.delete(guildId);
    this.logger.log(`Destroyed queue for guild ${guildId}`);
  }
}
