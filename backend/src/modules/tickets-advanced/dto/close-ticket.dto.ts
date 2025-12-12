import { IsString, IsOptional } from 'class-validator';

export class CloseTicketDto {
  @IsString()
  closedBy: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
