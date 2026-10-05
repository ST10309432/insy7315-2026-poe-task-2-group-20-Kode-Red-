-- Account security (Molemo): failed-login lockout and password-change tracking.
-- Safe to run more than once.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_logins INTEGER NOT NULL DEFAULT 0 CHECK (failed_logins >= 0),
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
