import type { QuoteStatus as QuoteStatusType } from '../../common/constants/prisma.enums';

export type QuoteItemEntity = {
  id: string;
  productId: string | null;
  description: string;
  qty: number;
  unitPrice: number;
  lineDiscount: number;
  lineTotal: number;
  taxCode: string | null;
};

export class QuoteEntity {
  id!: string;
  quoteNo!: string;
  branchId!: string;
  customerId?: string | null;
  itemsTotal!: number;
  discountTotal!: number;
  taxableSubtotal!: number;
  sst!: number;
  grandTotal!: number;
  currency!: string;
  status!: QuoteStatusType;
  validUntil?: Date | null;
  notes?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  branch?: { id: string; name: string; code: string };
  customer?: { id: string; fullName: string; phone: string; email?: string | null } | null;
  items!: QuoteItemEntity[];

  constructor(partial: Partial<QuoteEntity>) {
    Object.assign(this, partial);
  }
}
