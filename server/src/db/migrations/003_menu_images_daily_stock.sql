-- Migration 003: menu photos (FR-02) and daily sold-out reset (vendor user story:
-- "flag menu items as unavailable for the remainder of the day").

DROP TABLE IF EXISTS menu_images CASCADE;

-- Set when a vendor marks an item sold out for today; the item comes back automatically the next day.
-- available = FALSE with sold_out_on NULL means "unavailable until the admin turns it back on".
ALTER TABLE menu_items ADD COLUMN sold_out_on DATE;

-- Photos live in their own table so menu queries stay light. Stored in Postgres because
-- Render's free disk is wiped on every deploy. Max 1 MB each (the app resizes before upload).
CREATE TABLE menu_images (
  item_id     INTEGER PRIMARY KEY REFERENCES menu_items(item_id) ON DELETE CASCADE,
  mime        VARCHAR(20) NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
  data        BYTEA NOT NULL CHECK (octet_length(data) <= 1048576),
  etag        VARCHAR(64) NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_sold_out ON menu_items(sold_out_on) WHERE sold_out_on IS NOT NULL;
