const router = require('express').Router();
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const s = require('../validation/schemas');
const orderService = require('../services/orderService');

router.use(requireAuth);

// POST /api/orders  -> 201 order with order number (FR-06, FR-15, FR-17)
router.post('/', validate(s.placeOrder), async (req, res) => {
  const order = await orderService.placeOrder(req.user.id, req.body);
  res.status(201).location(`/api/orders/${order.orderNumber}`).json({ data: order });
});

// GET /api/orders/mine  -> order history (FR-12)
router.get('/mine', async (req, res) => {
  res.json({ data: await orderService.listMine(req.user.id) });
});

// GET /api/orders?scope=active|today  (vendor/admin) -> live queue (FR-18, FR-21)
router.get('/', requireRole('ADMIN', 'VENDOR'), validate(s.queueQuery, 'query'), async (req, res) => {
  res.json({ data: await orderService.listQueue(req.validQuery.scope === 'active') });
});

// GET /api/orders/:orderNumber  -> track one order
router.get('/:orderNumber', validate(s.orderNumberParam, 'params'), async (req, res) => {
  res.json({ data: await orderService.getOrder(req.params.orderNumber, req.user) });
});

// PATCH /api/orders/:orderNumber/status  -> staff move through lifecycle, students cancel (FR-22)
router.patch('/:orderNumber/status', validate(s.orderNumberParam, 'params'), validate(s.orderStatus), async (req, res) => {
  res.json({ data: await orderService.changeStatus(req.params.orderNumber, req.body.status, req.user) });
});

module.exports = router;
