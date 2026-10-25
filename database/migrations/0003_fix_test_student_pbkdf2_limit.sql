-- R-FIT V2 | Ajusta somente a conta de demonstração para o limite do Workers.
-- A implementação WebCrypto do Cloudflare Workers rejeita PBKDF2 acima de 100.000 iterações.
UPDATE users
SET password_hash = 'pbkdf2-sha256$100000$sw3dEOogeU2NljZRXMjp0w$lW5ef0D19dDgxcFWlT_FbfGGAyxwgSiUYNQlNJMGpjA'
WHERE id = 'student-test-rfit-v2'
  AND email = 'aluno@rfit.com.br'
  AND role = 'student'
  AND status = 'active';
