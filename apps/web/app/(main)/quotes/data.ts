export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';

export type QuoteLine = {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  discount: number;
  taxCode: string;
  lineTotal: number;
};

export type Quote = {
  id: string;
  quoteNo: string;
  branch: string;
  customer: string;
  status: QuoteStatus;
  validUntil: string;
  notes?: string;
  totals: {
    itemsTotal: number;
    discountTotal: number;
    taxableSubtotal: number;
    sst: number;
    grandTotal: number;
  };
  items: QuoteLine[];
  history: Array<{ at: string; message: string }>;
  linkedInvoiceId?: string;
};

export function fallbackQuotes(): Quote[] {
  return [
    {
      id: 'qt-1001',
      quoteNo: 'QBR-HQ-20240501-001',
      branch: 'BR-HQ',
      customer: 'Siti Rahmah',
      status: 'DRAFT',
      validUntil: '2024-05-15',
      notes: 'Termasuk pemasangan asas dalam 14 hari bekerja.',
      totals: {
        itemsTotal: 325,
        discountTotal: 10,
        taxableSubtotal: 315,
        sst: 18.9,
        grandTotal: 333.9
      },
      items: [
        {
          id: 'qt-1001-1',
          description: 'Sistem POS Premium',
          qty: 2,
          unitPrice: 120,
          discount: 10,
          taxCode: 'SR',
          lineTotal: 230
        },
        {
          id: 'qt-1001-2',
          description: 'Latihan Kakitangan',
          qty: 1,
          unitPrice: 85,
          discount: 0,
          taxCode: 'SR',
          lineTotal: 85
        }
      ],
      history: [
        { at: '2024-05-01T08:45:00+08:00', message: 'Sebutharga dicipta oleh Amir.' }
      ]
    },
    {
      id: 'qt-1002',
      quoteNo: 'QBR-HQ-20240502-004',
      branch: 'BR-HQ',
      customer: 'OneStop Retail Sdn Bhd',
      status: 'SENT',
      validUntil: '2024-05-20',
      notes: 'Harga promosi sah sehingga tarikh tamat tempoh.',
      totals: {
        itemsTotal: 680,
        discountTotal: 40,
        taxableSubtotal: 640,
        sst: 38.4,
        grandTotal: 678.4
      },
      items: [
        {
          id: 'qt-1002-1',
          description: 'Pakej POS Kombo',
          qty: 4,
          unitPrice: 150,
          discount: 40,
          taxCode: 'SR',
          lineTotal: 560
        },
        {
          id: 'qt-1002-2',
          description: 'Sokongan Tapak 1 Tahun',
          qty: 1,
          unitPrice: 120,
          discount: 0,
          taxCode: 'SR',
          lineTotal: 120
        }
      ],
      history: [
        { at: '2024-05-02T09:15:00+08:00', message: 'Sebutharga dicipta oleh Hani.' },
        { at: '2024-05-02T10:05:00+08:00', message: 'Sebutharga dihantar ke emel pelanggan.' }
      ]
    },
    {
      id: 'qt-1003',
      quoteNo: 'QBR-JB-20240503-003',
      branch: 'BR-JB',
      customer: 'Ahmad Bistro',
      status: 'ACCEPTED',
      validUntil: '2024-05-18',
      notes: 'Penghantaran perkakasan dalam masa 7 hari selepas deposit.',
      totals: {
        itemsTotal: 540,
        discountTotal: 20,
        taxableSubtotal: 520,
        sst: 31.2,
        grandTotal: 551.2
      },
      items: [
        {
          id: 'qt-1003-1',
          description: 'Terminal POS Mudah Alih',
          qty: 3,
          unitPrice: 160,
          discount: 20,
          taxCode: 'SR',
          lineTotal: 460
        },
        {
          id: 'qt-1003-2',
          description: 'Pelesenan Aplikasi POS',
          qty: 1,
          unitPrice: 80,
          discount: 0,
          taxCode: 'SR',
          lineTotal: 80
        }
      ],
      history: [
        { at: '2024-05-03T11:00:00+08:00', message: 'Sebutharga dicipta oleh Sara.' },
        { at: '2024-05-03T11:30:00+08:00', message: 'Sebutharga dihantar ke WhatsApp pelanggan.' },
        { at: '2024-05-04T09:20:00+08:00', message: 'Pelanggan menerima sebutharga.' }
      ],
      linkedInvoiceId: 'inv-2003'
    }
  ];
}
