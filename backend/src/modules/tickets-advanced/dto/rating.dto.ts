import { IsInt, Min, Max, IsOptional, IsString } from 'class-validator';

export class RatingDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}
