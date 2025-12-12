import { IsBoolean, IsOptional, IsNumber, Min, IsString, MaxLength, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateConfigDto {
  @ApiPropertyOptional({
    description: 'Enable/disable moderation module',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  // Auto-Moderation
  @ApiPropertyOptional({
    description: 'Enable/disable auto-moderation',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  autoModEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable anti-spam',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiSpamEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Number of messages before spam is detected',
    example: 5,
    minimum: 2,
  })
  @IsNumber()
  @IsOptional()
  @Min(2)
  antiSpamThreshold?: number;

  @ApiPropertyOptional({
    description: 'Time interval in milliseconds for spam detection',
    example: 5000,
    minimum: 1000,
  })
  @IsNumber()
  @IsOptional()
  @Min(1000)
  antiSpamInterval?: number;

  @ApiPropertyOptional({
    description: 'Enable/disable anti-raid protection',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiRaidEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Number of joins before raid is detected',
    example: 10,
    minimum: 3,
  })
  @IsNumber()
  @IsOptional()
  @Min(3)
  antiRaidThreshold?: number;

  @ApiPropertyOptional({
    description: 'Time interval in milliseconds for raid detection',
    example: 10000,
    minimum: 1000,
  })
  @IsNumber()
  @IsOptional()
  @Min(1000)
  antiRaidInterval?: number;

  @ApiPropertyOptional({
    description: 'Enable/disable link filtering',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiLinkEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'List of allowed domains (comma-separated)',
    example: 'youtube.com,discord.com',
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  allowedDomains?: string;

  @ApiPropertyOptional({
    description: 'Enable/disable invite link filtering',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiInviteEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable mass mention detection',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiMassmentionEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Number of mentions to trigger mass mention detection',
    example: 5,
    minimum: 2,
  })
  @IsNumber()
  @IsOptional()
  @Min(2)
  massMentionThreshold?: number;

  @ApiPropertyOptional({
    description: 'Enable/disable caps lock detection',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiCapsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Percentage of caps to trigger detection',
    example: 70,
    minimum: 10,
  })
  @IsNumber()
  @IsOptional()
  @Min(10)
  capsThreshold?: number;

  @ApiPropertyOptional({
    description: 'Enable/disable word filter',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  wordFilterEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Comma-separated list of filtered words',
    example: 'badword1,badword2',
  })
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  filteredWords?: string;

  @ApiPropertyOptional({
    description: 'Regex pattern for advanced filtering',
    example: '\\b(spam|scam)\\b',
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  filteredRegex?: string;

  // Punishment Escalation
  @ApiPropertyOptional({
    description: 'JSON string of warn thresholds and actions',
    example: '{"3":"mute","5":"kick","7":"ban"}',
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  warnThresholds?: string;

  @ApiPropertyOptional({
    description: 'Number of warnings before auto-mute',
    example: 3,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  autoMuteOnWarns?: number;

  @ApiPropertyOptional({
    description: 'Number of warnings before auto-kick',
    example: 5,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  autoKickOnWarns?: number;

  @ApiPropertyOptional({
    description: 'Number of warnings before auto-ban',
    example: 7,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  autoBanOnWarns?: number;

  // Moderation Log Settings
  @ApiPropertyOptional({
    description: 'Channel ID for moderation logs',
    example: '123456789012345678',
  })
  @IsString()
  @IsOptional()
  modLogChannel?: string;

  @ApiPropertyOptional({
    description: 'Channel ID for public moderation logs',
    example: '987654321098765432',
  })
  @IsString()
  @IsOptional()
  publicLogChannel?: string;

  @ApiPropertyOptional({
    description: 'Role IDs that are immune to auto-moderation',
    example: ['111111111111111111', '222222222222222222'],
  })
  @IsArray()
  @IsOptional()
  immuneRoles?: string[];

  @ApiPropertyOptional({
    description: 'Channel IDs that are exempt from auto-moderation',
    example: ['333333333333333333', '444444444444444444'],
  })
  @IsArray()
  @IsOptional()
  exemptChannels?: string[];
}
