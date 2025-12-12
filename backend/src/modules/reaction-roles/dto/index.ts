import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum } from 'class-validator';

export class UpdateConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  maxRolesPerMessage?: number;

  @IsOptional()
  @IsNumber()
  maxPanels?: number;
}

export class CreateReactionRolePanelDto {
  @IsString()
  name: string;

  @IsString()
  messageId: string;

  @IsString()
  channelId: string;

  @IsOptional()
  @IsString()
  panelType?: 'REACTION' | 'BUTTON' | 'DROPDOWN';

  @IsOptional()
  @IsNumber()
  maxRoles?: number;

  @IsOptional()
  @IsString()
  requireRole?: string;

  @IsOptional()
  @IsArray()
  blacklistRoles?: string[];

  @IsOptional()
  @IsString()
  embedTitle?: string;

  @IsOptional()
  @IsString()
  embedDescription?: string;

  @IsOptional()
  @IsString()
  embedColor?: string;

  @IsOptional()
  @IsString()
  embedThumbnail?: string;

  @IsOptional()
  @IsString()
  embedImage?: string;

  @IsOptional()
  @IsString()
  embedFooter?: string;
}

export class UpdateReactionRolePanelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  panelType?: 'REACTION' | 'BUTTON' | 'DROPDOWN';

  @IsOptional()
  @IsNumber()
  maxRoles?: number;

  @IsOptional()
  @IsString()
  requireRole?: string;

  @IsOptional()
  @IsArray()
  blacklistRoles?: string[];

  @IsOptional()
  @IsString()
  embedTitle?: string;

  @IsOptional()
  @IsString()
  embedDescription?: string;

  @IsOptional()
  @IsString()
  embedColor?: string;

  @IsOptional()
  @IsString()
  embedThumbnail?: string;

  @IsOptional()
  @IsString()
  embedImage?: string;

  @IsOptional()
  @IsString()
  embedFooter?: string;
}

export class AddReactionRoleDto {
  @IsString()
  roleId: string;

  @IsString()
  emoji: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  style?: 'PRIMARY' | 'SECONDARY' | 'SUCCESS' | 'DANGER';
}
