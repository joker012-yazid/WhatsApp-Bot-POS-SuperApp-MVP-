import { MathService } from '../common/math/math.service';
import { NumberingService } from '../common/numbering/numbering.service';
import { QuotesService } from '../quotes/quotes.service';
import { InvoicesService } from '../invoices/invoices.service';
import {
  InvoiceStatus,
  PaymentMethod,
  QuoteStatus
} from '../common/constants/prisma.enums';
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

enum SubmissionStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED'
}

class LocalMockProvider {
  private readonly submissions = new Map<string, { polls: number; final: SubmissionStatus }>();

  async submit(payload: any) {
    const id = `MOCK-${Math.random().toString(36).slice(2)}`;
    const final = payload.invoice.grandTotal <= 0 ? SubmissionStatus.REJECTED : SubmissionStatus.ACCEPTED;
    this.submissions.set(id, { polls: 0, final });
    return {
      submissionId: id,
      status: final === SubmissionStatus.REJECTED ? SubmissionStatus.REJECTED : SubmissionStatus.PENDING,
      raw: { submissionId: id }
    };
  }

  async status(id: string) {
    const state = this.submissions.get(id);
    if (!state) {
      return { status: SubmissionStatus.FAILED, raw: { submissionId: id } };
    }
    if (state.final === SubmissionStatus.REJECTED) {
      this.submissions.delete(id);
      return { status: SubmissionStatus.REJECTED, raw: { submissionId: id } };
    }
    state.polls += 1;
    if (state.polls >= 2) {
      this.submissions.delete(id);
      return { status: SubmissionStatus.ACCEPTED, raw: { submissionId: id } };
    }
    return { status: SubmissionStatus.SENT, raw: { submissionId: id, polls: state.polls } };
  }
}

class InMemoryPrismaService {
  private quotes: any[] = [];
  private quoteItems: any[] = [];
  private invoices: any[] = [];
  private invoiceItems: any[] = [];
  private invoicePayments: any[] = [];
  private counters = {
    quote: 0,
    quoteItem: 0,
    invoice: 0,
    invoiceItem: 0,
    payment: 0
  };

  branch = {
    findUnique: async ({ where: { id } }: any) =>
      id === 'branch-1'
        ? { id: 'branch-1', code: 'BR', name: 'Main Branch', timezone: 'Asia/Kuala_Lumpur' }
        : null
  };

  customer = {
    findUnique: async ({ where: { id } }: any) =>
      id === 'customer-1'
        ? { id: 'customer-1', fullName: 'Acme Industries', phone: '012-3456789', email: 'ops@acme.test' }
        : null
  };

  product = {
    findMany: async ({ where, select }: any) => {
      const matches = ['product-1'];
      const ids = where?.id?.in ?? [];
      if (ids.length && !ids.every((id: string) => matches.includes(id))) {
        return [];
      }
      if (select?.id) {
        return matches.map((id) => ({ id }));
      }
      return matches.map((id) => ({ id, branchId: 'branch-1' }));
    }
  };

  quote = {
    count: async ({ where }: any) =>
      this.quotes.filter((quote) =>
        quote.branchId === where?.branchId &&
        (!where?.createdAt?.gte || quote.createdAt >= where.createdAt.gte) &&
        (!where?.createdAt?.lt || quote.createdAt < where.createdAt.lt)
      ).length,
    create: async ({ data, include }: any) => {
      const now = new Date();
      const record = {
        id: this.nextId('quote'),
        quoteNo: data.quoteNo,
        branchId: data.branchId,
        customerId: data.customerId,
        itemsTotal: data.itemsTotal,
        discountTotal: data.discountTotal,
        taxableSubtotal: data.taxableSubtotal,
        sst: data.sst,
        grandTotal: data.grandTotal,
        currency: data.currency ?? 'MYR',
        status: QuoteStatus.DRAFT,
        validUntil: data.validUntil ?? null,
        notes: data.notes ?? null,
        createdAt: now,
        updatedAt: now
      };
      this.quotes.push(record);

      for (const item of data.items?.create ?? []) {
        this.quoteItems.push({
          id: this.nextId('quoteItem'),
          quoteId: record.id,
          productId: item.productId,
          description: item.description,
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineDiscount: item.lineDiscount,
          lineTotal: item.lineTotal,
          taxCode: item.taxCode ?? null
        });
      }

      return include ? this.hydrateQuote(record) : record;
    },
    update: async ({ where: { id }, data, include }: any) => {
      const record = this.quotes.find((quote) => quote.id === id);
      if (!record) {
        return null;
      }
      if (data.status) {
        record.status = data.status;
      }
      if (data.validUntil !== undefined) {
        record.validUntil = data.validUntil;
      }
      record.updatedAt = new Date();
      return include ? this.hydrateQuote(record) : record;
    },
    findUnique: async ({ where: { id }, include }: any) => {
      const record = this.quotes.find((quote) => quote.id === id);
      if (!record) {
        return null;
      }
      return include ? this.hydrateQuote(record) : record;
    }
  };

