/* ==========================================================================
   R-FIT V2 | CLIENTE HTTP DO PORTAL DO ALUNO
   01. Base de API same-origin
   02. Login e sessão
   Todas as chamadas HTTP do portal ficam centralizadas aqui.
   ========================================================================== */

const API_BASE_URL = '';

/* POST /auth/student/login — valida credenciais no servidor e cria cookie HttpOnly. */
export async function loginStudent(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/student/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({ email, password })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'login_failed');
  return result;
}

/* GET /api/auth/me — retorna somente os dados básicos da sessão atual. */
export async function getCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('unauthenticated');
  return response.json();
}
