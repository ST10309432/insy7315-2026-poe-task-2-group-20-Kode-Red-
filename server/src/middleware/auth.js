// Authentication & authorisation. Owner: Molemo (security) — extend/harden here.
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');

function signToken(user) {
  return jwt.sign({ sub: user.user_id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

/** Requires a valid "Authorization: Bearer <token>" header. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(AppError.unauthorized());
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(AppError.unauthorized(err.name === 'TokenExpiredError'
      ? 'Your session has expired. Please log in again.'
      : 'Invalid session. Please log in again.'));
  }
}

/** Restricts a route to the given roles, e.g. requireRole('ADMIN', 'VENDOR'). */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(AppError.unauthorized());
  if (!roles.includes(req.user.role)) return next(AppError.forbidden());
  next();
};

module.exports = { signToken, requireAuth, requireRole };
