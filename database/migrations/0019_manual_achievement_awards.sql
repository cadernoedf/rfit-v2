-- R-Fit | Conquistas especiais concedidas manualmente pelo professor.
CREATE TABLE IF NOT EXISTS student_manual_achievement_awards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  message TEXT,
  xp INTEGER NOT NULL DEFAULT 0 CHECK(xp >= 0 AND xp <= 1000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_student_manual_awards_user ON student_manual_achievement_awards(user_id,created_at DESC);
INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0019_manual_achievement_awards');
