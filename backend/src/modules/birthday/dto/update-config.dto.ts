import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateConfigDto {
  @ApiPropertyOptional({ description: 'Whether birthday announcements are enabled' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Channel ID for birthday announcements' })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiPropertyOptional({ description: 'Role ID to assign on birthdays' })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({ description: 'Hours until birthday role is removed', default: 24 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168) // Max 1 week
  removeRoleAfterHours?: number;

  @ApiPropertyOptional({ description: 'Birthday announcement message (supports placeholders: {user}, {age})' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Birthday announcement embed JSON' })
  @IsOptional()
  @IsString()
  embedJson?: string;

  @ApiPropertyOptional({ description: 'Time to announce birthdays (HH:MM format)', default: '00:00' })
  @IsOptional()
  @IsString()
  announceTime?: string;

  @ApiPropertyOptional({ description: 'Timezone for birthday announcements', default: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Whether to show age in announcements' })
  @IsOptional()
  @IsBoolean()
  showAge?: boolean;

  @ApiPropertyOptional({ description: 'Whether users can set their own birthdays' })
  @IsOptional()
  @IsBoolean()
  allowUserSet?: boolean;
}
