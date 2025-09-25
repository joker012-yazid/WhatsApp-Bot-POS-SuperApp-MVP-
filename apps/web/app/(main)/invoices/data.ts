export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';
export type PaymentMethod = 'CASH' | 'CARD' | 'EWALLET' | 'BANK';

export type InvoiceLine = {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  discount: number;
  taxCode: string;
  lineTotal: number;
};

export type InvoicePayment = {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  paidAt: string;
};

export type EinvoiceStatus = 'PENDING' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'FAILED';

export type Invoice = {
  id: string;
  invoiceNo: string;
  branch: string;
  customer: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  totals: {
    itemsTotal: number;
    discountTotal: number;
    taxableSubtotal: number;
    sst: number;
    grandTotal: number;
    paidTotal: number;
    balanceDue: number;
  };
  items: InvoiceLine[];
  payments: InvoicePayment[];
  notes?: string;
  posSaleId?: string;
  linkedQuoteId?: string;
  einvoice?: {
    submissionId?: string;
    status: EinvoiceStatus;
    lastError?: string;
    lastPolledAt?: string;
  };
};

export function fallbackInvoices(): Invoice[] {
  return [
    {
      id: 'inv-2001',
      invoiceNo: 'INVBR-HQ-20240505-002',
      branch: 'BR-HQ',
      customer: 'Siti Rahmah',
      status: 'SENT',
      issueDate: '2024-05-05',
      dueDate: '2024-05-20',
      notes: 'Bayaran penuh dalam 15 hari.',
      totals: {
        itemsTotal: 325,
        discountTotal: 10,
        taxableSubtotal: 315,
        sst: 18.9,
        grandTotal: 333.9,
        paidTotal: 0,
        balanceDue: 333.9
      },
      items: [
        {
          id: 'inv-2001-1',
          description: 'Sistem POS Premium',
          qty: 2,
          unitPrice: 120,
          discount: 10,
          taxCode: 'SR',
          lineTotal: 230
        },
        {
          id: 'inv-2001-2',
          description: 'Latihan Kakitangan',
          qty: 1,
          unitPrice: 85,
          discount: 0,
          taxCode: 'SR',
          lineTotal: 85
        }
      ],
      payments: [],
      linkedQuoteId: 'qt-1001',
      einvoice: {
        status: 'PENDING'
      }
    },
    {
      id: 'inv-2002',
      invoiceNo: 'INVBR-HQ-20240504-005',
      branch: 'BR-HQ',
      customer: 'OneStop Retail Sdn Bhd',
      status: 'PARTIALLY_PAID',
      issueDate: '2024-05-04',
      dueDate: '2024-05-25',
      notes: 'Sila lengkapkan baki selewatnya 25 Mei.',
      totals: {
        itemsTotal: 680,
        discountTotal: 40,
        taxableSubtotal: 640,
        sst: 38.4,
        grandTotal: 678.4,
        paidTotal: 300,
        balanceDue: 378.4
      },
      items: [
        {
          id: 'inv-2002-1',
          description: 'Pakej POS Kombo',
          qty: 4,
          unitPrice: 150,
          discount: 40,
          taxCode: 'SR',
          lineTotal: 560
        },
        {
          id: 'inv-2002-2',
          description: 'Sokongan Tapak 1 Tahun',
          qty: 1,
          unitPrice: 120,
          discount: 0,
          taxCode: 'SR',
          lineTotal: 120
        }
      ],
      payments: [
        {
          id: 'pay-501',
          method: 'BANK',
          amount: 300,
          reference: 'FT20240504-8891',
          paidAt: '2024-05-04T15:20:00+08:00'
        }
      ],
      linkedQuoteId: 'qt-1002',
      einvoice: {
        submissionId: 'SUB-7765',
        status: 'SENT',
        lastPolledAt: '2024-05-05T09:00:00+08:00'
      }
    },
    {
      id: 'inv-2003',
      invoiceNo: 'INVBR-JB-20240504-003',
      branch: 'BR-JB',
      customer: 'Ahmad Bistro',
      status: 'PAID',
      issueDate: '2024-05-04',
      dueDate: '2024-05-18',
      totals: {
        itemsTotal: 540,
        discountTotal: 20,
        taxableSubtotal: 520,
        sst: 31.2,
        grandTotal: 551.2,
        paidTotal: 551.2,
        balanceDue: 0
      },
      items: [
        {
          id: 'inv-2003-1',
          description: 'Terminal POS Mudah Alih',
          qty: 3,
          unitPrice: 160,
          discount: 20,
          taxCode: 'SR',
          lineTotal: 460
        },
        {
          id: 'inv-2003-2',
          description: 'Pelesenan Aplikasi POS',
          qty: 1,
          unitPrice: 80,
          discount: 0,
          taxCode: 'SR',
          lineTotal: 80
        }
      ],
      payments: [
        {
          id: 'pay-601',
          method: 'CASH',
          amount: 200,
          paidAt: '2024-05-04T10:00:00+08:00'
        },
        {
          id: 'pay-602',
          method: 'CARD',
          amount: 351.2,
          reference: 'POS-33211',
          paidAt: '2024-05-04T10:05:00+08:00'
        }
      ],
      posSaleId: 'pos-sale-9911',
      linkedQuoteId: 'qt-1003',
      einvoice: {
        submissionId: 'SUB-8899',
        status: 'ACCEPTED',
        lastPolledAt: '2024-05-04T12:00:00+08:00'
      }
    }
  ];
}
