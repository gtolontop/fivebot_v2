import { IsInt, Min } from 'class-validator';

export class DepositWithdrawDto {
  @IsInt()
  @Min(1)
  amount: number;
}
