import type {
  InvoiceStatus as InvoiceStatusType,
  PaymentMethod as PaymentMethodType
} from '../../common/constants/prisma.enums';

export type InvoiceItemEntity = {
  id: string;
  productId: string | null;
  description: string;
  qty: number;
  unitPrice: number;
  lineDiscount: number;
  lineTotal: number;
  taxCode: string | null;
};

export type InvoicePaymentEntity = {
  id: string;
  method: PaymentMethodType;
  amount: number;
  reference: string | null;
  paidAt: Date;
};

export class InvoiceEntity {
  id!: string;
  invoiceNo!: string;
  branchId!: string;
  customerId?: string | null;
  quoteId?: string | null;
  issueDate!: Date;
  dueDate?: Date | null;
  itemsTotal!: number;
  discountTotal!: number;
  taxableSubtotal!: number;
  sst!: number;
  grandTotal!: number;
  paidTotal!: number;
  balanceDue!: number;
  currency!: string;
  status!: InvoiceStatusType;
  posSaleId?: string | null;
  notes?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  branch?: { id: string; name: string; code: string };
  customer?: { id: string; fullName: string; phone: string; email?: string | null } | null;
  quote?: { id: string; quoteNo: string } | null;
  items!: InvoiceItemEntity[];
  payments!: InvoicePaymentEntity[];

  constructor(partial: Partial<InvoiceEntity>) {
    Object.assign(this, partial);
  }
}
