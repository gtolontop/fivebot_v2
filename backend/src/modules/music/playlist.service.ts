import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface PlaylistTrackData {
  title: string;
  artist?: string;
  url: string;
  thumbnail?: string;
  duration: number;
  source: string;
  addedBy: string;
}

@Injectable()
export class PlaylistService {
  private readonly logger = new Logger(PlaylistService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== PLAYLIST MANAGEMENT ====================

  /**
   * Get all playlists for a user
   */
  async getUserPlaylists(userId: string, guildId?: string) {
    const where: any = { userId };

    if (guildId) {
      where.guildId = guildId;
    }

    return this.prisma.playlist.findMany({
      where,
      include: {
        tracks: {
          orderBy: { position: 'asc' },
          take: 5, // Only include first 5 tracks for preview
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get a specific playlist by ID
   */
  async getPlaylist(playlistId: string, userId?: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        tracks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist ${playlistId} not found`);
    }

    // Check if user has access (owner or public playlist)
    if (userId && !playlist.isPublic && playlist.userId !== userId) {
      throw new ForbiddenException('You do not have access to this playlist');
    }

    return playlist;
  }

  /**
   * Create a new playlist
   */
  async createPlaylist(
    userId: string,
    name: string,
    description?: string,
    isPublic: boolean = false,
    guildId?: string,
    configId?: string,
  ) {
    return this.prisma.playlist.create({
      data: {
        userId,
        name,
        description,
        isPublic,
        guildId,
        configId,
      },
    });
  }

  /**
   * Update playlist details
   */
  async updatePlaylist(playlistId: string, userId: string, data: any) {
    // Check if playlist exists and user owns it
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist ${playlistId} not found`);
    }

    if (playlist.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this playlist');
    }

    return this.prisma.playlist.update({
      where: { id: playlistId },
      data: {
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
        thumbnail: data.thumbnail,
      },
    });
  }

  /**
   * Delete a playlist
   */
  async deletePlaylist(playlistId: string, userId: string) {
    // Check if playlist exists and user owns it
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist ${playlistId} not found`);
    }

    if (playlist.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this playlist');
    }

    await this.prisma.playlist.delete({
      where: { id: playlistId },
    });

    this.logger.log(`Deleted playlist ${playlistId} by user ${userId}`);
    return { message: 'Playlist deleted successfully' };
  }

  // ==================== TRACK MANAGEMENT ====================

  /**
   * Add a track to a playlist
   */
  async addTrack(playlistId: string, userId: string, trackData: PlaylistTrackData) {
    // Check if playlist exists and user owns it
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
      include: { tracks: true },
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist ${playlistId} not found`);
    }

    if (playlist.userId !== userId) {
      throw new ForbiddenException('You do not have permission to modify this playlist');
    }

    // Get next position
    const position = playlist.tracks.length;

    // Create track
    const track = await this.prisma.playlistTrack.create({
      data: {
        playlistId,
        title: trackData.title,
        artist: trackData.artist,
        url: trackData.url,
        thumbnail: trackData.thumbnail,
        duration: trackData.duration,
        source: trackData.source,
        addedBy: trackData.addedBy,
        position,
      },
    });

    // Update playlist metadata
    await this.prisma.playlist.update({
      where: { id: playlistId },
      data: {
        trackCount: { increment: 1 },
        totalDuration: { increment: trackData.duration },
        thumbnail: playlist.thumbnail || trackData.thumbnail, // Set playlist thumbnail if not set
      },
    });

    this.logger.log(`Added track to playlist ${playlistId}: ${trackData.title}`);
    return track;
  }

  /**
   * Remove a track from a playlist
   */
  async removeTrack(playlistId: string, userId: string, trackId: string) {
    // Check if playlist exists and user owns it
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist ${playlistId} not found`);
    }

    if (playlist.userId !== userId) {
      throw new ForbiddenException('You do not have permission to modify this playlist');
    }

    // Find and delete track
    const track = await this.prisma.playlistTrack.findUnique({
      where: { id: trackId },
    });

    if (!track || track.playlistId !== playlistId) {
      throw new NotFoundException(`Track ${trackId} not found in playlist`);
    }

    await this.prisma.playlistTrack.delete({
      where: { id: trackId },
    });

    // Reorder remaining tracks
    await this.prisma.playlistTrack.updateMany({
      where: {
        playlistId,
        position: { gt: track.position },
      },
      data: {
        position: { decrement: 1 },
      },
    });

    // Update playlist metadata
    await this.prisma.playlist.update({
      where: { id: playlistId },
      data: {
        trackCount: { decrement: 1 },
        totalDuration: { decrement: track.duration },
      },
    });

    this.logger.log(`Removed track ${trackId} from playlist ${playlistId}`);
    return { message: 'Track removed successfully' };
  }

  /**
   * Reorder tracks in a playlist
   */
  async reorderTracks(playlistId: string, userId: string, positions: { trackId: string; position: number }[]) {
    // Check if playlist exists and user owns it
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
      include: { tracks: true },
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist ${playlistId} not found`);
    }

    if (playlist.userId !== userId) {
      throw new ForbiddenException('You do not have permission to modify this playlist');
    }

    // Validate all tracks belong to this playlist
    const trackIds = positions.map(p => p.trackId);
    const tracks = await this.prisma.playlistTrack.findMany({
      where: {
        id: { in: trackIds },
        playlistId,
      },
    });

    if (tracks.length !== trackIds.length) {
      throw new BadRequestException('Some tracks do not belong to this playlist');
    }

    // Update positions in a transaction
    await this.prisma.$transaction(
      positions.map(({ trackId, position }) =>
        this.prisma.playlistTrack.update({
          where: { id: trackId },
          data: { position },
        })
      )
    );

    this.logger.log(`Reordered tracks in playlist ${playlistId}`);
    return { message: 'Tracks reordered successfully' };
  }

