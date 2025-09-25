import { EinvoiceProvider, EinvoiceSubmissionStatus } from '@prisma/client';
import { MockMyInvoisProvider } from './providers/mock-my-invois.provider';

export interface EinvoiceParty {
  name: string;
  taxId?: string | null;
  registrationNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
}

export interface EinvoiceItemPayload {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxCode?: string | null;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface EinvoicePaymentPayload {
  method: string;
  amount: number;
  paidAt: string;
  reference?: string | null;
}

export interface EinvoicePayload {
  supplier: EinvoiceParty;
  buyer?: EinvoiceParty | null;
  invoice: {
    id: string;
    invoiceNo: string;
    branchCode: string;
    currency: string;
    issueDate: string;
    dueDate?: string | null;
    itemsTotal: number;
    discountTotal: number;
    taxableSubtotal: number;
    taxAmount: number;
    grandTotal: number;
  };
  items: EinvoiceItemPayload[];
  payments: EinvoicePaymentPayload[];
  summary: {
    taxableAmount: number;
    taxAmount: number;
    total: number;
  };
}

export interface EinvoiceSubmitResult {
  submissionId: string;
  status: EinvoiceSubmissionStatus;
  raw: Record<string, unknown>;
  message?: string;
}

export interface EinvoiceStatusResult {
  status: EinvoiceSubmissionStatus;
  raw: Record<string, unknown>;
  message?: string;
}

export interface EinvoiceProviderAdapter {
  submit(payload: EinvoicePayload): Promise<EinvoiceSubmitResult>;
  status(submissionId: string): Promise<EinvoiceStatusResult>;
}

export interface EinvoiceProviderOptions {
  endpoint?: string;
  apiKey?: string;
  environment?: string;
}

export function createEinvoiceProvider(
  provider: EinvoiceProvider,
  options: EinvoiceProviderOptions = {}
): EinvoiceProviderAdapter {
  switch (provider) {
    case EinvoiceProvider.MOCK:
      return new MockMyInvoisProvider(options);
    case EinvoiceProvider.MYINVOIS:
    case EinvoiceProvider.PEPPOL:
    default:
      return new MockMyInvoisProvider(options);
  }
}
