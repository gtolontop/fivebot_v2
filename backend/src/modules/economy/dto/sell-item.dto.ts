import { IsInt, Min } from 'class-validator';

export class SellItemDto {
  @IsInt()
  @Min(1)
  quantity: number = 1;
}
