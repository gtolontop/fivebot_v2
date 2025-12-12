import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';

export class ImportPlaylistDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
