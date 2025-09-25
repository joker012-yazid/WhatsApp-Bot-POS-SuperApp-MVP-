import { BadRequestException } from '@nestjs/common';
import { SaleItemDto } from './dto/create-sale.dto';

export const SST_RATE = 0.06;

export type RefundLineInput = {
  unitPrice: number;
  quantity: number;
  discountCents: number;
};

export function computeLineTotal(item: SaleItemDto) {
  const gross = item.unitPriceCents * item.quantity;
  const discount = item.discountCents ?? 0;
  if (discount > gross) {
    throw new BadRequestException('Discount cannot exceed line total');
  }
  return gross - discount;
}

export function calculateSaleTotals(items: SaleItemDto[]) {
  const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  const discountCents = items.reduce((sum, item) => sum + (item.discountCents ?? 0), 0);
  if (discountCents > subtotalCents) {
    throw new BadRequestException('Discount exceeds subtotal');
  }
  const netCents = subtotalCents - discountCents;
  const taxCents = calculateSst(netCents);
  const totalCents = netCents + taxCents;
  return { subtotalCents, discountCents, netCents, taxCents, totalCents };
}

export function calculateRefundTotals(items: RefundLineInput[]) {
  const subtotalCents = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountCents = items.reduce((sum, item) => sum + item.discountCents, 0);
  const netCents = subtotalCents - discountCents;
  const taxCents = calculateSst(netCents);
  const totalCents = netCents + taxCents;
  return { subtotalCents, discountCents, netCents, taxCents, totalCents };
}

export function calculateSst(netCents: number) {
  return Math.round((netCents * (SST_RATE * 100)) / 100);
}
