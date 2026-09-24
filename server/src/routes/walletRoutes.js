const router = require('express').Router();
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const s = require('../validation/schemas');
const walletService = require('../services/walletService');

router.use(requireAuth, requireRole('STUDENT'));

// GET /api/wallet  -> wallet balance, credit account and recent activity
router.get('/', async (req, res) => {
  res.json({ data: await walletService.getSummary(req.user.id) });
});

// POST /api/wallet/top-up  -> load money into the wallet (FR-16)
router.post('/top-up', validate(s.topUp), async (req, res) => {
  res.json({ data: await walletService.topUp(req.user.id, req.body.amount) });
});

// POST /api/wallet/repay  -> repay student credit (FR-08)
router.post('/repay', validate(s.repay), async (req, res) => {
  res.json({ data: await walletService.repayCredit(req.user.id, req.body) });
});

module.exports = router;
