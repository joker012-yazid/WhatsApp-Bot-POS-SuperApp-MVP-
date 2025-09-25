import { IsNotEmpty, IsObject } from 'class-validator';

export class SendMessageDto {
  @IsObject()
  @IsNotEmpty()
  payload!: Record<string, unknown>;
}
