-- ============================================================================
-- R-FIT V2 | MIGRAÇÃO 0002 — CONTA DE TESTE DO ALUNO
-- Cria somente a conta de demonstração solicitada.
-- A senha não é armazenada em texto puro; hash PBKDF2-SHA256 com 310.000 iterações.
-- Trocar/remover essa conta antes de disponibilizar o portal publicamente.
-- Banco alvo: rfit-v2-db / binding RFIT_DB. Nunca executar no banco legado.
-- ============================================================================

INSERT OR IGNORE INTO users
  (id, email, password_hash, full_name, role, email_verified_at, status)
VALUES
  ('student-test-rfit-v2', 'aluno@rfit.com.br',
   'pbkdf2-sha256$310000$sw3dEOogeU2NljZRXMjp0w$EAKkTvKY45RtdvMfrfElIIes01VG4tocFhyJL4-gBnk',
   'Aluno de Teste', 'student', CURRENT_TIMESTAMP, 'active');

INSERT OR IGNORE INTO student_profiles (user_id)
VALUES ('student-test-rfit-v2');

INSERT OR IGNORE INTO schema_migrations(version)
VALUES ('0002_test_student_account');
