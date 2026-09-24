// Strategy pattern (Task 1 §9.1): each payment method settles an order its own way,
// so the checkout logic never needs to know the details. Owner: Liyabona (business logic).
const AppError = require('../utils/AppError');
const walletRepo = require('../repositories/walletRepository');
const { round2 } = require('../utils/money');

/** Credit rule from Task 1 §6.2: outstanding + amount must not exceed the limit. */
function canBorrow(account, amount) {
  if (!account) return { ok: false, reason: 'You do not have a student credit account' };
  if (account.status !== 'ACTIVE') return { ok: false, reason: `Your credit account is ${account.status.toLowerCase()}. Please settle it first.` };
  const available = round2(account.credit_limit - account.outstanding_balance);
  if (amount > available) return { ok: false, reason: `Only R${available.toFixed(2)} credit available`, available };
  return { ok: true, available };
}

const WalletPayment = {
  method: 'WALLET',
  requiresVerifiedStudent: false,
  studentOnly: true,
  async charge({ user, amount, orderNumber, client }) {
    const wallet = await walletRepo.getWalletForUpdate(user.id, client);
    if (!wallet) throw AppError.unprocessable('You do not have a wallet. Only students can pay by wallet.');
    if (wallet.balance < amount) {
      throw AppError.unprocessable(`Not enough wallet balance (R${wallet.balance.toFixed(2)}). Top up or choose another method.`,
        { code: 'INSUFFICIENT_FUNDS', balance: wallet.balance });
    }
    await walletRepo.adjustWallet(user.id, -amount, client);
    await walletRepo.addTransaction(user.id, 'WALLET_PURCHASE', -amount, `Order ${orderNumber}`, client);
  },
  async refund({ userId, amount, orderNumber, client }) {
    await walletRepo.adjustWallet(userId, amount, client);
    await walletRepo.addTransaction(userId, 'REFUND', amount, `Refund · ${orderNumber}`, client);
  },
};

const CreditPayment = {
  method: 'CREDIT',
  requiresVerifiedStudent: true,
  studentOnly: true,
  async charge({ user, amount, orderNumber, client }) {
    const account = await walletRepo.getCreditForUpdate(user.id, client);
    const check = canBorrow(account, amount);
    if (!check.ok) throw AppError.unprocessable(check.reason, { code: 'CREDIT_DECLINED', available: check.available });
    await walletRepo.adjustCredit(user.id, amount, client);
    await walletRepo.addTransaction(user.id, 'CREDIT_PURCHASE', -amount, `Order ${orderNumber} · on credit`, client);
  },
  async refund({ userId, amount, orderNumber, client }) {
    await walletRepo.adjustCredit(userId, -amount, client);
    await walletRepo.addTransaction(userId, 'REFUND', amount, `Credit reversed · ${orderNumber}`, client);
  },
};

// Card payments are simulated — a real gateway (e.g. PayFast/Yoco) would be called here.
const CardPayment = {
  method: 'CARD',
  requiresVerifiedStudent: false,
  studentOnly: false,
  async charge() { /* gateway call would go here */ },
  async refund() { /* gateway refund would go here */ },
};

const strategies = { WALLET: WalletPayment, CREDIT: CreditPayment, CARD: CardPayment };

function getStrategy(method) {
  const strategy = strategies[method];
  if (!strategy) throw AppError.badRequest(`Unknown payment method: ${method}`);
  return strategy;
}

module.exports = { getStrategy, canBorrow, strategies };
