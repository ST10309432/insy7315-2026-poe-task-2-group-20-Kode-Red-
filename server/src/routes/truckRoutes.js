const router = require('express').Router();
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const s = require('../validation/schemas');
const settingsRepo = require('../repositories/settingsRepository');

// GET /api/truck  (public) -> open/closed, location, hours (FR-01, FR-09, FR-10)
router.get('/', async (req, res) => {
  res.json({ data: await settingsRepo.getTruck() });
});

// PATCH /api/truck  (vendor/admin) -> update status/location (FR-19, FR-20 admin)
router.patch('/', requireAuth, requireRole('ADMIN', 'VENDOR'), validate(s.truck), async (req, res) => {
  await settingsRepo.updateTruck(req.body);
  res.json({ data: await settingsRepo.getTruck() });
});

module.exports = router;
