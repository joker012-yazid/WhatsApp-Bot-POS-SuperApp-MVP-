import { SetMetadata } from '@nestjs/common';
import type { QuoteStatus as QuoteStatusType } from '../common/constants/prisma.enums';

export const QUOTE_ALLOWED_STATUSES = 'quoteAllowedStatuses';

export const RequireQuoteStatus = (...statuses: QuoteStatusType[]) =>
  SetMetadata(QUOTE_ALLOWED_STATUSES, statuses);
