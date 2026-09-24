const router = require('express').Router();
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const s = require('../validation/schemas');
const AppError = require('../utils/AppError');
const userRepo = require('../repositories/userRepository');
const walletRepo = require('../repositories/walletRepository');
const settingsRepo = require('../repositories/settingsRepository');
const reportService = require('../services/reportService');

router.use(requireAuth);
const adminOnly = requireRole('ADMIN');
const staff = requireRole('ADMIN', 'VENDOR');

// GET /api/admin/dashboard  -> today's figures (FR-16 admin)
router.get('/dashboard', staff, async (req, res) => {
  res.json({ data: await reportService.dashboard() });
});

// GET /api/admin/reports?days=7  -> sales, top sellers, credit owed (FR-25)
router.get('/reports', adminOnly, validate(s.reportQuery, 'query'), async (req, res) => {
  res.json({ data: await reportService.weekly(req.validQuery.days) });
});

// GET /api/admin/students  -> students with credit balances (FR-17, FR-24)
router.get('/students', adminOnly, async (req, res) => {
  res.json({ data: await userRepo.listStudents() });
});

// PATCH /api/admin/students/:id/verify  -> approve student for credit (FR-19)
router.patch('/students/:id/verify', adminOnly, validate(s.idParam, 'params'), validate(s.verify), async (req, res) => {
  const updated = await userRepo.setVerified(req.params.id, req.body.verified);
  if (!updated) throw AppError.notFound('Student not found');
  res.json({ data: { id: req.params.id, verified: req.body.verified } });
});

// PATCH /api/admin/students/:id/credit-limit  -> adjust one student's limit
router.patch('/students/:id/credit-limit', adminOnly, validate(s.idParam, 'params'), validate(s.creditLimit), async (req, res) => {
  const updated = await walletRepo.setCreditLimit(req.params.id, req.body.creditLimit);
  if (!updated) throw AppError.notFound('Student credit account not found');
  res.json({ data: updated });
});

// GET/PATCH /api/admin/settings  -> default credit limit, service fee, loyalty rate (FR-23)
router.get('/settings', adminOnly, async (req, res) => {
  res.json({ data: await settingsRepo.getSettings() });
});
router.patch('/settings', adminOnly, validate(s.settings), async (req, res) => {
  await settingsRepo.updateSettings(req.body);
  res.json({ data: await settingsRepo.getSettings() });
});

module.exports = router;
