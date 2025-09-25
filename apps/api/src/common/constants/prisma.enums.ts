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
  EWALLET: 'EWALLET'
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const WaMessageDirection = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND'
} as const;

export type WaMessageDirection = (typeof WaMessageDirection)[keyof typeof WaMessageDirection];
