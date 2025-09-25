import { BadRequestException } from '@nestjs/common';
import { calculateRefundTotals, calculateTotals, computeLineTotal } from './pos.math';

describe('POS Math', () => {
  it('applies discount before SST and rounds tax half-up', () => {
    const items = [
      { unitPriceCents: 1250, quantity: 2, discountCents: 100 },
      { unitPriceCents: 333, quantity: 1, discountCents: 0 }
    ];

    const totals = calculateTotals(items);

    expect(totals.subtotalCents).toBe(2833);
    expect(totals.discountCents).toBe(100);
    // Net = 2733 -> 6% = 163.98 -> rounded half-up to 164
    expect(totals.taxCents).toBe(164);
    expect(totals.totalCents).toBe(2897);
  });

  it('validates line discount does not exceed line total', () => {
    expect(() => computeLineTotal({ unitPriceCents: 500, quantity: 1, discountCents: 600 })).toThrow(
      BadRequestException
    );
  });

  it('calculates full refund totals mirroring original sale', () => {
    const saleItems = [
      { unitPrice: 1000, quantity: 2, discountCents: 0 },
      { unitPrice: 500, quantity: 1, discountCents: 50 }
    ];

    const totals = calculateRefundTotals(saleItems);
    expect(totals.subtotalCents).toBe(2500);
    expect(totals.discountCents).toBe(50);
    expect(totals.taxCents).toBe(147); // (2450 * 0.06) = 147
    expect(totals.totalCents).toBe(2597);
  });

  it('calculates line refund totals for partial item', () => {
    const saleItems = [{ unitPrice: 1500, quantity: 1, discountCents: 200 }];
    const totals = calculateRefundTotals(saleItems);
    expect(totals.subtotalCents).toBe(1500);
    expect(totals.discountCents).toBe(200);
    expect(totals.taxCents).toBe(78); // 1300 * 0.06 = 78
    expect(totals.totalCents).toBe(1378);
  });
});
