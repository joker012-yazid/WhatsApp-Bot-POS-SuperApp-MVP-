export type CreditNoteStatus = 'ISSUED' | 'VOID';

export type CreditNoteLine = {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  discount: number;
  taxCode: string;
  lineTotal: number;
};

export type CreditNote = {
  id: string;
  creditNoteNo: string;
  branch: string;
  invoiceNo: string;
  customer: string;
  status: CreditNoteStatus;
  reason: string;
  issuedAt: string;
  totals: {
    itemsTotal: number;
    discountTotal: number;
    taxableSubtotal: number;
    sst: number;
    grandTotal: number;
  };
  items: CreditNoteLine[];
  linkedInvoiceId: string;
};

export function fallbackCreditNotes(): CreditNote[] {
  return [
    {
      id: 'cn-3001',
      creditNoteNo: 'CNBR-HQ-20240506-001',
      branch: 'BR-HQ',
      invoiceNo: 'INVBR-HQ-20240504-005',
      customer: 'OneStop Retail Sdn Bhd',
      status: 'ISSUED',
      reason: 'Pemulangan terminal rosak.',
      issuedAt: '2024-05-06T11:15:00+08:00',
      totals: {
        itemsTotal: 280,
        discountTotal: 0,
        taxableSubtotal: 280,
        sst: 16.8,
        grandTotal: 296.8
      },
      items: [
        {
          id: 'cn-3001-1',
          description: 'Terminal POS Kombo (pulangan)',
          qty: 1,
          unitPrice: 280,
          discount: 0,
          taxCode: 'SR',
          lineTotal: 280
        }
      ],
      linkedInvoiceId: 'inv-2002'
    },
    {
      id: 'cn-3002',
      creditNoteNo: 'CNBR-JB-20240507-002',
      branch: 'BR-JB',
      invoiceNo: 'INVBR-JB-20240504-003',
      customer: 'Ahmad Bistro',
      status: 'VOID',
      reason: 'Dibatalkan selepas invois diganti.',
      issuedAt: '2024-05-07T09:40:00+08:00',
      totals: {
        itemsTotal: 120,
        discountTotal: 0,
        taxableSubtotal: 120,
        sst: 7.2,
        grandTotal: 127.2
      },
      items: [
        {
          id: 'cn-3002-1',
          description: 'Perisian POS (diskaun tambahan)',
          qty: 1,
          unitPrice: 120,
          discount: 0,
          taxCode: 'SR',
          lineTotal: 120
        }
      ],
      linkedInvoiceId: 'inv-2003'
    }
  ];
}
