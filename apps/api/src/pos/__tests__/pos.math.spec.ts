import { calculateRefundTotals, calculateSaleTotals } from '../pos.math';

describe('POS math', () => {
  it('applies discount before SST and rounds half-up at 6%', () => {
    const totals = calculateSaleTotals([
      { productId: 'A', unitPriceCents: 1000, quantity: 1, discountCents: 100 },
      { productId: 'B', unitPriceCents: 2500, quantity: 1, discountCents: 2475 }
    ]);

    expect(totals.subtotalCents).toBe(3500);
    expect(totals.discountCents).toBe(2575);
    expect(totals.netCents).toBe(925);
    expect(totals.taxCents).toBe(56);
    expect(totals.totalCents).toBe(981);
  });

  it('calculates refund totals for full sale consistently', () => {
    const totals = calculateRefundTotals([
      { unitPrice: 1000, quantity: 2, discountCents: 0 },
      { unitPrice: 500, quantity: 1, discountCents: 50 }
    ]);

    expect(totals.subtotalCents).toBe(2500);
    expect(totals.discountCents).toBe(50);
    expect(totals.netCents).toBe(2450);
    expect(totals.taxCents).toBe(147);
    expect(totals.totalCents).toBe(2597);
  });

  it('calculates refund totals for a single line item', () => {
    const totals = calculateRefundTotals([{ unitPrice: 700, quantity: 1, discountCents: 100 }]);

    expect(totals.subtotalCents).toBe(700);
    expect(totals.discountCents).toBe(100);
    expect(totals.netCents).toBe(600);
    expect(totals.taxCents).toBe(36);
    expect(totals.totalCents).toBe(636);
  });
});
