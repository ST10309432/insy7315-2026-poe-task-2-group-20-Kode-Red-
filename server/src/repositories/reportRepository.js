// Reporting queries (dashboard + reports). Owner: Boipelo.
const { query } = require('../config/db');

module.exports = {
  todaySummary: () =>
    query(`SELECT
        COALESCE(SUM(total) FILTER (WHERE status <> 'CANCELLED'), 0) AS "salesToday",
        COUNT(*) FILTER (WHERE status <> 'CANCELLED')::int AS "ordersToday",
        (SELECT COUNT(*)::int FROM orders WHERE status IN ('PLACED','ACCEPTED','PREPARING','READY')) AS "inQueue",
        (SELECT COALESCE(SUM(outstanding_balance), 0) FROM credit_accounts) AS "creditOwed",
        (SELECT COUNT(*)::int FROM users WHERE role = 'STUDENT' AND verified = FALSE) AS "pendingVerifications"
      FROM orders WHERE created_at >= date_trunc('day', NOW())`).then(r => r.rows[0]),

  salesByDay: (days = 7) =>
    query(`SELECT to_char(d, 'YYYY-MM-DD') AS date, to_char(d, 'Dy') AS label,
             COALESCE(SUM(o.total), 0) AS sales, COUNT(o.order_id)::int AS orders
           FROM generate_series(date_trunc('day', NOW()) - ($1::int - 1) * INTERVAL '1 day', date_trunc('day', NOW()), INTERVAL '1 day') d
           LEFT JOIN orders o ON date_trunc('day', o.created_at) = d AND o.status <> 'CANCELLED'
           GROUP BY d ORDER BY d`, [days]).then(r => r.rows),

  topSellers: (days = 7, limit = 5) =>
    query(`SELECT oi.item_name AS name, SUM(oi.quantity)::int AS sold, SUM(oi.line_total) AS revenue
           FROM order_items oi JOIN orders o ON o.order_id = oi.order_id
           WHERE o.status <> 'CANCELLED' AND o.created_at >= NOW() - ($1::int * INTERVAL '1 day')
           GROUP BY oi.item_name ORDER BY revenue DESC LIMIT $2`, [days, limit]).then(r => r.rows),

  ratingSummary: () =>
    query(`SELECT ROUND(AVG(rating), 1)::float AS average, COUNT(*)::int AS count FROM reviews`).then(r => r.rows[0]),

  paymentMix: (days = 7) =>
    query(`SELECT p.method, COUNT(*)::int AS count, SUM(p.amount) AS amount
           FROM payments p JOIN orders o ON o.order_id = p.order_id
           WHERE o.status <> 'CANCELLED' AND o.created_at >= NOW() - ($1::int * INTERVAL '1 day')
           GROUP BY p.method ORDER BY amount DESC`, [days]).then(r => r.rows),
};
