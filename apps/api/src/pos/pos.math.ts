import { BadRequestException } from '@nestjs/common';

export const SST_RATE = 0.06;

export interface SaleLineInput {
  unitPriceCents: number;
  quantity: number;
  discountCents?: number;
}

export interface SaleLineRecord {
  unitPrice: number;
  quantity: number;
  discountCents: number;
}

export interface TotalsResult {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
}

export function computeLineTotal(item: SaleLineInput): number {
  if (item.quantity <= 0) {
    throw new BadRequestException('Quantity must be greater than zero');
  }
  const discount = item.discountCents ?? 0;
  const gross = item.unitPriceCents * item.quantity;
  if (discount > gross) {
    throw new BadRequestException('Discount cannot exceed line total');
  }
  return gross - discount;
}

export function calculateTotals(items: SaleLineInput[]): TotalsResult {
  const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  const discountCents = items.reduce((sum, item) => sum + (item.discountCents ?? 0), 0);
  if (discountCents > subtotalCents) {
    throw new BadRequestException('Discount exceeds subtotal');
  }
  const netCents = subtotalCents - discountCents;
  const taxCents = Math.round(netCents * SST_RATE + Number.EPSILON);
  const totalCents = netCents + taxCents;
  return { subtotalCents, discountCents, taxCents, totalCents };
}

export function calculateRefundTotals(items: SaleLineRecord[]): TotalsResult {
  const subtotalCents = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountCents = items.reduce((sum, item) => sum + item.discountCents, 0);
  const netCents = subtotalCents - discountCents;
  const taxCents = Math.round(netCents * SST_RATE + Number.EPSILON);
  const totalCents = netCents + taxCents;
  return { subtotalCents, discountCents, taxCents, totalCents };
}
