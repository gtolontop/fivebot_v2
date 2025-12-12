import { IsBoolean, IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateTagConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  prefix?: string;

  @IsOptional()
  @IsBoolean()
  allowUserTags?: boolean;
}
