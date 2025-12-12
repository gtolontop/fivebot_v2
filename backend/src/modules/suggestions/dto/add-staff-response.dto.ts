import { IsNotEmpty, IsString } from 'class-validator';

export class AddStaffResponseDto {
  @IsNotEmpty()
  @IsString()
  response: string;

  @IsNotEmpty()
  @IsString()
  staffId: string;
}
