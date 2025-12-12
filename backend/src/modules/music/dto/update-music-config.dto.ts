import { IsOptional, IsBoolean, IsInt, IsString, Min, Max } from 'class-validator';

export class UpdateMusicConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  // DJ Settings
  @IsOptional()
  @IsString()
  djRoleId?: string;

  @IsOptional()
  @IsBoolean()
  djOnlyMode?: boolean;

  // Playback Settings
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  defaultVolume?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  maxVolume?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxQueueSize?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxSongDuration?: number;

  // Channel Settings
  @IsOptional()
  @IsString()
  textChannelId?: string;

  @IsOptional()
  @IsString()
  voiceChannelId?: string;

  // Auto Settings
  @IsOptional()
  @IsBoolean()
  autoPlay?: boolean;

  @IsOptional()
  @IsBoolean()
  autoLeave?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  autoLeaveDelay?: number;

  @IsOptional()
  @IsBoolean()
  announceNowPlaying?: boolean;

  @IsOptional()
  @IsBoolean()
  deleteNowPlaying?: boolean;

  // Restrictions
  @IsOptional()
  @IsString()
  allowedChannelIds?: string;

  @IsOptional()
  @IsString()
  blockedUsers?: string;

  // 24/7 Mode
  @IsOptional()
  @IsBoolean()
  twentyFourSevenEnabled?: boolean;

  @IsOptional()
  @IsString()
  twentyFourSevenChannel?: string;

  // Effects
  @IsOptional()
  @IsString()
  defaultEqualizer?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  bassBoost?: number;
}
