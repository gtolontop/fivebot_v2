import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateTicketDto {
  @IsString()
  guildId: string;

  @IsString()
  userId: string;

  @IsString()
  categoryId: string;

  @IsString()
  topic: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  type?: string;
}
