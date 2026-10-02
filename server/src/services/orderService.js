// Order placement and lifecycle. Owner: Liyabona (business logic).
const { withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const { round2 } = require('../utils/money');
const menuRepo = require('../repositories/menuRepository');
const orderRepo = require('../repositories/orderRepository');
const userRepo = require('../repositories/userRepository');
const settingsRepo = require('../repositories/settingsRepository');
const { getStrategy } = require('./paymentStrategies');
const loyalty = require('./loyaltyService');
const notify = require('./notificationService');

// Task 1 §7.2 state diagram
const TRANSITIONS = {
  PLACED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'READY', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['COLLECTED'],
  COLLECTED: [],
  CANCELLED: [],
};

const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

/** Price every line on the server from the database — never trust prices from the browser. */
function priceLines(requested, menuItems) {
  const byId = new Map(menuItems.map(m => [m.id, m]));
  return requested.map(line => {
    const item = byId.get(line.itemId);
    if (!item) throw AppError.badRequest(`Menu item ${line.itemId} does not exist`);
    if (!item.available) throw AppError.conflict(`${item.name} is sold out today`, { itemId: item.id });
    const extras = (line.extraIds || []).map(id => {
      const extra = item.extras.find(e => e.id === id);
      if (!extra) throw AppError.badRequest(`Extra ${id} is not available for ${item.name}`);
      return { id: extra.id, name: extra.name, price: extra.price };
    });
    const unitPrice = round2((item.salePrice ?? item.price) + extras.reduce((s, e) => s + e.price, 0));
    return { itemId: item.id, name: item.name, quantity: line.quantity, extras, unitPrice,
      lineTotal: round2(unitPrice * line.quantity), prepMinutes: item.prepMinutes };
  });
}

function resolveCollectionTime(requested, lines) {
  const prep = Math.max(...lines.map(l => l.prepMinutes));
  const earliest = new Date(Date.now() + prep * 60 * 1000);
  if (!requested || requested === 'ASAP') return earliest;
  const when = new Date(requested);
  if (when < new Date(Date.now() - 60 * 1000)) throw AppError.badRequest('Collection time is in the past');
  if (when - Date.now() > 12 * 60 * 60 * 1000) throw AppError.badRequest('Collection time must be within 12 hours');
  return when < earliest ? earliest : when;
}

async function placeOrder(userId, { items, paymentMethod, collectionTime, usePoints = 0, useFreeMeal = false }) {
  const user = await userRepo.findById(userId);
  if (!user) throw AppError.unauthorized();
  const strategy = getStrategy(paymentMethod);
  if (strategy.studentOnly && user.role !== 'STUDENT') {
    throw AppError.forbidden('Wallet and Student Credit are only for registered students. Please pay by card.');
  }
  if (strategy.requiresVerifiedStudent && !user.verified) {
    throw AppError.forbidden('Your student number is still being verified. Student Credit unlocks once Thabang approves you.');
  }

  return withTransaction(async client => {
    await menuRepo.resetDailySoldOut(client);
    const menuItems = await menuRepo.findManyByIds([...new Set(items.map(i => i.itemId))], client);
    const lines = priceLines(items, menuItems);
    const settings = await settingsRepo.getSettings(client);
    const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));

    // Loyalty: lock the user's points so they can't be spent twice
    const balance = await userRepo.getLoyaltyForUpdate(userId, client);
    if (useFreeMeal && balance.free_meals < 1) throw AppError.conflict('You have no free meals to use yet');
    if (usePoints > balance.loyalty_points) throw AppError.conflict(`You only have ${balance.loyalty_points} points`);
    const d = loyalty.calculateDiscounts({ lines, subtotal, usePoints, useFreeMeal,
      availablePoints: balance.loyalty_points, freeMeals: balance.free_meals, settings });
    const total = round2(Math.max(0, subtotal + settings.serviceFee - d.discount));

    const order = await orderRepo.create({ userId, collectionTime: resolveCollectionTime(collectionTime, lines),
      subtotal, serviceFee: settings.serviceFee, discount: d.discount, total,
      pointsRedeemed: d.pointsUsed, freeMealUsed: d.freeMealDiscount > 0 }, client);
    for (const line of lines) await orderRepo.addItem(order.id, line, client);

    // Throws (and rolls back the whole order) if the wallet/credit check fails
    await strategy.charge({ user, amount: total, orderNumber: order.orderNumber, client });
    await orderRepo.addPayment(order.id, strategy.method, total, client);

    // Spend redeemed rewards, then earn new ones on what was actually paid
    if (d.pointsUsed) await userRepo.addLoyaltyPoints(userId, -d.pointsUsed, client);
    if (d.freeMealDiscount > 0) await userRepo.addFreeMeals(userId, -1, client);
    const earned = loyalty.pointsEarned(total, settings);
    if (earned > 0) await userRepo.addLoyaltyPoints(userId, earned, client);
    const freeMealEarned = loyalty.earnsFreeMeal(await userRepo.countActiveOrders(userId, client), settings);
    if (freeMealEarned) {
      await userRepo.addFreeMeals(userId, 1, client);
      await notify.freeMealEarned(userId, client);
    }
    await orderRepo.setRewards(order.id, earned, freeMealEarned, client);

    const full = await orderRepo.findByNumber(order.orderNumber, client);
    await notify.orderStatus(userId, full.orderNumber, 'PLACED', client);
    await notify.newOrderForStaff(full, client);
    return full;
  });
}

