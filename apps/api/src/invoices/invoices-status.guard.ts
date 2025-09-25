import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service';
import { INVOICE_ALLOWED_STATUSES } from './invoice-status.decorator';
import type { InvoiceStatus as InvoiceStatusType } from '../common/constants/prisma.enums';

const invoiceInclude = {
  items: true,
  payments: true,
  branch: true,
  customer: true,
  quote: true
};

@Injectable()
export class InvoiceStatusGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const allowed = this.reflector.getAllAndOverride<InvoiceStatusType[] | undefined>(
      INVOICE_ALLOWED_STATUSES,
      [context.getHandler(), context.getClass()]
    );

    if (!allowed || !allowed.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const id = request.params?.id;
    if (!id) {
      throw new BadRequestException('Invoice id is required');
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: invoiceInclude
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!allowed.includes(invoice.status)) {
      throw new BadRequestException(
        `Invoice must be in one of the following statuses: ${allowed.join(', ')}`
      );
    }

    request.invoice = invoice;
    return true;
  }
}
