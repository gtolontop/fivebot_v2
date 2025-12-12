import { IsString, IsEnum, IsBoolean, IsOptional, IsArray, IsNotEmpty, MaxLength, IsInt, Min, IsObject } from 'class-validator';

export enum TriggerTypeEnum {
  COMMAND = 'COMMAND',
  STARTSWITH = 'STARTSWITH',
  CONTAINS = 'CONTAINS',
  REGEX = 'REGEX',
}

export enum ResponseTypeEnum {
  TEXT = 'TEXT',
  EMBED = 'EMBED',
  RANDOM = 'RANDOM',
  SEQUENCE = 'SEQUENCE',
}

export enum ActionTypeEnum {
  ADD_ROLE = 'ADD_ROLE',
  REMOVE_ROLE = 'REMOVE_ROLE',
  SEND_DM = 'SEND_DM',
  REACT = 'REACT',
  DELETE_TRIGGER = 'DELETE_TRIGGER',
}

export class CommandActionDto {
  @IsEnum(ActionTypeEnum)
  type: ActionTypeEnum;

  @IsOptional()
  data?: any;
}

export class CreateCommandDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  trigger: string;

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
  @IsNotEmpty()
  responses: string[];

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
