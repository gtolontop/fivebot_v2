import { IsString, IsEnum, IsBoolean, IsOptional, IsArray, IsNotEmpty, MaxLength } from 'class-validator';
import { TriggerType } from '@prisma/client';

export class CreateAutoResponderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  trigger: string;

  @IsEnum(TriggerType)
  @IsOptional()
  triggerType?: TriggerType;

  @IsBoolean()
  @IsOptional()
  caseSensitive?: boolean;

  @IsString()
  @IsOptional()
  response?: string;

  @IsString()
  @IsOptional()
  embedJson?: string;

  @IsString()
  @IsOptional()
  reactionEmojis?: string;

  @IsBoolean()
  @IsOptional()
  deleteOriginal?: boolean;

  @IsBoolean()
  @IsOptional()
  replyToMessage?: boolean;

  @IsBoolean()
  @IsOptional()
  dmResponse?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedChannels?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ignoredChannels?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedRoles?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ignoredRoles?: string[];
}

export class UpdateAutoResponderDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  trigger?: string;

  @IsEnum(TriggerType)
  @IsOptional()
  triggerType?: TriggerType;

  @IsBoolean()
  @IsOptional()
  caseSensitive?: boolean;

  @IsString()
  @IsOptional()
  response?: string;

  @IsString()
  @IsOptional()
  embedJson?: string;

  @IsString()
  @IsOptional()
  reactionEmojis?: string;

  @IsBoolean()
  @IsOptional()
  deleteOriginal?: boolean;

  @IsBoolean()
  @IsOptional()
  replyToMessage?: boolean;

  @IsBoolean()
  @IsOptional()
  dmResponse?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedChannels?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ignoredChannels?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedRoles?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ignoredRoles?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ToggleAutoResponderDto {
  @IsBoolean()
  isActive: boolean;
}
