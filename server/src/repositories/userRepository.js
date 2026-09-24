// Data access for users, wallets and credit accounts. Owner: Boipelo.
const { query } = require('../config/db');

const PUBLIC_COLUMNS = `u.user_id AS id, u.full_name AS "fullName", u.email, u.role,
  u.student_number AS "studentNumber", u.campus, u.phone, u.verified,
  u.loyalty_points AS "loyaltyPoints", u.created_at AS "createdAt"`;

const db = client => client || { query };

module.exports = {
  findByEmail: (email, client) =>
    db(client).query(`SELECT * FROM users WHERE email = $1`, [email]).then(r => r.rows[0]),

  findById: (id, client) =>
    db(client).query(`SELECT ${PUBLIC_COLUMNS} FROM users u WHERE u.user_id = $1`, [id]).then(r => r.rows[0]),

  create: (u, client) =>
    db(client).query(
      `INSERT INTO users (full_name, email, password_hash, role, student_number, campus, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING user_id, role`,
      [u.fullName, u.email, u.passwordHash, u.role, u.studentNumber || null, u.campus || null, u.phone || null]
    ).then(r => r.rows[0]),

  update: (id, fields, client) =>
    db(client).query(
      `UPDATE users SET full_name = COALESCE($2, full_name), phone = COALESCE($3, phone),
         campus = COALESCE($4, campus) WHERE user_id = $1`,
      [id, fields.fullName ?? null, fields.phone ?? null, fields.campus ?? null]
    ),

  addLoyaltyPoints: (id, points, client) =>
    db(client).query(`UPDATE users SET loyalty_points = loyalty_points + $2 WHERE user_id = $1`, [id, points]),

  createWallet: (userId, client) =>
    db(client).query(`INSERT INTO wallets (user_id) VALUES ($1)`, [userId]),

  createCreditAccount: (userId, limit, client) =>
    db(client).query(
      `INSERT INTO credit_accounts (user_id, credit_limit, due_date)
       VALUES ($1, $2, date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day')`, [userId, limit]),

  listStudents: () =>
    query(`SELECT ${PUBLIC_COLUMNS}, c.credit_limit AS "creditLimit", c.outstanding_balance AS "outstanding",
             c.status AS "creditStatus", w.balance AS "walletBalance"
           FROM users u
           LEFT JOIN credit_accounts c ON c.user_id = u.user_id
           LEFT JOIN wallets w ON w.user_id = u.user_id
           WHERE u.role = 'STUDENT'
           ORDER BY u.verified, u.full_name`).then(r => r.rows),

  setVerified: (id, verified) =>
    query(`UPDATE users SET verified = $2 WHERE user_id = $1 AND role = 'STUDENT' RETURNING user_id`, [id, verified])
      .then(r => r.rows[0]),
};
