import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateTicketPanelDto {
  @IsString()
  guildId: string;

  @IsString()
  botId: string;

  @IsString()
  channelId: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class UpdateTicketPanelDto {
  @IsOptional()
  @IsString()
  channelId?: string;

  @IsOptional()
  @IsString()
  messageId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
