import { IsInt, Min } from 'class-validator';

export class MoveTrackDto {
  @IsInt()
  @Min(0)
  from: number;

  @IsInt()
  @Min(0)
  to: number;
}
