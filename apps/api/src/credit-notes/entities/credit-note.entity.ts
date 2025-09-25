import type {
  CreditNoteStatus as CreditNoteStatusType,
  InvoiceStatus as InvoiceStatusType
} from '../../common/constants/prisma.enums';

export type CreditNoteItemEntity = {
  id: string;
  invoiceItemId: string | null;
  productId: string | null;
  description: string;
  qty: number;
  unitPrice: number;
  lineDiscount: number;
  lineTotal: number;
  taxCode: string | null;
};

export type CreditNoteInvoiceEntity = {
  id: string;
  invoiceNo: string;
  status: InvoiceStatusType;
  balanceDue: number;
  grandTotal: number;
  paidTotal: number;
  customer?: { id: string; fullName: string; phone: string; email?: string | null } | null;
};

export class CreditNoteEntity {
  id!: string;
  creditNoteNo!: string;
  branchId!: string;
  invoiceId!: string;
  reason!: string;
  itemsTotal!: number;
  discountTotal!: number;
  taxableSubtotal!: number;
  sst!: number;
  grandTotal!: number;
  currency!: string;
  status!: CreditNoteStatusType;
  createdAt!: Date;
  updatedAt!: Date;
  branch?: { id: string; name: string; code: string };
  invoice?: CreditNoteInvoiceEntity;
  items!: CreditNoteItemEntity[];

  constructor(partial: Partial<CreditNoteEntity>) {
    Object.assign(this, partial);
  }
}
