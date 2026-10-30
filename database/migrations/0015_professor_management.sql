-- R-FIT | Gestão financeira, avisos e cobrança programada.
-- A data de cobrança é registrada como previsão; a cobrança automática exige provedor recorrente configurado.
ALTER TABLE subscriptions ADD COLUMN billing_starts_at TEXT;
ALTER TABLE subscriptions ADD COLUMN billing_cycle TEXT NOT NULL DEFAULT 'monthly';

CREATE TABLE IF NOT EXISTS portal_announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all' CHECK(audience IN ('all','selected')),
  target_user_ids_json TEXT NOT NULL DEFAULT '[]',
  starts_at TEXT,
  ends_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  require_acknowledgement INTEGER NOT NULL DEFAULT 0 CHECK(require_acknowledgement IN (0,1)),
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_portal_announcements_active_dates
  ON portal_announcements(is_active,starts_at,ends_at);

CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id TEXT NOT NULL REFERENCES portal_announcements(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(announcement_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id,read_at);
INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0015_professor_management');
