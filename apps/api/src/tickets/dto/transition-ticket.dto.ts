import { IsEnum } from 'class-validator';
import { TicketStatus } from '@prisma/client';

export class TransitionTicketDto {
  @IsEnum(TicketStatus)
  status!: TicketStatus;
}
