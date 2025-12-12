import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VoteDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  optionIndex: number;
}
