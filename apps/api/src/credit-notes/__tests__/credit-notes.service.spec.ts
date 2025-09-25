jest.mock(
  'pdfkit',
  () => {
    return jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      fontSize: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      end: jest.fn()
    }));
  },
  { virtual: true }
);

import { CreditNoteStatus, InvoiceStatus } from '../../common/constants/prisma.enums';
import { PrismaService } from '../../common/prisma.service';
import { MathService, QuoteTotals } from '../../common/math/math.service';
import { NumberingService } from '../../common/numbering/numbering.service';
import { CreditNotesService } from '../credit-notes.service';

const buildInvoice = (overrides: Partial<any> = {}) => {
  const baseDate = new Date('2024-01-01T00:00:00.000Z');
  return {
    id: 'invoice-1',
    branchId: 'branch-1',
    balanceDue: '106.00',
    grandTotal: '106.00',
    paidTotal: '0.00',
    currency: 'MYR',
    status: InvoiceStatus.SENT,
    branch: { id: 'branch-1', name: 'Main Branch', code: 'BR' },
    customer: {
      id: 'customer-1',
      fullName: 'Jane Doe',
      phone: '01234',
      email: 'jane@example.com'
    },
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        description: 'Consulting',
        qty: '2.00',
        unitPrice: '50.00',
        lineDiscount: '0.00',
        lineTotal: '100.00',
        taxCode: 'SST'
      }
    ],
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides
  };
};

const buildCreditNote = (overrides: Partial<any> = {}) => {
  const baseDate = new Date('2024-01-02T00:00:00.000Z');
  return {
    id: 'credit-1',
    creditNoteNo: 'CNBR-20240101-001',
    branchId: 'branch-1',
    invoiceId: 'invoice-1',
    reason: 'Returned items',
    itemsTotal: '50.00',
    discountTotal: '0.00',
    taxableSubtotal: '50.00',
    sst: '3.00',
    grandTotal: '53.00',
    currency: 'MYR',
    status: CreditNoteStatus.ISSUED,
    createdAt: baseDate,
    updatedAt: baseDate,
    branch: { id: 'branch-1', name: 'Main Branch', code: 'BR' },
    invoice: {
      id: 'invoice-1',
      invoiceNo: 'INVBR-20240101-001',
      status: InvoiceStatus.SENT,
      balanceDue: '53.00',
      grandTotal: '53.00',
      paidTotal: '0.00',
      customer: {
        id: 'customer-1',
        fullName: 'Jane Doe',
        phone: '01234',
        email: 'jane@example.com'
      }
    },
    items: [
      {
        id: 'cn-item-1',
        invoiceItemId: 'item-1',
        productId: 'product-1',
        description: 'Consulting',
        qty: '1.00',
        unitPrice: '50.00',
        lineDiscount: '0.00',
        lineTotal: '50.00',
        taxCode: 'SST'
      }
    ],
    ...overrides
  };
};

describe('CreditNotesService', () => {
  let prisma: jest.Mocked<PrismaService>;
  let math: jest.Mocked<MathService>;
  let numbering: jest.Mocked<NumberingService>;
  let service: CreditNotesService;

  beforeEach(() => {
    prisma = {
      creditNote: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      invoice: {
        findUnique: jest.fn(),
        update: jest.fn()
      },
      product: {
        findMany: jest.fn()
      },
      auditLog: {
        create: jest.fn()
      },
      $transaction: jest.fn()
    } as unknown as jest.Mocked<PrismaService>;

    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));

    math = {
      calculateQuoteTotals: jest.fn()
    } as unknown as jest.Mocked<MathService>;

    numbering = {
      generateCreditNoteNumber: jest.fn(),
      generateInvoiceNumber: jest.fn(),
      generateQuoteNumber: jest.fn()
    } as unknown as jest.Mocked<NumberingService>;

    service = new CreditNotesService(prisma, math, numbering);
  });

  it('creates a credit note from an invoice and updates balances', async () => {
    const totals: QuoteTotals = {
      items: [
        { qty: 1, unitPrice: 50, lineDiscount: 0, lineTotal: 50, gross: 50 }
      ],
      itemsTotal: 50,
      discountTotal: 0,
      taxableSubtotal: 50,
      sst: 3,
      grandTotal: 53
    };

    math.calculateQuoteTotals.mockReturnValue(totals);
    numbering.generateCreditNoteNumber.mockResolvedValue('CNBR-20240101-001');
    prisma.invoice.findUnique.mockResolvedValueOnce(buildInvoice() as any);
    prisma.product.findMany.mockResolvedValue([{ id: 'product-1' }]);
    prisma.creditNote.create.mockResolvedValue(buildCreditNote() as any);
    prisma.invoice.update.mockResolvedValue({} as any);
    prisma.auditLog.create.mockResolvedValue({} as any);
    prisma.creditNote.findUnique.mockResolvedValueOnce(buildCreditNote() as any);

    const result = await service.create(
      {
        invoiceId: 'invoice-1',
        reason: 'Returned items',
        items: [
          {
            invoiceItemId: 'item-1',
            qty: 1,
            unitPrice: 50,
            description: 'Consulting'
          }
        ]
      },
      'user-1'
    );

    expect(numbering.generateCreditNoteNumber).toHaveBeenCalledWith(
      'branch-1',
      expect.anything()
    );
    expect(prisma.invoice.update).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'CREDIT_NOTE_CREATED', actorId: 'user-1' })
      })
    );
    expect(result.creditNoteNo).toBe('CNBR-20240101-001');
    expect(result.grandTotal).toBeCloseTo(53);
  });

  it('rejects creation when amount exceeds invoice balance', async () => {
    const totals: QuoteTotals = {
      items: [
        { qty: 1, unitPrice: 200, lineDiscount: 0, lineTotal: 200, gross: 200 }
      ],
      itemsTotal: 200,
      discountTotal: 0,
      taxableSubtotal: 200,
      sst: 12,
      grandTotal: 212
    };

    math.calculateQuoteTotals.mockReturnValue(totals);
    prisma.invoice.findUnique.mockResolvedValueOnce(buildInvoice() as any);

    await expect(
      service.create({
        invoiceId: 'invoice-1',
        reason: 'Oversized',
        items: [{ invoiceItemId: 'item-1', qty: 2, unitPrice: 100 }]
      })
    ).rejects.toThrow('Credit note amount exceeds the outstanding invoice balance');
  });

  it('voids an issued credit note and restores invoice balance', async () => {
    const existing = buildCreditNote();
    prisma.creditNote.findUnique.mockResolvedValueOnce(existing as any);
    prisma.invoice.update.mockResolvedValue({} as any);
    prisma.creditNote.update.mockResolvedValue(
      buildCreditNote({
        status: CreditNoteStatus.VOID,
        invoice: {
          ...existing.invoice,
          balanceDue: '106.00',
          grandTotal: '106.00'
        }
      }) as any
    );
    prisma.auditLog.create.mockResolvedValue({} as any);

    const result = await service.void('credit-1', 'user-2');

    expect(prisma.creditNote.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: CreditNoteStatus.VOID }) })
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'CREDIT_NOTE_VOIDED', actorId: 'user-2' })
      })
    );
    expect(result.status).toBe(CreditNoteStatus.VOID);
  });
});
