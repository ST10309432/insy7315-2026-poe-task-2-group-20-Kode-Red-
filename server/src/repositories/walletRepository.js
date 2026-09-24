// Wallet, credit and transaction history queries. Owner: Boipelo.
const { query } = require('../config/db');
const db = client => client || { query };

module.exports = {
  // FOR UPDATE locks the row inside a transaction so two orders can't spend the same money
  getWalletForUpdate: (userId, client) =>
    client.query(`SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE`, [userId]).then(r => r.rows[0]),

  getCreditForUpdate: (userId, client) =>
    client.query(`SELECT * FROM credit_accounts WHERE user_id = $1 FOR UPDATE`, [userId]).then(r => r.rows[0]),

  getWallet: userId =>
    query(`SELECT balance, last_top_up AS "lastTopUp" FROM wallets WHERE user_id = $1`, [userId]).then(r => r.rows[0]),

  getCredit: userId =>
    query(`SELECT credit_limit AS "limit", outstanding_balance AS "outstanding", due_date AS "dueDate", status
           FROM credit_accounts WHERE user_id = $1`, [userId]).then(r => r.rows[0]),

  adjustWallet: (userId, delta, client, isTopUp = false) =>
    db(client).query(
      `UPDATE wallets SET balance = balance + $2 ${isTopUp ? ', last_top_up = NOW()' : ''}
       WHERE user_id = $1 RETURNING balance`, [userId, delta]).then(r => r.rows[0]),

  adjustCredit: (userId, delta, client) =>
    db(client).query(
      `UPDATE credit_accounts SET outstanding_balance = outstanding_balance + $2
       WHERE user_id = $1 RETURNING outstanding_balance AS outstanding`, [userId, delta]).then(r => r.rows[0]),

  setCreditLimit: (userId, limit) =>
    query(`UPDATE credit_accounts SET credit_limit = $2 WHERE user_id = $1 RETURNING credit_limit AS "limit"`,
      [userId, limit]).then(r => r.rows[0]),

  addTransaction: (userId, type, amount, description, client) =>
    db(client).query(`INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1,$2,$3,$4)`,
      [userId, type, amount, description]),

  listTransactions: (userId, limit = 20) =>
    query(`SELECT tx_id AS id, type, amount, description, created_at AS "createdAt"
           FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, [userId, limit])
      .then(r => r.rows),
};
