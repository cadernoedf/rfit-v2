/* R-FIT V2 | PÁGINA PROTEGIDA DO ALUNO */
import { getCurrentUser, logout } from '../../shared/js/api-client.js';
document.addEventListener('DOMContentLoaded', async () => {
  const welcome = document.querySelector('#student-welcome');
  try {
    const result = await getCurrentUser();
    if (result.user.role !== 'student') { window.location.replace('/professor/'); return; }
    welcome.textContent = `Olá, ${result.user.name || result.user.email}. Seu acesso está ativo.`;
  } catch { window.location.replace('/student/'); return; }
  document.querySelector('#logout')?.addEventListener('click', async () => { await logout(); window.location.replace('/student/'); });
});