import {
  IsString,
  IsArray,
  IsBoolean,
  IsOptional,
  IsInt,
  IsNotEmpty,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePollDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  channelId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  options: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(604800)
  duration?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowMultipleVotes?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showResultsLive?: boolean;
}
