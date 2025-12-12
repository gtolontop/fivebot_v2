import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RerollGiveawayDto {
  @ApiProperty({ description: 'Number of new winners to pick', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  winnersCount?: number;
}