  invoice = {
    count: async ({ where }: any) =>
      this.invoices.filter((invoice) =>
        invoice.branchId === where?.branchId &&
        (!where?.createdAt?.gte || invoice.createdAt >= where.createdAt.gte) &&
        (!where?.createdAt?.lt || invoice.createdAt < where.createdAt.lt)
      ).length,
    create: async ({ data, include }: any) => {
      const now = new Date();
      const record = {
        id: this.nextId('invoice'),
        invoiceNo: data.invoiceNo,
        branchId: data.branchId,
        customerId: data.customerId,
        quoteId: data.quoteId ?? null,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        itemsTotal: data.itemsTotal,
        discountTotal: data.discountTotal,
        taxableSubtotal: data.taxableSubtotal,
        sst: data.sst,
        grandTotal: data.grandTotal,
        paidTotal: data.paidTotal,
        balanceDue: data.balanceDue,
        currency: data.currency ?? 'MYR',
        status: data.status ?? InvoiceStatus.DRAFT,
        posSaleId: data.posSaleId ?? null,
        notes: data.notes ?? null,
        createdAt: now,
        updatedAt: now
      };
      this.invoices.push(record);

      for (const item of data.items?.create ?? []) {
        this.invoiceItems.push({
          id: this.nextId('invoiceItem'),
          invoiceId: record.id,
          productId: item.productId,
          description: item.description,
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineDiscount: item.lineDiscount,
          lineTotal: item.lineTotal,
          taxCode: item.taxCode ?? null
        });
      }

      return include ? this.hydrateInvoice(record) : record;
    },
    update: async ({ where: { id }, data, include }: any) => {
      const record = this.invoices.find((invoice) => invoice.id === id);
      if (!record) {
        return null;
      }
      if (data.paidTotal !== undefined) {
        record.paidTotal = data.paidTotal;
      }
      if (data.balanceDue !== undefined) {
        record.balanceDue = data.balanceDue;
      }
      if (data.status) {
        record.status = data.status;
      }
      if (data.notes !== undefined) {
        record.notes = data.notes;
      }
      if (data.dueDate !== undefined) {
        record.dueDate = data.dueDate;
      }
      if (data.issueDate !== undefined) {
        record.issueDate = data.issueDate;
      }
      record.updatedAt = new Date();
      return include ? this.hydrateInvoice(record) : record;
    },
    findUnique: async ({ where: { id }, include }: any) => {
      const record = this.invoices.find((invoice) => invoice.id === id);
      if (!record) {
        return null;
      }
      return include ? this.hydrateInvoice(record) : record;
    }
  };

  invoicePayment = {
    create: async ({ data }: any) => {
      const record = {
        id: this.nextId('payment'),
        invoiceId: data.invoiceId,
        method: data.method,
        amount: data.amount,
        reference: data.reference ?? null,
        paidAt: data.paidAt ?? new Date()
      };
      this.invoicePayments.push(record);
      return record;
    }
  };

  creditNote = {
    count: async () => 0
  };

  $transaction = async <T>(callback: (client: any) => Promise<T>) => callback(this);

  private hydrateQuote(record: any) {
    return {
      ...record,
      branch: { id: 'branch-1', name: 'Main Branch', code: 'BR' },
      customer: {
        id: 'customer-1',
        fullName: 'Acme Industries',
        phone: '012-3456789',
        email: 'ops@acme.test'
      },
      items: this.quoteItems
        .filter((item) => item.quoteId === record.id)
        .map((item) => ({
          id: item.id,
          productId: item.productId,
          description: item.description,
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineDiscount: item.lineDiscount,
          lineTotal: item.lineTotal,
          taxCode: item.taxCode
        }))
    };
  }

  private hydrateInvoice(record: any) {
    return {
      ...record,
      branch: { id: 'branch-1', name: 'Main Branch', code: 'BR' },
      customer: {
        id: 'customer-1',
        fullName: 'Acme Industries',
        phone: '012-3456789',
        email: 'ops@acme.test'
      },
      items: this.invoiceItems
        .filter((item) => item.invoiceId === record.id)
        .map((item) => ({
          id: item.id,
          productId: item.productId,
          description: item.description,
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineDiscount: item.lineDiscount,
          lineTotal: item.lineTotal,
          taxCode: item.taxCode
        })),
      payments: this.invoicePayments
        .filter((payment) => payment.invoiceId === record.id)
        .map((payment) => ({
          id: payment.id,
          method: payment.method,
          amount: payment.amount,
          reference: payment.reference,
          paidAt: payment.paidAt
        }))
    };
  }

