-- Thabang Phala database schema (PostgreSQL)
-- Based on the Task 1 ERD. Owner: Boipelo (database). Money is NUMERIC(10,2).

DROP TABLE IF EXISTS wallet_transactions, payments, order_items, orders, menu_extras,
  menu_items, credit_accounts, wallets, users, truck_status, settings CASCADE;
DROP SEQUENCE IF EXISTS order_number_seq;

CREATE TABLE users (
  user_id         SERIAL PRIMARY KEY,
  full_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(150) NOT NULL UNIQUE,
  password_hash   VARCHAR(100) NOT NULL,
  role            VARCHAR(10)  NOT NULL DEFAULT 'GUEST'
                  CHECK (role IN ('STUDENT', 'GUEST', 'VENDOR', 'ADMIN')),
  student_number  VARCHAR(20)  UNIQUE,
  campus          VARCHAR(100),
  phone           VARCHAR(20),
  verified        BOOLEAN      NOT NULL DEFAULT FALSE,
  loyalty_points  INTEGER      NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT student_needs_number CHECK (role <> 'STUDENT' OR student_number IS NOT NULL)
);

CREATE TABLE wallets (
  wallet_id     SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  balance       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  last_top_up   TIMESTAMPTZ
);

CREATE TABLE credit_accounts (
  credit_id           SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  credit_limit        NUMERIC(10,2) NOT NULL DEFAULT 200 CHECK (credit_limit >= 0),
  outstanding_balance NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (outstanding_balance >= 0),
  due_date            DATE,
  status              VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'
                      CHECK (status IN ('ACTIVE', 'OVERDUE', 'SUSPENDED')),
  CONSTRAINT within_limit CHECK (outstanding_balance <= credit_limit)
);

CREATE TABLE menu_items (
  item_id       SERIAL PRIMARY KEY,
  name          VARCHAR(80)  NOT NULL UNIQUE,
  description   VARCHAR(255) NOT NULL DEFAULT '',
  category      VARCHAR(10)  NOT NULL CHECK (category IN ('KOTA', 'CHIPS', 'DRINK', 'COMBO')),
  price         NUMERIC(10,2) NOT NULL CHECK (price > 0),
  sale_price    NUMERIC(10,2) CHECK (sale_price IS NULL OR (sale_price > 0 AND sale_price < price)),
  available     BOOLEAN NOT NULL DEFAULT TRUE,
  prep_minutes  INTEGER NOT NULL DEFAULT 10 CHECK (prep_minutes > 0),
  rating        NUMERIC(2,1) NOT NULL DEFAULT 4.5 CHECK (rating BETWEEN 0 AND 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE menu_extras (
  extra_id  SERIAL PRIMARY KEY,
  item_id   INTEGER NOT NULL REFERENCES menu_items(item_id) ON DELETE CASCADE,
  name      VARCHAR(60) NOT NULL,
  price     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  UNIQUE (item_id, name)
);

CREATE SEQUENCE order_number_seq START 1001;

CREATE TABLE orders (
  order_id         SERIAL PRIMARY KEY,
  order_number     VARCHAR(12) NOT NULL UNIQUE DEFAULT ('TP-' || nextval('order_number_seq')),
  user_id          INTEGER NOT NULL REFERENCES users(user_id),
  collection_time  TIMESTAMPTZ NOT NULL,
  status           VARCHAR(10) NOT NULL DEFAULT 'PLACED'
                   CHECK (status IN ('PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'COLLECTED', 'CANCELLED')),
  subtotal         NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  service_fee      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (service_fee >= 0),
  total            NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  order_item_id  SERIAL PRIMARY KEY,
  order_id       INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  item_id        INTEGER NOT NULL REFERENCES menu_items(item_id),
  item_name      VARCHAR(80) NOT NULL,
  quantity       INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  unit_price     NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  extras         JSONB NOT NULL DEFAULT '[]',
  line_total     NUMERIC(10,2) NOT NULL CHECK (line_total >= 0)
);

CREATE TABLE payments (
  payment_id  SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL UNIQUE REFERENCES orders(order_id) ON DELETE CASCADE,
  method      VARCHAR(10) NOT NULL CHECK (method IN ('WALLET', 'CREDIT', 'CARD')),
  amount      NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity feed for the Wallet & Credit screen
CREATE TABLE wallet_transactions (
  tx_id        SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type         VARCHAR(16) NOT NULL
               CHECK (type IN ('TOP_UP', 'WALLET_PURCHASE', 'CREDIT_PURCHASE', 'CREDIT_REPAYMENT', 'REFUND')),
  amount       NUMERIC(10,2) NOT NULL CHECK (amount <> 0), -- signed: + top-ups/refunds, − purchases
  description  VARCHAR(120) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Single-row tables
CREATE TABLE truck_status (
  id             INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_open        BOOLEAN NOT NULL DEFAULT TRUE,
  location_name  VARCHAR(120) NOT NULL,
  latitude       NUMERIC(9,6),
  longitude      NUMERIC(9,6),
  hours          VARCHAR(120) NOT NULL,
  phone          VARCHAR(20),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE settings (
  id                    INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_credit_limit  NUMERIC(10,2) NOT NULL DEFAULT 200 CHECK (default_credit_limit >= 0),
  service_fee           NUMERIC(10,2) NOT NULL DEFAULT 2 CHECK (service_fee >= 0),
  rands_per_point       INTEGER NOT NULL DEFAULT 10 CHECK (rands_per_point > 0),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-maintain updated_at on orders, truck_status and settings
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_truck_status_updated_at
BEFORE UPDATE ON truck_status
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_settings_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- Indexes for common lookups
CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status) WHERE status NOT IN ('COLLECTED', 'CANCELLED');
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_menu_category ON menu_items(category);
CREATE INDEX idx_wallet_tx_user ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_menu_price ON menu_items(price);
CREATE INDEX idx_payments_created ON payments(created_at);
