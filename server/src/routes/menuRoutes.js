const router = require('express').Router();
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const s = require('../validation/schemas');
const menuService = require('../services/menuService');

const staff = [requireAuth, requireRole('ADMIN', 'VENDOR')];
const admin = [requireAuth, requireRole('ADMIN')];

// GET /api/menu?category=KOTA  (public)
router.get('/', validate(s.menuQuery, 'query'), async (req, res) => {
  res.json({ data: await menuService.list({ category: req.validQuery.category }) });
});

// GET /api/menu/:id  (public)
router.get('/:id', validate(s.idParam, 'params'), async (req, res) => {
  res.json({ data: await menuService.getItem(req.params.id) });
});

// POST /api/menu  (admin)  -> 201
router.post('/', ...admin, validate(s.menuItem), async (req, res) => {
  const item = await menuService.saveItem(null, req.body);
  res.status(201).location(`/api/menu/${item.id}`).json({ data: item });
});

// PUT /api/menu/:id  (admin) — full update incl. price and sale price
router.put('/:id', ...admin, validate(s.idParam, 'params'), validate(s.menuItem), async (req, res) => {
  res.json({ data: await menuService.saveItem(req.params.id, req.body) });
});

// PATCH /api/menu/:id/availability  (vendor or admin) — mark sold out for the day
router.patch('/:id/availability', ...staff, validate(s.idParam, 'params'), validate(s.availability), async (req, res) => {
  res.json({ data: await menuService.setAvailability(req.params.id, req.body.available) });
});

// DELETE /api/menu/:id  (admin)  -> 204
router.delete('/:id', ...admin, validate(s.idParam, 'params'), async (req, res) => {
  await menuService.deleteItem(req.params.id);
  res.status(204).end();
});

module.exports = router;
