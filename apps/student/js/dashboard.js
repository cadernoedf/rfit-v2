/* R-FIT V2 | DASHBOARD DO ALUNO
   Consulta a sessão validada pelo servidor e oferece logout. */
import { getCurrentUser } from './api-client.js';

document.addEventListener('DOMContentLoaded', async () => {
  const welcome = document.querySelector('#student-welcome');
  try {
    const result = await getCurrentUser();
    if (result.user.role !== 'student') {
      window.location.replace('/professor/');
      return;
    }
    welcome.textContent = `Olá, ${result.user.name || result.user.email}. Seu acesso está ativo.`;
  } catch {
    window.location.replace('/student/');
    return;
  }

  document.querySelector('#logout')?.addEventListener('click', async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.replace('/student/');
  });
});
