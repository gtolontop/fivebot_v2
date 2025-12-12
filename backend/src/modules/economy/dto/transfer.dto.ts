import { IsInt, Min, IsString, IsOptional } from 'class-validator';

export class TransferDto {
  @IsString()
  toUserId: string;

  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}
