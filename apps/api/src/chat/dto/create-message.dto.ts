import { IsEnum, IsNotEmpty, IsObject, IsString } from 'class-validator';
import { WaMessageDirection } from '../../common/constants/prisma.enums';

export class CreateMessageDto {
  @IsString()
  sessionId!: string;

  @IsEnum(WaMessageDirection)
  direction!: WaMessageDirection;

  @IsObject()
  @IsNotEmpty()
  payload!: Record<string, unknown>;
}
