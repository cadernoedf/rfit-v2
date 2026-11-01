-- R-FIT | Central de notificações in-app do aluno.
ALTER TABLE notifications ADD COLUMN read_at TEXT;
ALTER TABLE notifications ADD COLUMN dedupe_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_dedupe ON notifications(user_id,dedupe_key);
CREATE INDEX IF NOT EXISTS idx_notifications_in_app_user ON notifications(user_id,channel,status,created_at);
INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0017_in_app_notifications');
