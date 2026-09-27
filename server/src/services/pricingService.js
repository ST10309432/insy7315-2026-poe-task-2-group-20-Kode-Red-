

export const SERVICE_FEE = 2.0; // R2 flat service fee per order (team decision)

export function calculateOrderTotal(lineItemsInput, menuLookup, extrasLookup) {
  if (!Array.isArray(lineItemsInput) || lineItemsInput.length === 0) {
    throw new PricingError('Order must contain at least one item.');
  }

  let subtotal = 0;
  let extrasTotal = 0;
  const lineBreakdown = [];

  for (const rawLine of lineItemsInput) {
    const quantity = Number(rawLine.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new PricingError(`Invalid quantity for item ${rawLine.menuItemId}.`);
    }

    const menuItem = menuLookup.get(rawLine.menuItemId);
    if (!menuItem) {
      throw new PricingError(`Menu item ${rawLine.menuItemId} does not exist.`);
    }
    if (menuItem.isAvailable === false) {
      throw new PricingError(`"${menuItem.name || menuItem.id}" is currently unavailable.`);
    }

    // Use the sale price when the item is on special, otherwise normal price.
    const unitPrice = typeof menuItem.salePrice === 'number' && menuItem.salePrice > 0
      ? menuItem.salePrice
      : menuItem.price;

    const itemTotal = round2(unitPrice * quantity);
    subtotal = round2(subtotal + itemTotal);

    let lineExtrasTotal = 0;
    const extraIds = rawLine.extraIds || [];
    for (const extraId of extraIds) {
      const extra = extrasLookup.get(extraId);
      if (!extra) {
        throw new PricingError(`Extra ${extraId} does not exist.`);
      }
      const extraLineTotal = round2(extra.price * quantity);
      lineExtrasTotal = round2(lineExtrasTotal + extraLineTotal);
    }
    extrasTotal = round2(extrasTotal + lineExtrasTotal);

    lineBreakdown.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity,
      unitPrice,
      extraIds,
      lineTotal: round2(itemTotal + lineExtrasTotal),
    });
  }

  const total = round2(subtotal + extrasTotal + SERVICE_FEE);

  return {
    lineItems: lineBreakdown,
    subtotal,
    extrasTotal,
    serviceFee: SERVICE_FEE,
    total,
  };
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export class PricingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PricingError';
    this.statusCode = 400;
  }
}
