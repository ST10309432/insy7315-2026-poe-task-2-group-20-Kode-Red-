// Loyalty rules (Task 1 §2.3.1, LP-01..LP-05). Owner: Liyabona (business logic).
//  - Earn: 1 point for every `randsPerPoint` rand paid (default R10).
//  - Redeem: each point is worth `pointValue` rand off (default R0.50).
//  - Free meal: every `freeMealEvery` orders (default 10) earns one free meal,
//    which takes the most expensive single item off the order, up to `freeMealCap`.
const { round2 } = require('../utils/money');

/**
 * Work out the discounts for an order. Pure function (no database) so it is easy to test.
 * @returns {{ freeMealDiscount, pointsUsed, pointsDiscount, discount }}
 */
function calculateDiscounts({ lines, subtotal, usePoints = 0, useFreeMeal = false, availablePoints = 0, freeMeals = 0, settings }) {
  let freeMealDiscount = 0;
  if (useFreeMeal && freeMeals > 0 && lines.length) {
    const priciest = Math.max(...lines.map(l => l.unitPrice));
    freeMealDiscount = round2(Math.min(priciest, settings.freeMealCap));
  }
  const remaining = round2(subtotal - freeMealDiscount);
  const maxPointsByValue = Math.floor(remaining / settings.pointValue + 1e-9);
  const pointsUsed = Math.max(0, Math.min(Math.floor(usePoints), availablePoints, maxPointsByValue));
  const pointsDiscount = round2(pointsUsed * settings.pointValue);
  return { freeMealDiscount, pointsUsed, pointsDiscount, discount: round2(freeMealDiscount + pointsDiscount) };
}

const pointsEarned = (amountPaid, settings) => Math.floor(amountPaid / settings.randsPerPoint + 1e-9);

/** True when this order count completes a free-meal cycle (e.g. the 10th, 20th… order). */
const earnsFreeMeal = (orderCount, settings) => orderCount > 0 && orderCount % settings.freeMealEvery === 0;

module.exports = { calculateDiscounts, pointsEarned, earnsFreeMeal };
