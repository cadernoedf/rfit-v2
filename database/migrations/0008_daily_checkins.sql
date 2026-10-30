-- Check-in diário do aluno, com um registro por dia e atualização do envio do mesmo dia.
CREATE TABLE IF NOT EXISTS daily_checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_date TEXT NOT NULL DEFAULT (date('now')),
  weight_kg REAL,
  sleep_quality INTEGER NOT NULL CHECK(sleep_quality BETWEEN 1 AND 5),
  energy INTEGER NOT NULL CHECK(energy BETWEEN 1 AND 5),
  appetite INTEGER NOT NULL CHECK(appetite BETWEEN 1 AND 5),
  training_adherence INTEGER NOT NULL CHECK(training_adherence BETWEEN 0 AND 100),
  nutrition_adherence INTEGER NOT NULL CHECK(nutrition_adherence BETWEEN 0 AND 100),
  discomfort INTEGER NOT NULL DEFAULT 0 CHECK(discomfort IN (0,1)),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id,checkin_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date ON daily_checkins(user_id,checkin_date DESC);
INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0008_daily_checkins');
