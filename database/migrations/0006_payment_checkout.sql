-- R-Fit: metadados do checkout e vínculo seguro de pagamentos.
CREATE TABLE IF NOT EXISTS payment_checkouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  plan_id TEXT NOT NULL REFERENCES plans(id),
  subscription_id TEXT REFERENCES subscriptions(id),
  provider_preference_id TEXT,
  provider_payment_id TEXT,
  method TEXT NOT NULL CHECK(method IN ('pix','card')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled','refunded')),
  checkout_url TEXT,
  pix_qr_base64 TEXT,
  pix_copy_paste TEXT,
  amount_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_checkouts_user_status ON payment_checkouts(user_id,status);
CREATE INDEX IF NOT EXISTS idx_payment_checkouts_provider_payment ON payment_checkouts(provider_payment_id);
INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0006_payment_checkout');
