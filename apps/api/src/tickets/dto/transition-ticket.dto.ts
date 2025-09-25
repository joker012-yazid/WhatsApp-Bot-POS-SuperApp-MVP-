import { IsEnum } from 'class-validator';
import { TicketStatus } from '../../common/constants/prisma.enums';

export class TransitionTicketDto {
  @IsEnum(TicketStatus)
  status!: TicketStatus;
}
