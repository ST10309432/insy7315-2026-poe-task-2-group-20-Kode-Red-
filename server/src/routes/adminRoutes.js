const router = require('express').Router();
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const s = require('../validation/schemas');
const AppError = require('../utils/AppError');
const userRepo = require('../repositories/userRepository');
const walletRepo = require('../repositories/walletRepository');
const settingsRepo = require('../repositories/settingsRepository');
const reportService = require('../services/reportService');
const orderRepo = require('../repositories/orderRepository');
const notify = require('../services/notificationService');
const { sendCsv } = require('../utils/csv');

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
  await walletRepo.markOverdue();
  res.json({ data: await userRepo.listStudents() });
});

// GET /api/admin/students/export.csv  -> customer data export (FR-28)
router.get('/students/export.csv', adminOnly, async (req, res) => {
  sendCsv(res, `thabang-phala-customers-${new Date().toISOString().slice(0, 10)}.csv`, await userRepo.exportCustomers());
});

// GET /api/admin/reports/export.csv?days=30  -> sales report (FR-26)
router.get('/reports/export.csv', adminOnly, validate(s.reportQuery, 'query'), async (req, res) => {
  const days = req.validQuery.days;
  sendCsv(res, `thabang-phala-sales-${days}d-${new Date().toISOString().slice(0, 10)}.csv`, await orderRepo.exportRows(days));
});

// PATCH /api/admin/students/:id/credit-status  -> suspend or re-activate a student's credit
router.patch('/students/:id/credit-status', adminOnly, validate(s.idParam, 'params'), validate(s.creditStatus), async (req, res) => {
  const updated = await walletRepo.setCreditStatus(req.params.id, req.body.status);
  if (!updated) throw AppError.notFound('Student credit account not found');
  res.json({ data: updated });
});

// PATCH /api/admin/students/:id/verify  -> approve student for credit (FR-19)
router.patch('/students/:id/verify', adminOnly, validate(s.idParam, 'params'), validate(s.verify), async (req, res) => {
  const updated = await userRepo.setVerified(req.params.id, req.body.verified);
  if (!updated) throw AppError.notFound('Student not found');
  if (req.body.verified) await notify.studentVerified(req.params.id);
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
