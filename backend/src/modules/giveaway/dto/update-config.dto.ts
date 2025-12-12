import { IsBoolean, IsInt, IsOptional, IsString, IsArray, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConfigDto {
  @ApiProperty({ description: 'Enable or disable giveaways', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: 'Manager role IDs (comma-separated)', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  managerRoleIds?: string[];

  @ApiProperty({ description: 'Default duration in seconds', required: false })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(2592000) // 30 days max
  defaultDuration?: number;

  @ApiProperty({ description: 'Default number of winners', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  defaultWinners?: number;

  @ApiProperty({ description: 'Default emoji', required: false })
  @IsOptional()
  @IsString()
  defaultEmoji?: string;

  @ApiProperty({ description: 'Embed color (hex)', required: false })
  @IsOptional()
  @IsString()
  embedColor?: string;

  @ApiProperty({ description: 'DM winners when they win', required: false })
  @IsOptional()
  @IsBoolean()
  dmWinners?: boolean;

  @ApiProperty({ description: 'DM host when giveaway ends', required: false })
  @IsOptional()
  @IsBoolean()
  dmHost?: boolean;

  @ApiProperty({ description: 'Maximum number of winners allowed', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxWinners?: number;

  @ApiProperty({ description: 'Maximum duration allowed in seconds', required: false })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(2592000) // 30 days max
  maxDuration?: number;
}
