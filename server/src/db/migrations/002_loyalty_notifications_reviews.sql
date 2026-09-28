-- Migration 002: loyalty redemption, notifications and reviews.
-- Runs after schema.sql. Kept separate so it doesn't conflict with schema.sql changes.
-- Covers FR-07 / LP-01..LP-05 (loyalty), FR-13 (reviews), FR-14 / FR-27 (notifications).

DROP TABLE IF EXISTS notifications, reviews CASCADE;

-- Menu ratings are now calculated from real reviews instead of a stored number
ALTER TABLE menu_items DROP COLUMN IF EXISTS rating;

-- Loyalty: free meals earned (LP-02) and what each order used/earned
ALTER TABLE users
  ADD COLUMN free_meals INTEGER NOT NULL DEFAULT 0 CHECK (free_meals >= 0);

ALTER TABLE orders
  ADD COLUMN discount         NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  ADD COLUMN points_redeemed  INTEGER NOT NULL DEFAULT 0 CHECK (points_redeemed >= 0),
  ADD COLUMN points_earned    INTEGER NOT NULL DEFAULT 0 CHECK (points_earned >= 0),
  ADD COLUMN free_meal_used   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN free_meal_earned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE settings
  ADD COLUMN point_value     NUMERIC(10,2) NOT NULL DEFAULT 0.50 CHECK (point_value > 0),
  ADD COLUMN free_meal_every INTEGER NOT NULL DEFAULT 10 CHECK (free_meal_every > 0),
  ADD COLUMN free_meal_cap   NUMERIC(10,2) NOT NULL DEFAULT 60 CHECK (free_meal_cap > 0);

-- In-app notifications (order confirmed / ready, new order for staff, etc.)
CREATE TABLE notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type            VARCHAR(20) NOT NULL,
  title           VARCHAR(100) NOT NULL,
  body            VARCHAR(255) NOT NULL DEFAULT '',
  link            VARCHAR(120),
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One review per collected order
CREATE TABLE reviews (
  review_id   SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL UNIQUE REFERENCES orders(order_id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     VARCHAR(300) NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);
CREATE INDEX idx_reviews_user ON reviews(user_id);
