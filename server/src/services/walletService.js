// Wallet top-ups and credit repayments. Owner: Liyabona (business logic).
const { withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const { round2 } = require('../utils/money');
const walletRepo = require('../repositories/walletRepository');

async function getSummary(userId) {
  await walletRepo.markOverdue();
  const [wallet, credit, transactions] = await Promise.all([
    walletRepo.getWallet(userId), walletRepo.getCredit(userId), walletRepo.listTransactions(userId),
  ]);
  if (!wallet) throw AppError.forbidden('Wallet and credit are only available to student accounts');
  return { wallet, credit: credit && { ...credit, available: round2(credit.limit - credit.outstanding) }, transactions };
}

// Card top-up is simulated; a payment gateway would confirm the charge first.
async function topUp(userId, amount) {
  return withTransaction(async client => {
    const wallet = await walletRepo.getWalletForUpdate(userId, client);
    if (!wallet) throw AppError.forbidden('Only student accounts have a wallet');
    const updated = await walletRepo.adjustWallet(userId, amount, client, true);
    await walletRepo.addTransaction(userId, 'TOP_UP', amount, 'Wallet top-up · Card', client);
    return { balance: updated.balance };
  });
}

async function repayCredit(userId, { amount, source }) {
  return withTransaction(async client => {
    const account = await walletRepo.getCreditForUpdate(userId, client);
    if (!account) throw AppError.forbidden('You do not have a student credit account');
    if (account.outstanding_balance <= 0) throw AppError.conflict('You have nothing to repay');
    if (amount > account.outstanding_balance) {
      throw AppError.badRequest(`You only owe R${account.outstanding_balance.toFixed(2)}`);
    }
    if (source === 'WALLET') {
      const wallet = await walletRepo.getWalletForUpdate(userId, client);
      if (wallet.balance < amount) throw AppError.unprocessable('Not enough wallet balance for this repayment');
      await walletRepo.adjustWallet(userId, -amount, client);
    }
    await walletRepo.markOverdue(client);
    const updated = await walletRepo.adjustCredit(userId, -amount, client);
    if (updated.outstanding === 0) {
      // Settled: overdue accounts become active again (suspended ones stay suspended until the admin lifts it)
      await client.query(`UPDATE credit_accounts SET status = 'ACTIVE' WHERE user_id = $1 AND status = 'OVERDUE'`, [userId]);
    }
    await walletRepo.addTransaction(userId, 'CREDIT_REPAYMENT', amount,
      `Credit repayment · ${source === 'WALLET' ? 'Wallet' : 'Card'}`, client);
    return { outstanding: updated.outstanding };
  });
}

module.exports = { getSummary, topUp, repayCredit };
