import { NotFoundException } from '@nestjs/common';
import { NumberingService } from '../numbering.service';

class NumberingPrismaStub {
  private branchRecord = { id: 'branch-1', code: 'BR', timezone: 'Asia/Kuala_Lumpur' };
  private quoteCount = 0;
  private invoiceCount = 0;
  private creditNoteCount = 0;
  private chain: Promise<any> = Promise.resolve();

  branch = {
    findUnique: jest.fn(async ({ where: { id } }: any) =>
      id === this.branchRecord.id ? this.branchRecord : null
    )
  };

  quote = {
    count: jest.fn(async ({ where }: any) => {
      if (where?.branchId !== this.branchRecord.id) {
        return 0;
      }
      return this.quoteCount;
    })
  };

  invoice = {
    count: jest.fn(async ({ where }: any) => {
      if (where?.branchId !== this.branchRecord.id) {
        return 0;
      }
      return this.invoiceCount;
    })
  };

  creditNote = {
    count: jest.fn(async ({ where }: any) => {
      if (where?.branchId !== this.branchRecord.id) {
        return 0;
      }
      return this.creditNoteCount;
    })
  };

  $transaction = jest.fn(async (callback: (client: any) => Promise<any>) => {
    this.chain = this.chain.then(() =>
      callback({
        branch: this.branch,
        quote: {
          count: async () => {
            const current = this.quoteCount;
            this.quoteCount += 1;
            return current;
          }
        },
        invoice: {
          count: async () => {
            const current = this.invoiceCount;
            this.invoiceCount += 1;
            return current;
          }
        },
        creditNote: {
          count: async () => {
            const current = this.creditNoteCount;
            this.creditNoteCount += 1;
            return current;
          }
        }
      })
    );
    return this.chain;
  });
}

describe('NumberingService', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-05-02T02:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('generates formatted document numbers per branch and day', async () => {
    const prisma = new NumberingPrismaStub();
    const service = new NumberingService(prisma as any);

    const quoteNo = await service.generateQuoteNumber('branch-1');
    const invoiceNo = await service.generateInvoiceNumber('branch-1');
    const creditNoteNo = await service.generateCreditNoteNumber('branch-1');

    expect(quoteNo).toBe('QBR-20240502-001');
    expect(invoiceNo).toBe('INVBR-20240502-001');
    expect(creditNoteNo).toBe('CNBR-20240502-001');
  });

  it('produces sequential numbers when called concurrently', async () => {
    const prisma = new NumberingPrismaStub();
    const service = new NumberingService(prisma as any);

    const results = await Promise.all([
      service.generateInvoiceNumber('branch-1'),
      service.generateInvoiceNumber('branch-1'),
      service.generateInvoiceNumber('branch-1')
    ]);

    expect(new Set(results).size).toBe(3);
    expect(results).toEqual([
      'INVBR-20240502-001',
      'INVBR-20240502-002',
      'INVBR-20240502-003'
    ]);
  });

  it('throws if the branch cannot be found', async () => {
    const prisma = new NumberingPrismaStub();
    prisma.branch.findUnique = jest.fn().mockResolvedValue(null);
    const service = new NumberingService(prisma as any);

    await expect(service.generateQuoteNumber('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
