import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service';
import { QUOTE_ALLOWED_STATUSES } from './quote-status.decorator';
import type { QuoteStatus as QuoteStatusType } from '../common/constants/prisma.enums';

@Injectable()
export class QuoteStatusGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const allowed = this.reflector.getAllAndOverride<QuoteStatusType[] | undefined>(
      QUOTE_ALLOWED_STATUSES,
      [context.getHandler(), context.getClass()]
    );

    if (!allowed || !allowed.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const id = request.params?.id;
    if (!id) {
      throw new BadRequestException('Quote id is required');
    }

    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { items: true, branch: true, customer: true }
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (!allowed.includes(quote.status)) {
      throw new BadRequestException(
        `Quote must be in one of the following statuses: ${allowed.join(', ')}`
      );
    }

    request.quote = quote;
    return true;
  }
}
