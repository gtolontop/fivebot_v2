import {
  IsBoolean,
  IsInt,
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
  @IsString()
  hubChannelId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  defaultName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  userLimit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxChannelsPerUser?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxChannelsTotal?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  deleteWhenEmpty?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3600)
  deleteAfterSeconds?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(8000)
  @Max(384000)
  defaultBitrate?: number;
}
