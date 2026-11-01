-- Adiciona hidratação opcional ao check-in diário sem alterar registros anteriores.
ALTER TABLE daily_checkins ADD COLUMN water_liters REAL;
INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0020_daily_checkin_hydration');
