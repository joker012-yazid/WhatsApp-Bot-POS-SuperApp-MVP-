declare module '@prisma/client' {
  enum EinvoiceSubmissionStatus {
    PENDING = 'PENDING',
    SENT = 'SENT',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
    FAILED = 'FAILED'
  }

  interface PrismaClient {
    $transaction: (...args: any[]) => Promise<any>;
    branch: any;
    quote: any;
    invoice: any;
    creditNote: any;
    invoicePayment: any;
  }

  namespace Prisma {
    // Provide minimal fallbacks so ts-jest can compile in environments
    // where the generated client omits rich type metadata.
    type Decimal = number;
    type TransactionClient = any;
    enum TransactionIsolationLevel {
      Serializable = 'Serializable'
    }
    type InvoiceUpdateInput = Record<string, unknown>;
  }
}
