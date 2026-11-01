-- R-FIT | Avaliação física avançada para assinaturas Premium.
CREATE TABLE IF NOT EXISTS advanced_assessments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measured_at TEXT NOT NULL,
  weight_kg REAL, height_cm REAL, neck_cm REAL, shoulder_cm REAL, chest_cm REAL,
  waist_cm REAL, abdomen_cm REAL, hip_cm REAL,
  right_arm_cm REAL, left_arm_cm REAL, right_forearm_cm REAL, left_forearm_cm REAL,
  right_thigh_cm REAL, left_thigh_cm REAL, right_calf_cm REAL, left_calf_cm REAL,
  skinfold_protocol TEXT, skinfolds_json TEXT, body_density REAL, body_fat_pct REAL,
  fat_mass_kg REAL, lean_mass_kg REAL, bmi REAL, waist_height_ratio REAL,
  notes TEXT, created_by TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_advanced_assessments_user_date ON advanced_assessments(user_id, measured_at, created_at);
INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0016_advanced_assessments');
