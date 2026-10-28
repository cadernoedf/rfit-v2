-- R-Fit: campos e fluxo de conclusão da anamnese do aluno.
CREATE INDEX IF NOT EXISTS idx_anamneses_user_completed ON anamneses(user_id,completed_at);
INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0007_anamnesis_flow');
