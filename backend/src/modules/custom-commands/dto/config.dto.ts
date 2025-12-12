import { IsBoolean, IsInt, IsOptional, IsArray, IsString, Min } from 'class-validator';

export class UpdateConfigDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxCommands?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedCreateRoles?: string[];
}
