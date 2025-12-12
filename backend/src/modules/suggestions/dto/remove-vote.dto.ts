import { IsNotEmpty, IsString } from 'class-validator';

export class RemoveVoteDto {
  @IsNotEmpty()
  @IsString()
  userId: string;
}
