-- R-Fit | XP cumulativo e conquistas permanentes.
CREATE TABLE IF NOT EXISTS student_xp_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  xp INTEGER NOT NULL CHECK(xp > 0),
  source_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id,event_key)
);
CREATE INDEX IF NOT EXISTS idx_student_xp_events_user ON student_xp_events(user_id,created_at);
CREATE TABLE IF NOT EXISTS student_achievement_unlocks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_code TEXT NOT NULL,
  unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id,achievement_code)
);
CREATE INDEX IF NOT EXISTS idx_student_achievement_unlocks_user ON student_achievement_unlocks(user_id,unlocked_at DESC);
INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0018_cumulative_gamification');
