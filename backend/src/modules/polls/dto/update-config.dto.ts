import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePollConfigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(604800) // 7 days max
  defaultDuration?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(20)
  maxOptions?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowMultipleVotes?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showVotersList?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  createRoleIds?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxActivePollsPerUser?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  embedColor?: string;
}
