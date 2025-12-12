import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConfigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  xpPerMessage?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  xpPerMessageMin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  xpPerMessageMax?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3600)
  xpCooldown?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10)
  xpMultiplier?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  voiceXpEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  voiceXpPerMinute?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  levelUpEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  levelUpChannelId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  levelUpMessage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  levelUpEmbed?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  levelUpDM?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  defaultCardBg?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  defaultCardColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showRankOnCard?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  roleMultipliers?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  channelMultipliers?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10)
  weekendMultiplier?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  stackMultipliers?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  maxLevel?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  noXpRoles?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  excludedChannels?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  excludedRoles?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  resetOnLeave?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  announceOnlyOnLevelUp?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  keepRolesOnReset?: boolean;
}
