import { IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { SuggestionStatus } from '@prisma/client';

export class UpdateSuggestionStatusDto {
  @IsNotEmpty()
  @IsEnum(SuggestionStatus)
  status: SuggestionStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  staffId?: string;
}
