import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class TrackPosition {
  @IsString()
  trackId: string;

  @IsInt()
  @Min(0)
  position: number;
}

export class ReorderTracksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrackPosition)
  positions: TrackPosition[];
}