  // ==================== PUBLIC PLAYLISTS ====================

  /**
   * Get public playlists with pagination
   */
  async getPublicPlaylists(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [playlists, total] = await Promise.all([
      this.prisma.playlist.findMany({
        where: { isPublic: true },
        include: {
          tracks: {
            orderBy: { position: 'asc' },
            take: 5, // Preview tracks
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.playlist.count({
        where: { isPublic: true },
      }),
    ]);

    return {
      playlists,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Search public playlists
   */
  async searchPublicPlaylists(query: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [playlists, total] = await Promise.all([
      this.prisma.playlist.findMany({
        where: {
          isPublic: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          tracks: {
            orderBy: { position: 'asc' },
            take: 5,
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.playlist.count({
        where: {
          isPublic: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    return {
      playlists,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== IMPORT/EXPORT ====================

  /**
   * Import playlist from URL (YouTube, Spotify, etc.)
   * This is a placeholder - actual implementation would use external APIs
   */
  async importPlaylist(userId: string, url: string, name?: string, isPublic: boolean = false) {
    // Validate URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new BadRequestException('Invalid URL');
    }

    // Detect source
    let source = 'unknown';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      source = 'youtube';
    } else if (url.includes('spotify.com')) {
      source = 'spotify';
    } else if (url.includes('soundcloud.com')) {
      source = 'soundcloud';
    }

    // Create placeholder playlist
    // In production, you would fetch playlist data from the external API
    const playlist = await this.prisma.playlist.create({
      data: {
        userId,
        name: name || `Imported from ${source}`,
        description: `Imported from ${url}`,
        isPublic,
      },
    });

    this.logger.log(`Created import placeholder for playlist from ${source}`);

    // Return playlist with instruction to use external API
    return {
      ...playlist,
      message: 'Playlist created. Use external API to fetch and add tracks.',
      source,
      importUrl: url,
    };
  }

  /**
   * Clone/copy a playlist
   */
  async clonePlaylist(playlistId: string, userId: string, newName?: string) {
    // Get source playlist
    const sourcePlaylist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
      include: { tracks: { orderBy: { position: 'asc' } } },
    });

    if (!sourcePlaylist) {
      throw new NotFoundException(`Playlist ${playlistId} not found`);
    }

    // Check access
    if (!sourcePlaylist.isPublic && sourcePlaylist.userId !== userId) {
      throw new ForbiddenException('You do not have access to this playlist');
    }

    // Create new playlist
    const newPlaylist = await this.prisma.playlist.create({
      data: {
        userId,
        name: newName || `${sourcePlaylist.name} (Copy)`,
        description: sourcePlaylist.description,
        isPublic: false, // Default to private
        thumbnail: sourcePlaylist.thumbnail,
        trackCount: sourcePlaylist.trackCount,
        totalDuration: sourcePlaylist.totalDuration,
      },
    });

    // Copy tracks
    if (sourcePlaylist.tracks.length > 0) {
      await this.prisma.playlistTrack.createMany({
        data: sourcePlaylist.tracks.map(track => ({
          playlistId: newPlaylist.id,
          title: track.title,
          artist: track.artist,
          url: track.url,
          thumbnail: track.thumbnail,
          duration: track.duration,
          source: track.source,
          addedBy: userId,
          position: track.position,
        })),
      });
    }

    this.logger.log(`Cloned playlist ${playlistId} to ${newPlaylist.id} for user ${userId}`);
    return newPlaylist;
  }

  /**
   * Get playlist statistics
   */
  async getPlaylistStats(playlistId: string, userId?: string) {
    const playlist = await this.getPlaylist(playlistId, userId);

    // Calculate stats
    const sourceBreakdown = playlist.tracks.reduce((acc, track) => {
      acc[track.source] = (acc[track.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const contributors = [...new Set(playlist.tracks.map(t => t.addedBy))];

    return {
      playlistId: playlist.id,
      name: playlist.name,
      totalTracks: playlist.trackCount,
      totalDuration: playlist.totalDuration,
      totalDurationFormatted: this.formatDuration(playlist.totalDuration),
      averageDuration: playlist.trackCount > 0
        ? Math.floor(playlist.totalDuration / playlist.trackCount)
        : 0,
      sourceBreakdown,
      contributors: contributors.length,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
    };
  }

  /**
   * Format duration in seconds to human readable format
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}
