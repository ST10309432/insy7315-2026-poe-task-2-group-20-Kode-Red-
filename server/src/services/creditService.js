// Student Credit rules (Task 1 §6). Owner: Liyabona (business logic).
const { round2 } = require('../utils/money');

const BLOCKING_STATUSES = ['OVERDUE', 'SUSPENDED'];

/** Credit still available to spend. */
function availableCredit(account) {
  return round2(account.credit_limit - account.outstanding_balance);
}

/**
 * Task 1 §6.1 rule: outstanding + order total must not exceed the credit limit,
 * and overdue or suspended accounts cannot borrow.
 */
function canBorrow(account, amount) {
  if (!account) return { ok: false, reason: 'You do not have a student credit account' };
  if (BLOCKING_STATUSES.includes(account.status)) {
    return { ok: false, reason: `Your credit account is ${account.status.toLowerCase()}. Please settle it first.` };
  }
  const available = availableCredit(account);
  if (amount > available) return { ok: false, reason: `Only R${available.toFixed(2)} credit available`, available };
  return { ok: true, available };
}

/**
 * Task 1 §6.2 credit states shown to students and Thabang:
 * ACTIVE (within limit), AT_LIMIT (nothing left to spend), OVERDUE, SUSPENDED.
 */
function creditState(account) {
  if (!account) return null;
  if (BLOCKING_STATUSES.includes(account.status)) return account.status;
  return availableCredit(account) <= 0 ? 'AT_LIMIT' : 'ACTIVE';
}

module.exports = { BLOCKING_STATUSES, availableCredit, canBorrow, creditState };