  private nextId(prefix: keyof InMemoryPrismaService['counters']) {
    this.counters[prefix] += 1;
    return `${prefix}-${this.counters[prefix].toString().padStart(4, '0')}`;
  }
}

describe('Quotes → Invoices → e-Invoice flow', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-05-02T02:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('creates a quote, accepts it into an invoice, records a payment, and completes mock e-invoicing', async () => {
    const prisma = new InMemoryPrismaService();
    const math = new MathService();
    const numbering = new NumberingService(prisma as any);
    const quotesService = new QuotesService(prisma as any, math, numbering);
    const invoicesService = new InvoicesService(prisma as any, math, numbering);

    const quote = await quotesService.create({
      branchId: 'branch-1',
      customerId: 'customer-1',
      items: [
        { productId: 'product-1', description: 'Implementation', qty: 2, unitPrice: 150, lineDiscount: 10, taxCode: 'SST' }
      ],
      notes: 'Valid for 14 days'
    });

    expect(quote.quoteNo).toBe('QBR-20240502-001');
    expect(quote.status).toBe(QuoteStatus.DRAFT);
    expect(quote.grandTotal).toBeCloseTo(307.4);

    const acceptance = await quotesService.accept(quote.id, {});
    expect(acceptance.quote.status).toBe(QuoteStatus.ACCEPTED);
    expect(acceptance.invoiceNo).toBe('INVBR-20240502-001');

    const invoice = await invoicesService.get(acceptance.invoiceId);
    expect(invoice.status).toBe(InvoiceStatus.SENT);
    expect(invoice.items).toHaveLength(1);
    expect(invoice.items[0].lineTotal).toBeCloseTo(290);

    const payment = await invoicesService.recordPayment(invoice.id, {
      method: PaymentMethod.CASH,
      amount: 150,
      reference: 'RCPT-1'
    });

    expect(payment.status).toBe(InvoiceStatus.PARTIALLY_PAID);
    expect(payment.paidTotal).toBeCloseTo(150);
    expect(payment.balanceDue).toBeCloseTo(157.4);
    expect(payment.payments).toHaveLength(1);

    const refreshed = await invoicesService.get(invoice.id);
    const provider = new LocalMockProvider();

    const payload = {
      supplier: {
        name: refreshed.branch?.name ?? 'Main Branch',
        registrationNumber: refreshed.branch?.code ?? 'BR',
        address: null
      },
      buyer: refreshed.customer
        ? {
            name: refreshed.customer.fullName,
            email: refreshed.customer.email,
            phone: refreshed.customer.phone,
            address: null
          }
        : null,
      invoice: {
        id: refreshed.id,
        invoiceNo: refreshed.invoiceNo,
        branchCode: refreshed.branch?.code ?? 'BR',
        currency: refreshed.currency,
        issueDate: refreshed.issueDate.toISOString(),
        dueDate: refreshed.dueDate ? refreshed.dueDate.toISOString() : null,
        itemsTotal: refreshed.itemsTotal,
        discountTotal: refreshed.discountTotal,
        taxableSubtotal: refreshed.taxableSubtotal,
        taxAmount: refreshed.sst,
        grandTotal: refreshed.grandTotal
      },
      items: refreshed.items.map((item) => ({
        description: item.description,
        quantity: item.qty,
        unitPrice: item.unitPrice,
        discount: item.lineDiscount,
        taxCode: item.taxCode,
        taxRate: 6,
        taxableAmount: item.lineTotal,
        taxAmount: Number((item.lineTotal * 0.06).toFixed(2)),
        lineTotal: item.lineTotal
      })),
      payments: refreshed.payments.map((payment) => ({
        method: payment.method,
        amount: payment.amount,
        paidAt: payment.paidAt.toISOString(),
        reference: payment.reference
      })),
      summary: {
        taxableAmount: refreshed.taxableSubtotal,
        taxAmount: refreshed.sst,
        total: refreshed.grandTotal
      }
    };

    const submission = await provider.submit(payload);
    expect(submission.status).toBe(SubmissionStatus.PENDING);

    const poll = await provider.status(submission.submissionId);
    expect(poll.status).toBe(SubmissionStatus.SENT);

    const final = await provider.status(submission.submissionId);
    expect(final.status).toBe(SubmissionStatus.ACCEPTED);
  });
});
