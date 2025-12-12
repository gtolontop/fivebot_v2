import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class AddTrackDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsInt()
  @Min(1)
  duration: number;

  @IsString()
  source: string; // youtube, spotify, soundcloud

  @IsString()
  requestedBy: string;
}
