import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service';
import { CREDIT_NOTE_ALLOWED_STATUSES } from './credit-note-status.decorator';
import type { CreditNoteStatus as CreditNoteStatusType } from '../common/constants/prisma.enums';

const creditNoteInclude = {
  items: true,
  branch: true,
  invoice: {
    include: {
      customer: true
    }
  }
};

@Injectable()
export class CreditNoteStatusGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const allowed = this.reflector.getAllAndOverride<CreditNoteStatusType[] | undefined>(
      CREDIT_NOTE_ALLOWED_STATUSES,
      [context.getHandler(), context.getClass()]
    );

    if (!allowed || !allowed.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const id = request.params?.id;
    if (!id) {
      throw new BadRequestException('Credit note id is required');
    }

    const creditNote = await this.prisma.creditNote.findUnique({
      where: { id },
      include: creditNoteInclude
    });

    if (!creditNote) {
      throw new NotFoundException('Credit note not found');
    }

    if (!allowed.includes(creditNote.status)) {
      throw new BadRequestException(
        `Credit note must be in one of the following statuses: ${allowed.join(', ')}`
      );
    }

    request.creditNote = creditNote;
    return true;
  }
}
