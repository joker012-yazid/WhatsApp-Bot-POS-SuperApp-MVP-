import { SetMetadata } from '@nestjs/common';
import type { InvoiceStatus as InvoiceStatusType } from '../common/constants/prisma.enums';

export const INVOICE_ALLOWED_STATUSES = 'invoiceAllowedStatuses';

export const RequireInvoiceStatus = (...statuses: InvoiceStatusType[]) =>
  SetMetadata(INVOICE_ALLOWED_STATUSES, statuses);
