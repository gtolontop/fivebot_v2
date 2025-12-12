import { IsString, IsBoolean, IsOptional, IsArray, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  embedJson?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  aliases?: string[];

  @IsBoolean()
  @IsOptional()
  isGlobal?: boolean;
}

export class UpdateTagDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  embedJson?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  aliases?: string[];

  @IsBoolean()
  @IsOptional()
  isGlobal?: boolean;
}

export class SearchTagDto {
  @IsString()
  @IsNotEmpty()
  query: string;
}
