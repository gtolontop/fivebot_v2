import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreatePlaylistDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  guildId?: string;

  @IsOptional()
  @IsString()
  configId?: string;
}
