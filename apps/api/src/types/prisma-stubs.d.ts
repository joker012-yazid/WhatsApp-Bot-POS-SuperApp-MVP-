declare module '@prisma/client' {
  export const Role: {
    readonly ADMIN: 'ADMIN';
    readonly MANAGER: 'MANAGER';
    readonly AGENT: 'AGENT';
    readonly CASHIER: 'CASHIER';
  };
  export type Role = (typeof Role)[keyof typeof Role];

  export const TicketStatus: {
    readonly OPEN: 'OPEN';
    readonly IN_PROGRESS: 'IN_PROGRESS';
    readonly RESOLVED: 'RESOLVED';
    readonly CLOSED: 'CLOSED';
  };
  export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

  export const PaymentMethod: {
    readonly CASH: 'CASH';
    readonly CARD: 'CARD';
    readonly EWALLET: 'EWALLET';
  };
  export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

  export const WaMessageDirection: {
    readonly INBOUND: 'INBOUND';
    readonly OUTBOUND: 'OUTBOUND';
  };
  export type WaMessageDirection = (typeof WaMessageDirection)[keyof typeof WaMessageDirection];

  export type SaleItem = any;
  export type Prisma = any;
  export type User = any;
  export type Ticket = {
    id: string;
    status: TicketStatus;
    priority?: number | null;
    createdAt: Date;
    [key: string]: any;
  };
  export class PrismaClient {
    ticket: any;
    user: any;
    product: any;
    sale: any;
    auditLog: any;
    customer: any;
    waMessage: any;
    branch: any;
    constructor(options?: any);
    $disconnect(): Promise<void>;
    $connect(): Promise<void>;
    $on(event: string, handler: (...args: any[]) => Promise<void> | void): void;
    $queryRaw(...args: any[]): Promise<any>;
  }
}
