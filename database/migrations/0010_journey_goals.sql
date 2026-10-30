-- Metas pessoais e conquistas automáticas da jornada do aluno.
CREATE TABLE IF NOT EXISTS student_journey_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric TEXT NOT NULL CHECK(metric IN ('weight','waist','body_fat','fitness','custom')),
  title TEXT NOT NULL,
  start_value REAL,
  target_value REAL,
  unit TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','paused')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_journey_goals_user_status ON student_journey_goals(user_id,status,created_at DESC);
INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0010_journey_goals');
