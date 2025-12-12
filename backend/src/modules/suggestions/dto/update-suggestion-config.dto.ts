import { IsOptional, IsString, IsBoolean, IsInt, Min } from 'class-validator';

export class UpdateSuggestionConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  // Channels
  @IsOptional()
  @IsString()
  channelId?: string;

  @IsOptional()
  @IsString()
  reviewChannelId?: string;

  @IsOptional()
  @IsString()
  logChannelId?: string;

  // Settings
  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  allowAnonymous?: boolean;

  // Reactions
  @IsOptional()
  @IsString()
  upvoteEmoji?: string;

  @IsOptional()
  @IsString()
  downvoteEmoji?: string;

  // Embed Colors
  @IsOptional()
  @IsString()
  embedColor?: string;

  @IsOptional()
  @IsString()
  pendingColor?: string;

  @IsOptional()
  @IsString()
  approvedColor?: string;

  @IsOptional()
  @IsString()
  deniedColor?: string;

  @IsOptional()
  @IsString()
  implementedColor?: string;

  // Thread Settings
  @IsOptional()
  @IsBoolean()
  createThread?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  threadAutoArchive?: number;

  // Restrictions
  @IsOptional()
  @IsInt()
  @Min(0)
  cooldownMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minAccountAge?: number;

  @IsOptional()
  @IsString()
  requiredRoleId?: string;

  @IsOptional()
  @IsString()
  staffRoleIds?: string;
}
