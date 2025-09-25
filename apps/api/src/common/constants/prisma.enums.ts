export const Role = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  AGENT: 'AGENT',
  CASHIER: 'CASHIER'
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const TicketStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED'
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  EWALLET: 'EWALLET',
  BANK: 'BANK'
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const QuoteStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
} as const;

export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

export const InvoiceStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  VOID: 'VOID'
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const CreditNoteStatus = {
  ISSUED: 'ISSUED',
  VOID: 'VOID'
} as const;

export type CreditNoteStatus = (typeof CreditNoteStatus)[keyof typeof CreditNoteStatus];
