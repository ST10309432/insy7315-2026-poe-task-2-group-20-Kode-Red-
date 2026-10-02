// Order reviews (FR-13). Owner: Boipelo (database) / Tadi (API).
const { query } = require('../config/db');

module.exports = {
  create: (orderId, userId, rating, comment) =>
    query(`INSERT INTO reviews (order_id, user_id, rating, comment) VALUES ($1,$2,$3,$4)
           RETURNING rating, comment, created_at AS "createdAt"`, [orderId, userId, rating, comment]).then(r => r.rows[0]),

  // Public list: first name + surname initial only (POPIA — no full names or emails)
  latest: (limit = 6) =>
    query(`SELECT r.rating, r.comment, r.created_at AS "createdAt",
             split_part(u.full_name, ' ', 1) || COALESCE(' ' || left(NULLIF(split_part(u.full_name, ' ', 2), ''), 1) || '.', '') AS name,
             (SELECT string_agg(oi.item_name, ', ' ORDER BY oi.order_item_id) FROM order_items oi WHERE oi.order_id = r.order_id) AS items
           FROM reviews r JOIN users u ON u.user_id = r.user_id
           WHERE r.comment <> '' ORDER BY r.created_at DESC LIMIT $1`, [limit]).then(r => r.rows),
};
