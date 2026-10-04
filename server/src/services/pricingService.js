// Pricing rules: line prices, order totals and collection times.
// Owner: Liyabona (business logic). Prices always come from the database, never from the browser.
const AppError = require('../utils/AppError');
const { round2 } = require('../utils/money');

const MAX_ADVANCE_HOURS = 12; // students can order up to 12 hours ahead

/** Unit price of an item: sale price when it is on special, otherwise the normal price. */
function unitPriceOf(item) {
  return item.salePrice != null && item.salePrice > 0 ? item.salePrice : item.price;
}

/**
 * Price every requested line from the menu.
 * @param {{itemId:number, quantity:number, extraIds?:number[]}[]} requested
 * @param {object[]} menuItems  items from menuRepository.findManyByIds (with extras)
 */
function priceLines(requested, menuItems) {
  if (!Array.isArray(requested) || requested.length === 0) {
    throw AppError.badRequest('Your order must contain at least one item');
  }
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

    const unitPrice = round2(unitPriceOf(item) + extras.reduce((sum, e) => sum + e.price, 0));
    return {
      itemId: item.id, name: item.name, quantity: line.quantity, extras, unitPrice,
      lineTotal: round2(unitPrice * line.quantity), prepMinutes: item.prepMinutes,
    };
  });
}

/** Subtotal, service fee, discount and total for an order. The total never goes below R0. */
function calculateTotals(lines, serviceFee, discount = 0) {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const total = round2(Math.max(0, subtotal + serviceFee - discount));
  return { subtotal, serviceFee, discount, total };
}

/**
 * Work out when the order can be collected.
 * 'ASAP' (or nothing) = as soon as the slowest item is ready.
 * A requested time earlier than that is moved to the earliest possible time.
 */
function resolveCollectionTime(requested, lines, now = Date.now()) {
  const prep = Math.max(...lines.map(l => l.prepMinutes));
  const earliest = new Date(now + prep * 60 * 1000);
  if (!requested || requested === 'ASAP') return earliest;

  const when = new Date(requested);
  if (Number.isNaN(when.getTime())) throw AppError.badRequest('Collection time is not a valid date');
  if (when < new Date(now - 60 * 1000)) throw AppError.badRequest('Collection time is in the past');
  if (when - now > MAX_ADVANCE_HOURS * 60 * 60 * 1000) {
    throw AppError.badRequest(`Collection time must be within ${MAX_ADVANCE_HOURS} hours`);
  }
  return when < earliest ? earliest : when;
}

module.exports = { unitPriceOf, priceLines, calculateTotals, resolveCollectionTime, MAX_ADVANCE_HOURS };