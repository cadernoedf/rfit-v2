-- R-FIT: configurações persistentes da consultoria
CREATE TABLE IF NOT EXISTS portal_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO portal_settings(setting_key,setting_value) VALUES
 ('consultancy_name','R-Fit'),
 ('login_title','Seu próximo nível começa aqui.'),
 ('login_message','Entre para acessar seu espaço no R-Fit.'),
 ('registration_enabled','true'),
 ('maintenance_mode','false');
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0004_admin_settings');
