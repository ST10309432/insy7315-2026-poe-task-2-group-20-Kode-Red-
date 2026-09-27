

import { calculateOrderTotal } from './pricingService.js';
import { canBorrow } from './creditService.js';
import { getPaymentStrategy } from './paymentStrategies.js';
import { calculatePointsEarned, applyRedemption, getAvailablePoints } from './loyaltyService.js';

export const ORDER_STATUS = {
  PLACED: 'PLACED',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  COLLECTED: 'COLLECTED',
  CANCELLED: 'CANCELLED',
};

const ALLOWED_TRANSITIONS = {
  [ORDER_STATUS.PLACED]: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.PREPARING],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY],
  [ORDER_STATUS.READY]: [ORDER_STATUS.COLLECTED],
  [ORDER_STATUS.COLLECTED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

export async function createOrder(input, repos) {
  const { customerId, lineItems, collectionTime, paymentMethod, cardToken, redeemPoints = 0 } = input;

  if (!collectionTime) {
    const err = new Error('A collection time is required (FR-06).');
    err.statusCode = 400;
    throw err;
  }

  const [menuItems, extras, loyaltySettings] = await Promise.all([
    repos.menuRepository.getItemsByIds(lineItems.map((l) => l.menuItemId)),
    repos.menuRepository.getExtrasByIds(lineItems.flatMap((l) => l.extraIds || [])),
    repos.settingsRepository.getLoyaltySettings(),
  ]);
  const menuLookup = new Map(menuItems.map((item) => [item.id, item]));
  const extrasLookup = new Map(extras.map((extra) => [extra.id, extra]));

  const pricing = calculateOrderTotal(lineItems, menuLookup, extrasLookup);
  let amountDue = pricing.total;
  let redemption = null;

  if (redeemPoints > 0) {
    const ledger = await repos.loyaltyRepository.getLedger(customerId);
    const available = getAvailablePoints(ledger);
    redemption = applyRedemption(redeemPoints, available, pricing.total, loyaltySettings);
    amountDue = round2(Math.max(0, pricing.total - redemption.discount));
  }

  if (paymentMethod === 'CREDIT') {
    const [student, creditAccount] = await Promise.all([
      repos.studentRepository.getById(customerId),
      repos.creditRepository.getAccount(customerId),
    ]);
    const decision = canBorrow(student, creditAccount, amountDue);
    if (!decision.allowed) {
      const err = new Error(decision.reason);
      err.statusCode = 403;
      throw err;
    }
  }

  const strategy = getPaymentStrategy(paymentMethod);

  return repos.withTransaction(async (dbClient) => {
    const paymentReceipt = await strategy.pay({
      studentId: customerId,
      amount: amountDue,
      cardToken,
      repos,
      dbClient,
    });

    const order = await repos.orderRepository.create(
      {
        customerId,
        collectionTime,
        status: ORDER_STATUS.PLACED,
        lineItems: pricing.lineItems,
        subtotal: pricing.subtotal,
        extrasTotal: pricing.extrasTotal,
        serviceFee: pricing.serviceFee,
        total: pricing.total,
        amountPaid: amountDue,
        paymentMethod,
        pointsRedeemed: redemption ? redemption.pointsRedeemed : 0,
        loyaltyDiscount: redemption ? redemption.discount : 0,
      },
      dbClient,
    );

    // LP-01: award points for this purchase.
    const pointsEarned = calculatePointsEarned(loyaltySettings);
    if (pointsEarned > 0) {
      await repos.loyaltyRepository.addPoints(
        customerId,
        pointsEarned,
        { orderId: order.id, earnedAt: new Date() },
        dbClient,
      );
    }
    if (redemption && redemption.pointsRedeemed > 0) {
      await repos.loyaltyRepository.redeemPoints(customerId, redemption.pointsRedeemed, order.id, dbClient);
    }

    return {
      order,
      payment: paymentReceipt,
      pointsEarned,
      redemption: redemption
        ? { pointsRedeemed: redemption.pointsRedeemed, discount: redemption.discount }
        : { pointsRedeemed: 0, discount: 0 },
    };
  });
}


export async function transitionOrderStatus(orderId, newStatus, repos) {
  return repos.withTransaction(async (dbClient) => {
    const order = await repos.orderRepository.getById(orderId, dbClient);
    if (!order) {
      const err = new Error('Order not found.');
      err.statusCode = 404;
      throw err;
    }

    const allowedNext = ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowedNext.includes(newStatus)) {
      const err = new Error(`Cannot move order from ${order.status} to ${newStatus}.`);
      err.statusCode = 409;
      throw err;
    }

    if (newStatus === ORDER_STATUS.CANCELLED) {
      const strategy = getPaymentStrategy(order.paymentMethod);
      await strategy.refund({
        studentId: order.customerId,
        amount: order.amountPaid,
        gatewayReference: order.gatewayReference,
        repos,
        dbClient,
      });
      if (order.pointsEarned > 0) {
        await repos.loyaltyRepository.reversePoints(order.customerId, order.pointsEarned, order.id, dbClient);
      }
    }

    return repos.orderRepository.updateStatus(orderId, newStatus, dbClient);
  });
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
