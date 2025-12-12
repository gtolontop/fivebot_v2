import { IsString } from 'class-validator';

export class TransferTicketDto {
  @IsString()
  newStaffId: string;
}
