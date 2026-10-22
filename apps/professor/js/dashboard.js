/* R-FIT V2 | PÁGINA PROTEGIDA DO PROFESSOR */
import { getCurrentUser, logout } from '../../shared/js/api-client.js';
document.addEventListener('DOMContentLoaded', async () => {
  const welcome = document.querySelector('#professor-welcome');
  try {
    const result = await getCurrentUser();
    if (!['professor', 'admin'].includes(result.user?.role)) { window.location.replace('/student/pages/dashboard.html'); return; }
    welcome.textContent = `Acesso autorizado: ${result.user.name || result.user.email}.`;
  } catch { window.location.replace('/student/'); return; }
  document.querySelector('#professor-logout')?.addEventListener('click', async () => { await logout(); window.location.replace('/student/'); });
});