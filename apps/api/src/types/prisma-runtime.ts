export const Role = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  AGENT: 'AGENT',
  CASHIER: 'CASHIER'
} as const;

export const TicketStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED'
} as const;

export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  EWALLET: 'EWALLET'
} as const;

export const WaMessageDirection = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND'
} as const;

export class PrismaClient {
  ticket: any;
  user: any;
  product: any;
  sale: any;
  auditLog: any;
  customer: any;
  waMessage: any;
  branch: any;

  constructor() {
    this.ticket = {};
    this.user = {};
    this.product = {};
    this.sale = {};
    this.auditLog = {};
    this.customer = {};
    this.waMessage = {};
    this.branch = {};
  }

  async $disconnect() {
    return;
  }

  async $connect() {
    return;
  }

  $on() {
    return;
  }

  async $queryRaw() {
    return [];
  }
}

export type Role = (typeof Role)[keyof typeof Role];
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
export type WaMessageDirection = (typeof WaMessageDirection)[keyof typeof WaMessageDirection];
export type Prisma = any;
export type SaleItem = any;
export type User = any;
export type Ticket = {
  id: string;
  status: TicketStatus;
  priority?: number | null;
  createdAt: Date;
  [key: string]: any;
};
