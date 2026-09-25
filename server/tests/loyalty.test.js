// Unit tests for loyalty rules (LP-01..LP-05). Owner: Molemo (testing) — extend these.
const { calculateDiscounts, pointsEarned, earnsFreeMeal } = require('../src/services/loyaltyService');
const { toCsv } = require('../src/utils/csv');

const settings = { randsPerPoint: 10, pointValue: 0.5, freeMealEvery: 10, freeMealCap: 60 };
const lines = [{ unitPrice: 75 }, { unitPrice: 15 }];

describe('Loyalty discounts', () => {
  test('points are worth R0.50 each and capped by what the student has', () => {
    const d = calculateDiscounts({ lines, subtotal: 90, usePoints: 40, availablePoints: 30, settings });
    expect(d.pointsUsed).toBe(30);
    expect(d.pointsDiscount).toBe(15);
  });
  test('points can never discount more than the order subtotal', () => {
    const d = calculateDiscounts({ lines, subtotal: 90, usePoints: 1000, availablePoints: 1000, settings });
    expect(d.pointsUsed).toBe(180);
    expect(d.discount).toBe(90);
  });
  test('free meal takes the priciest item off, up to the cap', () => {
    const d = calculateDiscounts({ lines, subtotal: 90, useFreeMeal: true, freeMeals: 1, settings });
    expect(d.freeMealDiscount).toBe(60);
  });
  test('free meal is ignored when the student has none', () => {
    expect(calculateDiscounts({ lines, subtotal: 90, useFreeMeal: true, freeMeals: 0, settings }).discount).toBe(0);
  });
  test('points and free meal combine without going below zero', () => {
    const d = calculateDiscounts({ lines, subtotal: 90, useFreeMeal: true, freeMeals: 1, usePoints: 500, availablePoints: 500, settings });
    expect(d.freeMealDiscount).toBe(60);
    expect(d.pointsUsed).toBe(60);
    expect(d.discount).toBe(90);
  });
});

describe('Earning rewards', () => {
  test('1 point per R10 paid, rounded down', () => {
    expect(pointsEarned(99.99, settings)).toBe(9);
    expect(pointsEarned(100, settings)).toBe(10);
  });
  test('every 10th order earns a free meal', () => {
    expect(earnsFreeMeal(10, settings)).toBe(true);
    expect(earnsFreeMeal(20, settings)).toBe(true);
    expect(earnsFreeMeal(11, settings)).toBe(false);
    expect(earnsFreeMeal(0, settings)).toBe(false);
  });
});

describe('CSV export', () => {
  test('quotes commas and blocks spreadsheet formulas', () => {
    const csv = toCsv([{ a: 'x, y', b: '=SUM(A1)', c: -5 }]);
    expect(csv).toBe('a,b,c\r\n"x, y",\'=SUM(A1),-5\r\n');
  });
});
