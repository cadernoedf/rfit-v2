CREATE TABLE IF NOT EXISTS student_daily_checkins (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_date TEXT NOT NULL,
  weight_kg REAL,
  sleep_quality INTEGER NOT NULL,
  energy INTEGER NOT NULL,
  appetite INTEGER NOT NULL,
  training_adherence INTEGER NOT NULL,
  nutrition_adherence INTEGER NOT NULL,
  discomfort INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, checkin_date)
);
CREATE INDEX IF NOT EXISTS idx_student_daily_checkins_student_date ON student_daily_checkins(student_id, checkin_date DESC);
