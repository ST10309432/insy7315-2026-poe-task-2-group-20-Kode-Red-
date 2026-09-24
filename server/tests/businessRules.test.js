// Unit tests for core business rules. Owner: Molemo (testing) — extend these.
const { canBorrow } = require('../src/services/paymentStrategies');
const { canTransition, priceLines } = require('../src/services/orderService');

describe('Student credit rule (outstanding + total <= limit)', () => {
  const account = { credit_limit: 200, outstanding_balance: 90, status: 'ACTIVE' };

  test('allows a purchase within the available credit', () => {
    expect(canBorrow(account, 110).ok).toBe(true);
  });
  test('blocks a purchase that would exceed the limit', () => {
    const r = canBorrow(account, 110.01);
    expect(r.ok).toBe(false);
    expect(r.available).toBe(110);
  });
  test('blocks overdue or suspended accounts', () => {
    expect(canBorrow({ ...account, status: 'OVERDUE' }, 1).ok).toBe(false);
    expect(canBorrow({ ...account, status: 'SUSPENDED' }, 1).ok).toBe(false);
  });
  test('blocks users without a credit account', () => {
    expect(canBorrow(undefined, 1).ok).toBe(false);
  });
});

describe('Order lifecycle (Task 1 state diagram)', () => {
  test.each([
    ['PLACED', 'ACCEPTED', true], ['ACCEPTED', 'PREPARING', true], ['PREPARING', 'READY', true],
    ['READY', 'COLLECTED', true], ['PLACED', 'CANCELLED', true],
    ['PLACED', 'COLLECTED', false], ['READY', 'CANCELLED', false], ['COLLECTED', 'PLACED', false],
  ])('%s -> %s allowed: %s', (from, to, expected) => {
    expect(canTransition(from, to)).toBe(expected);
  });
});

describe('Server-side pricing', () => {
  const menu = [
    { id: 1, name: 'Half Kota', price: 55, salePrice: null, available: true, prepMinutes: 12,
      extras: [{ id: 10, name: 'Cheese', price: 6 }, { id: 11, name: 'Chips', price: 8 }] },
    { id: 2, name: 'Full House', price: 75, salePrice: 60, available: true, prepMinutes: 15, extras: [] },
    { id: 3, name: 'Water', price: 12, salePrice: null, available: false, prepMinutes: 1, extras: [] },
  ];

  test('adds extras and multiplies by quantity', () => {
    const [line] = priceLines([{ itemId: 1, quantity: 2, extraIds: [10, 11] }], menu);
    expect(line.unitPrice).toBe(69);
    expect(line.lineTotal).toBe(138);
  });
  test('uses the sale price when an item is on special', () => {
    expect(priceLines([{ itemId: 2, quantity: 1 }], menu)[0].unitPrice).toBe(60);
  });
  test('rejects sold-out items and unknown extras', () => {
    expect(() => priceLines([{ itemId: 3, quantity: 1 }], menu)).toThrow(/sold out/);
    expect(() => priceLines([{ itemId: 1, quantity: 1, extraIds: [99] }], menu)).toThrow(/not available/);
  });
});
