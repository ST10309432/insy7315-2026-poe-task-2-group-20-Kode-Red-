// Menu item queries. Owner: Boipelo.
const { query } = require('../config/db');
const db = client => client || { query };

const ITEM = `m.item_id AS id, m.name, m.description, m.category, m.price, m.sale_price AS "salePrice",
  m.available, m.prep_minutes AS "prepMinutes",
  (SELECT ROUND(AVG(r.rating), 1)::float FROM reviews r
     WHERE r.order_id IN (SELECT oi.order_id FROM order_items oi WHERE oi.item_id = m.item_id)) AS rating,
  (SELECT COUNT(*)::int FROM reviews r
     WHERE r.order_id IN (SELECT oi.order_id FROM order_items oi WHERE oi.item_id = m.item_id)) AS "ratingCount",
  COALESCE(json_agg(json_build_object('id', e.extra_id, 'name', e.name, 'price', e.price) ORDER BY e.extra_id)
    FILTER (WHERE e.extra_id IS NOT NULL), '[]') AS extras`;

module.exports = {
  list: ({ category, includeUnavailable = true } = {}) => {
    const where = [];
    const params = [];
    if (category) { params.push(category); where.push(`m.category = $${params.length}`); }
    if (!includeUnavailable) where.push('m.available = TRUE');
    return query(`SELECT ${ITEM} FROM menu_items m LEFT JOIN menu_extras e ON e.item_id = m.item_id
                  ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                  GROUP BY m.item_id ORDER BY m.category, m.price`, params).then(r => r.rows);
  },

  findById: (id, client) =>
    db(client).query(`SELECT ${ITEM} FROM menu_items m LEFT JOIN menu_extras e ON e.item_id = m.item_id
                      WHERE m.item_id = $1 GROUP BY m.item_id`, [id]).then(r => r.rows[0]),

  findManyByIds: (ids, client) =>
    db(client).query(`SELECT ${ITEM} FROM menu_items m LEFT JOIN menu_extras e ON e.item_id = m.item_id
                      WHERE m.item_id = ANY($1::int[]) GROUP BY m.item_id`, [ids]).then(r => r.rows),

  create: (item, client) =>
    db(client).query(
      `INSERT INTO menu_items (name, description, category, price, sale_price, available, prep_minutes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING item_id AS id`,
      [item.name, item.description, item.category, item.price, item.salePrice ?? null, item.available, item.prepMinutes]
    ).then(r => r.rows[0]),

  update: (id, item, client) =>
    db(client).query(
      `UPDATE menu_items SET name=$2, description=$3, category=$4, price=$5, sale_price=$6, available=$7, prep_minutes=$8
       WHERE item_id = $1 RETURNING item_id AS id`,
      [id, item.name, item.description, item.category, item.price, item.salePrice ?? null, item.available, item.prepMinutes]
    ).then(r => r.rows[0]),

  replaceExtras: async (id, extras, client) => {
    await client.query(`DELETE FROM menu_extras WHERE item_id = $1`, [id]);
    for (const e of extras) {
      await client.query(`INSERT INTO menu_extras (item_id, name, price) VALUES ($1,$2,$3)`, [id, e.name, e.price]);
    }
  },

  setAvailability: (id, available) =>
    query(`UPDATE menu_items SET available = $2 WHERE item_id = $1 RETURNING item_id AS id, available`, [id, available])
      .then(r => r.rows[0]),

  remove: id => query(`DELETE FROM menu_items WHERE item_id = $1 RETURNING item_id`, [id]).then(r => r.rows[0]),

  hasOrders: id => query(`SELECT 1 FROM order_items WHERE item_id = $1 LIMIT 1`, [id]).then(r => r.rowCount > 0),
};
