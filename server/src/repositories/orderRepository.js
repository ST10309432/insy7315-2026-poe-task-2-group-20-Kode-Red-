// Order queries. Owner: Boipelo.
const { query } = require('../config/db');
const db = client => client || { query };

const ORDER = `o.order_id AS id, o.order_number AS "orderNumber", o.status, o.collection_time AS "collectionTime",
  o.subtotal, o.service_fee AS "serviceFee", o.total, o.created_at AS "createdAt", o.updated_at AS "updatedAt",
  o.user_id AS "userId", u.full_name AS "customerName", p.method AS "paymentMethod",
  COALESCE((SELECT json_agg(json_build_object('itemId', oi.item_id, 'name', oi.item_name, 'quantity', oi.quantity,
     'unitPrice', oi.unit_price, 'extras', oi.extras, 'lineTotal', oi.line_total) ORDER BY oi.order_item_id)
   FROM order_items oi WHERE oi.order_id = o.order_id), '[]') AS items`;
const FROM = `FROM orders o JOIN users u ON u.user_id = o.user_id LEFT JOIN payments p ON p.order_id = o.order_id`;

module.exports = {
  create: (o, client) =>
    client.query(
      `INSERT INTO orders (user_id, collection_time, subtotal, service_fee, total)
       VALUES ($1,$2,$3,$4,$5) RETURNING order_id AS id, order_number AS "orderNumber"`,
      [o.userId, o.collectionTime, o.subtotal, o.serviceFee, o.total]).then(r => r.rows[0]),

  addItem: (orderId, line, client) =>
    client.query(
      `INSERT INTO order_items (order_id, item_id, item_name, quantity, unit_price, extras, line_total)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [orderId, line.itemId, line.name, line.quantity, line.unitPrice, JSON.stringify(line.extras), line.lineTotal]),

  addPayment: (orderId, method, amount, client) =>
    client.query(`INSERT INTO payments (order_id, method, amount) VALUES ($1,$2,$3)`, [orderId, method, amount]),

  findByNumber: (orderNumber, client) =>
    db(client).query(`SELECT ${ORDER} ${FROM} WHERE o.order_number = $1`, [orderNumber]).then(r => r.rows[0]),

  findByNumberForUpdate: (orderNumber, client) =>
    client.query(`SELECT o.*, p.method FROM orders o LEFT JOIN payments p ON p.order_id = o.order_id
                  WHERE o.order_number = $1 FOR UPDATE OF o`, [orderNumber]).then(r => r.rows[0]),

  listForUser: userId =>
    query(`SELECT ${ORDER} ${FROM} WHERE o.user_id = $1 ORDER BY o.created_at DESC LIMIT 50`, [userId]).then(r => r.rows),

  listQueue: ({ activeOnly = true } = {}) =>
    query(`SELECT ${ORDER} ${FROM}
           WHERE ${activeOnly ? `o.status NOT IN ('COLLECTED','CANCELLED')` : `o.created_at >= date_trunc('day', NOW())`}
           ORDER BY o.collection_time ASC`).then(r => r.rows),

  setStatus: (orderId, status, client) =>
    db(client).query(`UPDATE orders SET status = $2, updated_at = NOW() WHERE order_id = $1`, [orderId, status]),
};
