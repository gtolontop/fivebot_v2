import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAutoResponderConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  ignoreBots?: boolean;

  @IsOptional()
  @IsBoolean()
  ignoreAdmins?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  cooldownSeconds?: number;
}
