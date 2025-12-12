import { IsNotEmpty, IsBoolean, IsString } from 'class-validator';

export class AddVoteDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsBoolean()
  isUpvote: boolean;
}
