
const DEFAULT_MAX_REDEMPTION_SHARE = 0.5;


export function calculatePointsEarned(settings) {
  return Math.max(0, Math.round(settings.pointsPerPurchase || 0));
}
export function getAvailablePoints(pointsLedger) {
  return pointsLedger.reduce((total, entry) => total + entry.points, 0);
}

export function getAvailableFreeMeals(purchaseCount, freeMealsClaimed, settings) {
  const threshold = settings.freeMealThreshold || 10;
  const milestonesReached = Math.floor(purchaseCount / threshold);
  return Math.max(0, milestonesReached - freeMealsClaimed);
}

export function applyRedemption(requestedPoints, availablePoints, orderTotal, settings) {
  if (requestedPoints <= 0) {
    return { pointsRedeemed: 0, discount: 0 };
  }
  if (requestedPoints > availablePoints) {
    throw new LoyaltyError('Not enough loyalty points available.');
  }

  const randPerPoint = settings.randPerPoint;
  const maxShare = settings.maxRedemptionShare ?? DEFAULT_MAX_REDEMPTION_SHARE;
  const maxDiscount = round2(orderTotal * maxShare);

  let discount = round2(requestedPoints * randPerPoint);
  let pointsRedeemed = requestedPoints;

  if (discount > maxDiscount) {
    discount = maxDiscount;
    pointsRedeemed = Math.floor(maxDiscount / randPerPoint);
  }

  return { pointsRedeemed, discount };
}

export function getLoyaltySummary(pointsLedger, purchaseCount, freeMealsClaimed, settings) {
  return {
    pointsBalance: getAvailablePoints(pointsLedger),
    purchaseCount,
    freeMealsAvailable: getAvailableFreeMeals(purchaseCount, freeMealsClaimed, settings),
  };
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export class LoyaltyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LoyaltyError';
    this.statusCode = 400;
  }
}
