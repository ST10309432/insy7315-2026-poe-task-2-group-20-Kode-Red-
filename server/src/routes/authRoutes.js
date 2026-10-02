const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const s = require('../validation/schemas');
const authService = require('../services/authService');
const userRepo = require('../repositories/userRepository');
const AppError = require('../utils/AppError');

// Slow down password guessing: 20 attempts per 15 minutes per IP
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: { message: 'Too many attempts. Please wait a few minutes and try again.' } } });

// POST /api/auth/register  -> 201 { data: { token, user } }
router.post('/register', authLimiter, validate(s.register), async (req, res) => {
  res.status(201).json({ data: await authService.register(req.body) });
});

// POST /api/auth/login  -> 200 { data: { token, user } }
router.post('/login', authLimiter, validate(s.login), async (req, res) => {
  res.json({ data: await authService.login(req.body) });
});

// GET /api/auth/me  -> current user
router.get('/me', requireAuth, async (req, res) => {
  const user = await userRepo.findById(req.user.id);
  if (!user) throw AppError.unauthorized();
  res.json({ data: user });
});

// PATCH /api/auth/me  -> update own details (FR-11)
router.patch('/me', requireAuth, validate(s.updateProfile), async (req, res) => {
  await userRepo.update(req.user.id, req.body);
  res.json({ data: await userRepo.findById(req.user.id) });
});

// POST /api/auth/me/student  -> guest adds a student number (becomes a student, pending verification)
router.post('/me/student', requireAuth, validate(s.becomeStudent), async (req, res) => {
  res.json({ data: await authService.becomeStudent(req.user.id, req.body) });
});

module.exports = router;
