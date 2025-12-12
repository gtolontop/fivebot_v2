import { IsEnum } from 'class-validator';

export enum LoopMode {
  OFF = 'off',
  TRACK = 'track',
  QUEUE = 'queue',
}

export class SetLoopDto {
  @IsEnum(LoopMode)
  mode: LoopMode;
}
