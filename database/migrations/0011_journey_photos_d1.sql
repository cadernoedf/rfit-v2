-- Fotos privadas da jornada armazenadas como BLOB no D1 (sem R2).
-- O cliente comprime as imagens antes do envio; limite de 700 KiB por arquivo.
CREATE TABLE IF NOT EXISTS student_journey_photos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_blob BLOB NOT NULL,
  mime_type TEXT NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')),
  byte_size INTEGER NOT NULL CHECK(byte_size BETWEEN 1 AND 716800),
  photo_type TEXT NOT NULL DEFAULT 'progresso' CHECK(photo_type IN ('frente','lado','costas','progresso')),
  note TEXT NOT NULL DEFAULT '',
  taken_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_journey_photos_user_date ON student_journey_photos(user_id,taken_at DESC);
INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0011_journey_photos_d1');
