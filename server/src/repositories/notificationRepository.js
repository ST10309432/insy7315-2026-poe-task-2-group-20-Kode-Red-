// In-app notifications. Owner: Boipelo (database) / Tadi (API).
const { query } = require('../config/db');
const db = client => client || { query };

module.exports = {
  create: (userId, n, client) =>
    db(client).query(`INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1,$2,$3,$4,$5)`,
      [userId, n.type, n.title, n.body || '', n.link || null]),

  createMany: (userIds, n, client) =>
    db(client).query(`INSERT INTO notifications (user_id, type, title, body, link)
                      SELECT unnest($1::int[]), $2, $3, $4, $5`, [userIds, n.type, n.title, n.body || '', n.link || null]),

  list: (userId, limit = 30) =>
    query(`SELECT notification_id AS id, type, title, body, link, is_read AS "isRead", created_at AS "createdAt"
           FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, [userId, limit]).then(r => r.rows),

  unreadCount: userId =>
    query(`SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND is_read = FALSE`, [userId]).then(r => r.rows[0].n),

  markRead: (userId, id) =>
    query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND notification_id = $2 RETURNING notification_id`, [userId, id])
      .then(r => r.rows[0]),

  markAllRead: userId => query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`, [userId]),
};
