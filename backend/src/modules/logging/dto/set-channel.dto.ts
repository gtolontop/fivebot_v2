import { IsString, IsNotEmpty } from 'class-validator';

export class SetChannelDto {
  @IsString()
  @IsNotEmpty()
  channelId: string;
}
