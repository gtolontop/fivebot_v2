import { IsString, IsEnum, IsBoolean, IsOptional, IsArray, MaxLength, IsInt, Min } from 'class-validator';
import { TriggerTypeEnum, ResponseTypeEnum, CommandActionDto } from './create-command.dto';

export class UpdateCommandDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  trigger?: string;

  @IsEnum(TriggerTypeEnum)
  @IsOptional()
  triggerType?: TriggerTypeEnum;

  @IsBoolean()
  @IsOptional()
  caseSensitive?: boolean;

  @IsEnum(ResponseTypeEnum)
  @IsOptional()
  responseType?: ResponseTypeEnum;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  responses?: string[];

  @IsArray()
  @IsOptional()
  actions?: CommandActionDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedRoles?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedChannels?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  blockedRoles?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  blockedChannels?: string[];

  @IsBoolean()
  @IsOptional()
  nsfw?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  userCooldown?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  guildCooldown?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
