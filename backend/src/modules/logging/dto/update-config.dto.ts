import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateLoggingConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  // Default Channel
  @IsOptional()
  @IsString()
  defaultChannelId?: string;

  // Message Events
  @IsOptional()
  @IsString()
  messageDeleteChannelId?: string;

  @IsOptional()
  @IsString()
  messageEditChannelId?: string;

  @IsOptional()
  @IsString()
  messageBulkDeleteChannelId?: string;

  // Member Events
  @IsOptional()
  @IsString()
  memberJoinChannelId?: string;

  @IsOptional()
  @IsString()
  memberLeaveChannelId?: string;

  @IsOptional()
  @IsString()
  memberUpdateChannelId?: string;

  @IsOptional()
  @IsString()
  memberBanChannelId?: string;

  // Channel Events
  @IsOptional()
  @IsString()
  channelCreateChannelId?: string;

  @IsOptional()
  @IsString()
  channelDeleteChannelId?: string;

  @IsOptional()
  @IsString()
  channelUpdateChannelId?: string;

  // Role Events
  @IsOptional()
  @IsString()
  roleCreateChannelId?: string;

  @IsOptional()
  @IsString()
  roleDeleteChannelId?: string;

  @IsOptional()
  @IsString()
  roleUpdateChannelId?: string;

  // Voice Events
  @IsOptional()
  @IsString()
  voiceJoinChannelId?: string;

  @IsOptional()
  @IsString()
  voiceLeaveChannelId?: string;

  @IsOptional()
  @IsString()
  voiceMoveChannelId?: string;

  // Invite Events
  @IsOptional()
  @IsString()
  inviteCreateChannelId?: string;

  @IsOptional()
  @IsString()
  inviteDeleteChannelId?: string;

  // Emoji Events
  @IsOptional()
  @IsString()
  emojiCreateChannelId?: string;

  @IsOptional()
  @IsString()
  emojiDeleteChannelId?: string;

  // Settings
  @IsOptional()
  @IsBoolean()
  logBotActions?: boolean;

  @IsOptional()
  @IsBoolean()
  includeAuditLog?: boolean;
}
