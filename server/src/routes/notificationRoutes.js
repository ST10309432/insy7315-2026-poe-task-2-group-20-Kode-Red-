const router = require('express').Router();
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const s = require('../validation/schemas');
const AppError = require('../utils/AppError');
const repo = require('../repositories/notificationRepository');

router.use(requireAuth);

// GET /api/notifications  -> latest notifications + unread count (FR-14, FR-27)
router.get('/', async (req, res) => {
  const [items, unread] = await Promise.all([repo.list(req.user.id), repo.unreadCount(req.user.id)]);
  res.json({ data: { items, unread } });
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res) => {
  await repo.markAllRead(req.user.id);
  res.json({ data: { unread: 0 } });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', validate(s.notificationParam, 'params'), async (req, res) => {
  if (!(await repo.markRead(req.user.id, req.params.id))) throw AppError.notFound('Notification not found');
  res.json({ data: { id: req.params.id, isRead: true } });
});

module.exports = router;
