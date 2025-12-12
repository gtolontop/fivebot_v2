import { IsString, IsInt, IsOptional, IsDateString, IsArray, Min, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGiveawayDto {
  @ApiProperty({ description: 'Guild ID where the giveaway will take place' })
  @IsString()
  @IsNotEmpty()
  guildId: string;

  @ApiProperty({ description: 'Channel ID where the giveaway will be posted' })
  @IsString()
  @IsNotEmpty()
  channelId: string;

  @ApiProperty({ description: 'Host user ID' })
  @IsString()
  @IsNotEmpty()
  hostId: string;

  @ApiProperty({ description: 'Prize description' })
  @IsString()
  @IsNotEmpty()
  prize: string;

  @ApiProperty({ description: 'Detailed description of the giveaway', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Number of winners', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  winnersCount?: number;

  @ApiProperty({ description: 'Emoji for the giveaway', default: '🎉' })
  @IsOptional()
  @IsString()
  emoji?: string;

  @ApiProperty({ description: 'Thumbnail URL', required: false })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiProperty({ description: 'Required role IDs (comma-separated)', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredRoleIds?: string[];

  @ApiProperty({ description: 'Required level', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  requiredLevel?: number;

  @ApiProperty({ description: 'Required message count', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  requiredMessages?: number;

  @ApiProperty({ description: 'Blacklisted role IDs (comma-separated)', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blacklistedRoleIds?: string[];

  @ApiProperty({ description: 'Bonus roles with entry multiplier (JSON format: {roleId: entries})', required: false })
  @IsOptional()
  bonusRoles?: Record<string, number>;

  @ApiProperty({ description: 'Start time (ISO 8601)', required: false })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiProperty({ description: 'End time (ISO 8601)' })
  @IsDateString()
  @IsNotEmpty()
  endAt: string;

  @ApiProperty({ description: 'Duration in seconds (alternative to endAt)', required: false })
  @IsOptional()
  @IsInt()
  @Min(60)
  duration?: number;
}
