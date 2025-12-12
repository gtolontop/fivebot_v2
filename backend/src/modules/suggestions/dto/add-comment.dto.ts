import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class AddCommentDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  isStaff?: boolean;
}
