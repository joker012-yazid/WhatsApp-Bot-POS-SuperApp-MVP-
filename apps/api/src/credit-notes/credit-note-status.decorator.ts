import { SetMetadata } from '@nestjs/common';
import type { CreditNoteStatus as CreditNoteStatusType } from '../common/constants/prisma.enums';

export const CREDIT_NOTE_ALLOWED_STATUSES = 'credit_note_allowed_statuses';

export const RequireCreditNoteStatus = (
  ...statuses: CreditNoteStatusType[]
) => SetMetadata(CREDIT_NOTE_ALLOWED_STATUSES, statuses);
