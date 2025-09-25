import { QuoteStatus } from '../../common/constants/prisma.enums';
import { QuotesService } from '../quotes.service';
import { PrismaService } from '../../common/prisma.service';
import { MathService, QuoteTotals } from '../../common/math/math.service';
import { NumberingService } from '../../common/numbering/numbering.service';

const buildQuote = (overrides: Partial<any> = {}) => {
  const baseDate = new Date('2024-01-01T00:00:00.000Z');
  return {
    id: 'quote-1',
    quoteNo: 'QBR-20240101-001',
    branchId: 'branch-1',
    customerId: 'customer-1',
    itemsTotal: '100.00',
    discountTotal: '5.00',
    taxableSubtotal: '95.00',
    sst: '5.70',
    grandTotal: '100.70',
    currency: 'MYR',
    status: QuoteStatus.DRAFT,
    validUntil: null,
    notes: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    branch: { id: 'branch-1', name: 'Main Branch', code: 'BR' },
    customer: { id: 'customer-1', fullName: 'Jane Doe', phone: '01234', email: 'jane@example.com' },
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        description: 'Service',
        qty: '2.00',
        unitPrice: '50.00',
        lineDiscount: '5.00',
        lineTotal: '95.00',
        taxCode: 'SST'
      }
    ],
    ...overrides
  };
};

describe('QuotesService', () => {
  let prisma: jest.Mocked<PrismaService>;
  let math: jest.Mocked<MathService>;
  let numbering: jest.Mocked<NumberingService>;
  let service: QuotesService;

  beforeEach(() => {
    prisma = {
      quote: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      product: {
        findMany: jest.fn()
      },
      invoice: {
        create: jest.fn()
      },
      $transaction: jest.fn()
    } as unknown as jest.Mocked<PrismaService>;

    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));

    math = {
      calculateQuoteTotals: jest.fn()
    } as unknown as jest.Mocked<MathService>;

    numbering = {
      generateQuoteNumber: jest.fn(),
      generateInvoiceNumber: jest.fn(),
      generateCreditNoteNumber: jest.fn()
    } as unknown as jest.Mocked<NumberingService>;

    service = new QuotesService(prisma, math, numbering);
  });

  it('creates a quote with computed totals', async () => {
    const totals: QuoteTotals = {
      items: [
        { qty: 2, unitPrice: 50, lineDiscount: 5, lineTotal: 95, gross: 100 }
      ],
      itemsTotal: 100,
      discountTotal: 5,
      taxableSubtotal: 95,
      sst: 5.7,
      grandTotal: 100.7
    };
    math.calculateQuoteTotals.mockReturnValue(totals);
    numbering.generateQuoteNumber.mockResolvedValue('QBR-20240101-001');
    prisma.product.findMany.mockResolvedValue([{ id: 'product-1' }]);
    prisma.quote.create.mockResolvedValue(buildQuote());

    const result = await service.create({
      branchId: 'branch-1',
      customerId: 'customer-1',
      items: [
        {
          productId: 'product-1',
          description: 'Service',
          qty: 2,
          unitPrice: 50,
          lineDiscount: 5,
          taxCode: 'SST'
        }
      ]
    });

    expect(numbering.generateQuoteNumber).toHaveBeenCalledWith('branch-1', expect.anything());
    expect(result.quoteNo).toBe('QBR-20240101-001');
    expect(result.itemsTotal).toBeCloseTo(100);
    expect(result.items[0].lineTotal).toBeCloseTo(95);
  });

  it('accepts a quote and creates an invoice', async () => {
    const existing = buildQuote({ status: QuoteStatus.SENT });
    const updated = buildQuote({ status: QuoteStatus.ACCEPTED });
    prisma.quote.findUnique.mockResolvedValueOnce(existing);
    prisma.invoice.create.mockResolvedValue({ id: 'invoice-1', invoiceNo: 'INVBR-20240101-001' } as any);
    prisma.quote.update.mockResolvedValue(updated);
    numbering.generateInvoiceNumber.mockResolvedValue('INVBR-20240101-001');

    const result = await service.accept('quote-1', {});

    expect(numbering.generateInvoiceNumber).toHaveBeenCalledWith('branch-1', expect.anything());
    expect(prisma.invoice.create).toHaveBeenCalled();
    expect(result.invoiceNo).toBe('INVBR-20240101-001');
    expect(result.quote.status).toBe(QuoteStatus.ACCEPTED);
  });
});
