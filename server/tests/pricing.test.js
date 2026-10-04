// Unit tests for pricingService. Owner: Liyabona (business logic).
const { unitPriceOf, priceLines, calculateTotals, resolveCollectionTime } = require('../src/services/pricingService');

const menu = [
  { id: 1, name: 'Half Kota', price: 55, salePrice: null, available: true, prepMinutes: 12,
    extras: [{ id: 10, name: 'Cheese', price: 6 }, { id: 11, name: 'Chips', price: 8 }] },
  { id: 2, name: 'Full House', price: 75, salePrice: 60, available: true, prepMinutes: 15, extras: [] },
  { id: 3, name: 'Water', price: 12, salePrice: null, available: false, prepMinutes: 1, extras: [] },
];

describe('unitPriceOf', () => {
  test('uses the normal price when the item is not on sale', () => {
    expect(unitPriceOf(menu[0])).toBe(55);
  });
  test('uses the sale price when the item is on special', () => {
    expect(unitPriceOf(menu[1])).toBe(60);
  });
});

describe('priceLines', () => {
  test('adds extras to the unit price and multiplies by quantity', () => {
    const [line] = priceLines([{ itemId: 1, quantity: 2, extraIds: [10, 11] }], menu);
    expect(line.unitPrice).toBe(69);   // 55 + 6 + 8
    expect(line.lineTotal).toBe(138);  // 69 x 2
  });
  test('rejects an empty order', () => {
    expect(() => priceLines([], menu)).toThrow('at least one item');
  });
  test('rejects an item that does not exist', () => {
    expect(() => priceLines([{ itemId: 99, quantity: 1 }], menu)).toThrow('does not exist');
  });
  test('rejects a sold-out item', () => {
    expect(() => priceLines([{ itemId: 3, quantity: 1 }], menu)).toThrow('sold out');
  });
  test('rejects an extra that belongs to another item', () => {
    expect(() => priceLines([{ itemId: 2, quantity: 1, extraIds: [10] }], menu)).toThrow('not available');
  });
});

describe('calculateTotals', () => {
  const lines = [{ lineTotal: 110 }, { lineTotal: 15 }];
  test('adds the service fee to the subtotal', () => {
    expect(calculateTotals(lines, 2)).toEqual({ subtotal: 125, serviceFee: 2, discount: 0, total: 127 });
  });
  test('subtracts a loyalty discount', () => {
    expect(calculateTotals(lines, 2, 20).total).toBe(107);
  });
  test('never goes below R0 (free meal covers everything)', () => {
    expect(calculateTotals(lines, 2, 500).total).toBe(0);
  });
});

describe('resolveCollectionTime', () => {
  const now = new Date('2026-09-28T10:00:00Z').getTime();
  const lines = [{ prepMinutes: 12 }, { prepMinutes: 15 }];
  const earliest = new Date(now + 15 * 60 * 1000);

  test('ASAP = when the slowest item is ready', () => {
    expect(resolveCollectionTime('ASAP', lines, now)).toEqual(earliest);
  });
  test('moves a too-early time to the earliest possible time', () => {
    expect(resolveCollectionTime(new Date(now + 5 * 60 * 1000).toISOString(), lines, now)).toEqual(earliest);
  });
  test('keeps a valid later time', () => {
    const later = new Date(now + 2 * 60 * 60 * 1000);
    expect(resolveCollectionTime(later.toISOString(), lines, now)).toEqual(later);
  });
  test('rejects a time in the past', () => {
    expect(() => resolveCollectionTime(new Date(now - 10 * 60 * 1000).toISOString(), lines, now)).toThrow('in the past');
  });
  test('rejects a time more than 12 hours ahead', () => {
    expect(() => resolveCollectionTime(new Date(now + 13 * 60 * 60 * 1000).toISOString(), lines, now)).toThrow('within 12 hours');
  });
  test('rejects an invalid date', () => {
    expect(() => resolveCollectionTime('not-a-date', lines, now)).toThrow('not a valid date');
  });
});