async function getOrder(orderNumber, requester) {
  const order = await orderRepo.findByNumber(orderNumber);
  if (!order) throw AppError.notFound(`Order ${orderNumber} not found`);
  const isStaff = ['ADMIN', 'VENDOR'].includes(requester.role);
  if (!isStaff && order.userId !== requester.id) throw AppError.notFound(`Order ${orderNumber} not found`);
  return order;
}

/** Staff move an order through the lifecycle; students may only cancel their own PLACED orders. */
async function changeStatus(orderNumber, nextStatus, requester) {
  return withTransaction(async client => {
    const order = await orderRepo.findByNumberForUpdate(orderNumber, client);
    if (!order) throw AppError.notFound(`Order ${orderNumber} not found`);
    const isStaff = ['ADMIN', 'VENDOR'].includes(requester.role);
    if (!isStaff) {
      if (order.user_id !== requester.id) throw AppError.notFound(`Order ${orderNumber} not found`);
      if (nextStatus !== 'CANCELLED') throw AppError.forbidden();
      if (order.status !== 'PLACED') throw AppError.conflict('This order has already been accepted and can no longer be cancelled');
    }
    if (!canTransition(order.status, nextStatus)) {
      throw AppError.conflict(`Cannot move an order from ${order.status} to ${nextStatus}`,
        { allowed: TRANSITIONS[order.status] });
    }
    if (nextStatus === 'CANCELLED') {
      if (order.method) await getStrategy(order.method).refund({ userId: order.user_id, amount: order.total, orderNumber, client });
      // Give back redeemed rewards and take back what this order earned
      const pointsDelta = order.points_redeemed - order.points_earned;
      if (pointsDelta) await userRepo.addLoyaltyPoints(order.user_id, pointsDelta, client);
      const mealsDelta = (order.free_meal_used ? 1 : 0) - (order.free_meal_earned ? 1 : 0);
      if (mealsDelta) await userRepo.addFreeMeals(order.user_id, mealsDelta, client);
    }
    await orderRepo.setStatus(order.order_id, nextStatus, client);
    // Tell the student (skip when they cancelled it themselves)
    if (isStaff) await notify.orderStatus(order.user_id, orderNumber, nextStatus, client);
    return orderRepo.findByNumber(orderNumber, client);
  });
}

module.exports = { placeOrder, getOrder, changeStatus, priceLines, canTransition, TRANSITIONS,
  listMine: userId => orderRepo.listForUser(userId),
  listQueue: activeOnly => orderRepo.listQueue({ activeOnly }) };
