import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateSuggestionDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  attachments?: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
