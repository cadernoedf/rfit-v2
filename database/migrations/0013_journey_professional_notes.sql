-- Comentários do personal na jornada do aluno.
CREATE TABLE IF NOT EXISTS student_journey_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL REFERENCES users(id),
  note TEXT NOT NULL CHECK(length(note) BETWEEN 1 AND 1200),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_journey_notes_student_date ON student_journey_notes(user_id,created_at DESC);
INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0013_journey_professional_notes');
