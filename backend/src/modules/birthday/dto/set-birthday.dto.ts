import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetBirthdayDto {
  @ApiProperty({ description: 'User ID whose birthday to set' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Day of birth (1-31)' })
  @IsInt()
  @Min(1)
  @Max(31)
  day: number;

  @ApiProperty({ description: 'Month of birth (1-12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiPropertyOptional({ description: 'Year of birth (optional, for age calculation)' })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  year?: number;
}
