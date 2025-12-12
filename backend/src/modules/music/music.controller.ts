import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MusicService } from './music.service';
import { PlaylistService } from './playlist.service';
import {
  UpdateMusicConfigDto,
  AddTrackDto,
  MoveTrackDto,
  SetVolumeDto,
  SeekDto,
  SetLoopDto,
  CreatePlaylistDto,
  UpdatePlaylistDto,
  AddPlaylistTrackDto,
  ReorderTracksDto,
  ImportPlaylistDto,
} from './dto';

@Controller('bots/:botId/music')
@UseGuards(JwtAuthGuard)
export class MusicController {
  constructor(
    private readonly musicService: MusicService,
    private readonly playlistService: PlaylistService,
  ) {}

  // ==================== MUSIC CONFIG ====================

  @Get('config')
  async getConfig(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.getOrCreateConfig(guildId, botId);
  }

  @Put('config')
  async updateConfig(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() updateDto: UpdateMusicConfigDto,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.updateConfig(guildId, botId, updateDto);
  }

  // ==================== QUEUE MANAGEMENT ====================

  @Get('queue')
  async getQueue(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.getQueue(guildId);
  }

  @Post('queue')
  async addToQueue(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() addTrackDto: AddTrackDto,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.addToQueue(guildId, addTrackDto);
  }

  @Delete('queue/:position')
  async removeFromQueue(
    @Param('botId') botId: string,
    @Param('position', ParseIntPipe) position: number,
    @Query('guildId') guildId: string,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.removeFromQueue(guildId, position);
  }

  @Delete('queue')
  async clearQueue(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.clearQueue(guildId);
  }

  @Post('queue/shuffle')
  async shuffleQueue(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.shuffleQueue(guildId);
  }

  @Post('queue/move')
  async moveTrack(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() moveTrackDto: MoveTrackDto,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.moveTrack(guildId, moveTrackDto.from, moveTrackDto.to);
  }

  // ==================== PLAYBACK CONTROL ====================

  @Get('now-playing')
  async getNowPlaying(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.getNowPlaying(guildId);
  }

  @Post('play')
  async startPlayback(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.startPlayback(guildId);
  }

  @Post('skip')
  async skip(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.skip(guildId);
  }

  @Post('previous')
  async previous(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.previous(guildId);
  }

  @Post('pause')
  async pause(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.pause(guildId);
  }

  @Post('resume')
  async resume(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.resume(guildId);
  }

  @Post('stop')
  async stop(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.stop(guildId);
  }

  @Post('volume')
  async setVolume(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() setVolumeDto: SetVolumeDto,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.setVolume(guildId, setVolumeDto.volume);
  }

  @Post('seek')
  async seek(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() seekDto: SeekDto,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.seek(guildId, seekDto.position);
  }

  @Post('loop')
  async setLoop(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Body() setLoopDto: SetLoopDto,
  ) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.setLoop(guildId, setLoopDto.mode);
  }

  @Get('history')
  async getHistory(@Param('botId') botId: string, @Query('guildId') guildId: string) {
    if (!guildId) {
      return { error: 'guildId query parameter is required' };
    }
    return this.musicService.getHistory(guildId);
  }

  // ==================== PLAYLISTS ====================

  @Get('playlists/public')
  async getPublicPlaylists(
    @Param('botId') botId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    if (search) {
      return this.playlistService.searchPublicPlaylists(search, page, limit);
    }
    return this.playlistService.getPublicPlaylists(page, limit);
  }

  @Get('playlists/me')
  async getMyPlaylists(
    @Param('botId') botId: string,
    @Request() req: any,
    @Query('guildId') guildId?: string,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.playlistService.getUserPlaylists(userId, guildId);
  }

  @Post('playlists')
  async createPlaylist(
    @Param('botId') botId: string,
    @Request() req: any,
    @Body() createPlaylistDto: CreatePlaylistDto,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.playlistService.createPlaylist(
      userId,
      createPlaylistDto.name,
      createPlaylistDto.description,
      createPlaylistDto.isPublic,
      createPlaylistDto.guildId,
      createPlaylistDto.configId,
    );
  }

  @Get('playlists/:id')
  async getPlaylist(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.playlistService.getPlaylist(id, userId);
  }

  @Put('playlists/:id')
  async updatePlaylist(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Request() req: any,
    @Body() updatePlaylistDto: UpdatePlaylistDto,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.playlistService.updatePlaylist(id, userId, updatePlaylistDto);
  }

  @Delete('playlists/:id')
  async deletePlaylist(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.playlistService.deletePlaylist(id, userId);
  }

  @Post('playlists/:id/tracks')
  async addPlaylistTrack(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Request() req: any,
    @Body() addTrackDto: AddPlaylistTrackDto,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.playlistService.addTrack(id, userId, addTrackDto);
  }

  @Delete('playlists/:id/tracks/:trackId')
  async removePlaylistTrack(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Param('trackId') trackId: string,
    @Request() req: any,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.playlistService.removeTrack(id, userId, trackId);
  }

  @Post('playlists/:id/reorder')
  async reorderPlaylistTracks(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Request() req: any,
    @Body() reorderDto: ReorderTracksDto,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.playlistService.reorderTracks(id, userId, reorderDto.positions);
  }

  @Post('playlists/import')
  async importPlaylist(
    @Param('botId') botId: string,
    @Request() req: any,
    @Body() importDto: ImportPlaylistDto,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.playlistService.importPlaylist(
      userId,
      importDto.url,
      importDto.name,
      importDto.isPublic,
    );
  }

  @Post('playlists/:id/clone')
  async clonePlaylist(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { name?: string },
  ) {
    const userId = req.user.userId || req.user.id;
    return this.playlistService.clonePlaylist(id, userId, body.name);
  }

  @Get('playlists/:id/stats')
  async getPlaylistStats(
    @Param('botId') botId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.playlistService.getPlaylistStats(id, userId);
  }
}
