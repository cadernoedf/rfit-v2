-- Mensagens privadas entre cada aluno e a equipe de professor.
CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  student_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK(sender_role IN ('student','professor','admin')),
  body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 3000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_support_messages_student_created
  ON support_messages(student_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_unread
  ON support_messages(student_user_id, sender_role, read_at);
INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0014_private_support_messages');
