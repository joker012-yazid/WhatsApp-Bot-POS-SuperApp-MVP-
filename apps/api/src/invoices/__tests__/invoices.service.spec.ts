import { InvoiceStatus, PaymentMethod } from '../../common/constants/prisma.enums';
import { PrismaService } from '../../common/prisma.service';
import { MathService, QuoteTotals } from '../../common/math/math.service';
import { NumberingService } from '../../common/numbering/numbering.service';
import { InvoicesService } from '../invoices.service';

jest.mock(
  'pdfkit',
  () =>
    class {
      on() {
        return this;
      }
      fontSize() {
        return this;
      }
      text() {
        return this;
      }
      moveDown() {
        return this;
      }
      end() {}
    },
  { virtual: true }
);

const buildInvoice = (overrides: Partial<any> = {}) => {
  const baseDate = new Date('2024-01-01T00:00:00.000Z');
  return {
    id: 'invoice-1',
    invoiceNo: 'INVBR-20240101-001',
    branchId: 'branch-1',
    customerId: 'customer-1',
    quoteId: null,
    issueDate: baseDate,
    dueDate: baseDate,
    itemsTotal: '100.00',
    discountTotal: '0.00',
    taxableSubtotal: '100.00',
    sst: '6.00',
    grandTotal: '106.00',
    paidTotal: '0.00',
    balanceDue: '106.00',
    currency: 'MYR',
    status: InvoiceStatus.DRAFT,
    posSaleId: null,
    notes: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    branch: { id: 'branch-1', name: 'Main Branch', code: 'BR' },
    customer: {
      id: 'customer-1',
      fullName: 'Jane Doe',
      phone: '01234',
      email: 'jane@example.com'
    },
    quote: null,
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
    payments: [],
    ...overrides
  };
};

describe('InvoicesService', () => {
  let prisma: jest.Mocked<PrismaService>;
  let math: jest.Mocked<MathService>;
  let numbering: jest.Mocked<NumberingService>;
  let service: InvoicesService;

  beforeEach(() => {
    prisma = {
      invoice: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      invoicePayment: {
        create: jest.fn()
      },
      product: {
        findMany: jest.fn()
      },
      $transaction: jest.fn()
    } as unknown as jest.Mocked<PrismaService>;

    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));

    math = {
      calculateQuoteTotals: jest.fn()
    } as unknown as jest.Mocked<MathService>;

    numbering = {
      generateInvoiceNumber: jest.fn(),
      generateQuoteNumber: jest.fn(),
      generateCreditNoteNumber: jest.fn()
    } as unknown as jest.Mocked<NumberingService>;

    service = new InvoicesService(prisma, math, numbering);
  });

  it('creates an invoice with computed totals and numbering', async () => {
    const totals: QuoteTotals = {
      items: [
        { qty: 2, unitPrice: 50, lineDiscount: 0, lineTotal: 100, gross: 100 }
      ],
      itemsTotal: 100,
      discountTotal: 0,
      taxableSubtotal: 100,
      sst: 6,
      grandTotal: 106
    };

    math.calculateQuoteTotals.mockReturnValue(totals);
    numbering.generateInvoiceNumber.mockResolvedValue('INVBR-20240101-001');
    prisma.product.findMany.mockResolvedValue([{ id: 'product-1' }]);
    prisma.invoice.create.mockResolvedValue(buildInvoice());

    const result = await service.create({
      branchId: 'branch-1',
      customerId: 'customer-1',
      items: [
        {
          productId: 'product-1',
          description: 'Consulting',
          qty: 2,
          unitPrice: 50,
          lineDiscount: 0,
          taxCode: 'SST'
        }
      ]
    });

    expect(numbering.generateInvoiceNumber).toHaveBeenCalledWith('branch-1', expect.anything());
    expect(result.invoiceNo).toBe('INVBR-20240101-001');
    expect(result.grandTotal).toBeCloseTo(106);
    expect(result.items[0].lineTotal).toBeCloseTo(100);
  });

  it('records a partial payment and updates balances', async () => {
    const existing = buildInvoice({ status: InvoiceStatus.SENT });
    const updated = buildInvoice({
      status: InvoiceStatus.PARTIALLY_PAID,
      paidTotal: '50.00',
      balanceDue: '56.00',
      payments: [
        {
          id: 'payment-1',
          method: PaymentMethod.CASH,
          amount: '50.00',
          reference: null,
          paidAt: new Date('2024-01-02T00:00:00.000Z')
        }
      ]
    });

    prisma.invoice.findUnique.mockResolvedValueOnce(existing as any);
    prisma.invoicePayment.create.mockResolvedValue({ id: 'payment-1' } as any);
    prisma.invoice.update.mockResolvedValue(updated as any);

    const result = await service.recordPayment('invoice-1', {
      method: PaymentMethod.CASH,
      amount: 50,
      reference: undefined,
      paidAt: '2024-01-02T00:00:00.000Z'
    });

    expect(prisma.invoicePayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: '50.00', method: PaymentMethod.CASH })
      })
    );
    expect(result.status).toBe(InvoiceStatus.PARTIALLY_PAID);
    expect(result.paidTotal).toBeCloseTo(50);
    expect(result.balanceDue).toBeCloseTo(56);
  });

  it('voids an invoice', async () => {
    const existing = buildInvoice({ status: InvoiceStatus.SENT });
    const updated = buildInvoice({ status: InvoiceStatus.VOID });

    prisma.invoice.findUnique.mockResolvedValueOnce(existing as any);
    prisma.invoice.update.mockResolvedValue(updated as any);

    const result = await service.void('invoice-1');

    expect(prisma.invoice.update).toHaveBeenCalled();
    expect(result.status).toBe(InvoiceStatus.VOID);
  });
});
