// Account security rules. Owner: Molemo (security).
// Pure functions (no database), so they are easy to unit test.
const AppError = require('../utils/AppError');

const MAX_FAILED_LOGINS = 5;   // wrong passwords before the account locks
const LOCK_MINUTES = 15;       // how long the lock lasts
const IDLE_MINUTES = 30;       // NFR-21: log out after 30 minutes without activity

/** True while the account is locked. */
function isLocked(user, now = new Date()) {
  return Boolean(user && user.locked_until && new Date(user.locked_until) > now);
}

/** Whole minutes left on a lock (at least 1, so we never say "0 minutes"). */
function minutesLeft(lockedUntil, now = new Date()) {
  return Math.max(1, Math.ceil((new Date(lockedUntil) - now) / 60000));
}

/**
 * Work out the new failed-login count after a wrong password.
 * An expired lock starts the count again from zero.
 * @returns {{ failedLogins: number, lockedUntil: Date|null }}
 */
function nextFailure(user, now = new Date()) {
  const lockExpired = user.locked_until && new Date(user.locked_until) <= now;
  const failedLogins = (lockExpired ? 0 : user.failed_logins || 0) + 1;
  const lockedUntil = failedLogins >= MAX_FAILED_LOGINS ? new Date(now.getTime() + LOCK_MINUTES * 60000) : null;
  return { failedLogins, lockedUntil };
}

/** 423 Locked, with a message the login screen can show. */
function lockedError(lockedUntil, now = new Date()) {
  const mins = minutesLeft(lockedUntil, now);
  return new AppError(423, `Too many failed attempts. Your account is locked for ${mins} more minute${mins === 1 ? '' : 's'}.`);
}

module.exports = { MAX_FAILED_LOGINS, LOCK_MINUTES, IDLE_MINUTES, isLocked, minutesLeft, nextFailure, lockedError };
