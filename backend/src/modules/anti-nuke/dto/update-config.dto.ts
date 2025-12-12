import {
  IsBoolean,
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PunishmentType {
  STRIP_ROLES = 'STRIP_ROLES',
  KICK = 'KICK',
  BAN = 'BAN',
  TIMEOUT = 'TIMEOUT',
}

export class UpdateAntiNukeConfigDto {
  @ApiPropertyOptional({
    description: 'Enable or disable anti-nuke protection',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Array of whitelisted user IDs',
    example: ['123456789012345678', '987654321098765432'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  whitelistedUsers?: string[];

  @ApiPropertyOptional({
    description: 'Array of whitelisted role IDs',
    example: ['123456789012345678', '987654321098765432'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  whitelistedRoles?: string[];

  // Channel Protection
  @ApiPropertyOptional({
    description: 'Protect against channel creation',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiChannelCreate?: boolean;

  @ApiPropertyOptional({
    description: 'Protect against channel deletion',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiChannelDelete?: boolean;

  @ApiPropertyOptional({
    description: 'Protect against channel updates',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiChannelUpdate?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum channel actions allowed within time window',
    example: 3,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  channelActionLimit?: number;

  @ApiPropertyOptional({
    description: 'Time window for channel actions (in seconds)',
    example: 10,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  channelTimeWindow?: number;

  // Role Protection
  @ApiPropertyOptional({
    description: 'Protect against role creation',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiRoleCreate?: boolean;

  @ApiPropertyOptional({
    description: 'Protect against role deletion',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiRoleDelete?: boolean;

  @ApiPropertyOptional({
    description: 'Protect against role updates',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiRoleUpdate?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum role actions allowed within time window',
    example: 3,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  roleActionLimit?: number;

  @ApiPropertyOptional({
    description: 'Time window for role actions (in seconds)',
    example: 10,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  roleTimeWindow?: number;

  // Member Protection
  @ApiPropertyOptional({
    description: 'Protect against mass kicking',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiMassKick?: boolean;

  @ApiPropertyOptional({
    description: 'Protect against mass banning',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiMassBan?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum kicks/bans allowed within time window',
    example: 5,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  kickBanLimit?: number;

  @ApiPropertyOptional({
    description: 'Time window for kicks/bans (in seconds)',
    example: 10,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  kickBanTimeWindow?: number;

  // Bot Protection
  @ApiPropertyOptional({
    description: 'Protect against unauthorized bot additions',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiBotAdd?: boolean;

  @ApiPropertyOptional({
    description: 'Array of allowed bot IDs',
    example: ['123456789012345678'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedBots?: string[];

  // Webhook Protection
  @ApiPropertyOptional({
    description: 'Protect against webhook creation',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiWebhookCreate?: boolean;

  @ApiPropertyOptional({
    description: 'Protect against webhook spam',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiWebhookSpam?: boolean;

  // Server Protection
  @ApiPropertyOptional({
    description: 'Protect against server updates',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiServerUpdate?: boolean;

  @ApiPropertyOptional({
    description: 'Protect against @everyone/@here pings',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  antiEveryonePing?: boolean;

  // Punishment
  @ApiPropertyOptional({
    description: 'Punishment type for violators',
    example: 'STRIP_ROLES',
    enum: PunishmentType,
  })
  @IsEnum(PunishmentType)
  @IsOptional()
  punishment?: PunishmentType;

  @ApiPropertyOptional({
    description: 'Channel ID for logging anti-nuke actions',
    example: '123456789012345678',
  })
  @IsString()
  @IsOptional()
  logChannelId?: string;
}
