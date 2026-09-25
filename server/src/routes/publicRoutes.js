// Public, read-only endpoints used by the marketing site and checkout.
const router = require('express').Router();
const validate = require('../middleware/validate');
const s = require('../validation/schemas');
const settingsRepo = require('../repositories/settingsRepository');
const reviewService = require('../services/reviewService');

// GET /api/settings/public  -> service fee and loyalty rules shown at checkout
router.get('/settings/public', async (req, res) => {
  const { serviceFee, randsPerPoint, pointValue, freeMealEvery, freeMealCap } = await settingsRepo.getSettings();
  res.json({ data: { serviceFee, randsPerPoint, pointValue, freeMealEvery, freeMealCap } });
});

// GET /api/reviews?limit=6  -> latest real reviews + average rating (FR-13)
router.get('/reviews', validate(s.reviewsQuery, 'query'), async (req, res) => {
  res.json({ data: await reviewService.publicReviews(req.validQuery.limit) });
});

module.exports = router;
