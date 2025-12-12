import { IsInt, Min } from 'class-validator';

export class SeekDto {
  @IsInt()
  @Min(0)
  position: number;
}
