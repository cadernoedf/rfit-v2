/* R-FIT V2 | CLIENTE HTTP COMPARTILHADO
   Centraliza chamadas para API. Base relativa mantém compatibilidade com domínio futuro. */
const API_BASE_URL = '';
export async function loginStudent(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/student/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin', cache: 'no-store', body: JSON.stringify({ email, password })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'login_failed');
  return result;
}
export async function getCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: { Accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store'
  });
  if (!response.ok) throw new Error('unauthenticated');
  return response.json();
}
export async function logout() {
  await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'same-origin', cache: 'no-store' });
}
export async function registerStudent(name, phone, email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/student/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin', cache: 'no-store', body: JSON.stringify({ name, phone, email, password })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'registration_failed');
  return result;
}
