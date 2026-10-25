/* R-FIT | ÁREA DO ALUNO — navegação em telas independentes */
import { getCurrentUser, logout } from '../../shared/js/api-client.js';

document.addEventListener('DOMContentLoaded', async function () {
  const welcome = document.querySelector('#student-welcome');
  const message = document.querySelector('#student-message');
  try {
    const result = await getCurrentUser();
    const user = result.user;
    if (user.role !== 'student') { window.location.replace('/professor/'); return; }
    welcome.textContent = 'Olá, ' + (user.name || user.email) + '. Seu espaço de acompanhamento está pronto.';
    if (message) { message.textContent = 'Sua sessão está segura.'; message.dataset.state = 'success'; }
  } catch (error) {
    if (welcome) welcome.textContent = 'Não foi possível validar sua sessão.';
    if (message) { message.textContent = 'A sessão não foi reconhecida pelo servidor. Saia e entre novamente.'; message.dataset.state = 'error'; }
    console.error('student_session_validation_failed', error);
    return;
  }

  const buttons = document.querySelectorAll('[data-student-view]');
  const panels = document.querySelectorAll('[data-student-panel]');
  const title = document.querySelector('#student-page-title');
  const names = {home:'Meu painel',plan:'Meu plano',training:'Meu treino',diet:'Minha dieta',journey:'Minha jornada',progress:'Evolução',support:'Suporte'};
  function showView(view) {
    panels.forEach(function(panel) {
      const visible = panel.dataset.studentPanel === view;
      panel.hidden = !visible;
      panel.classList.toggle('is-visible', visible);
    });
    buttons.forEach(function(button) {
      const active = button.dataset.studentView === view;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    if (title) {
      title.textContent = names[view] || 'Meu painel';
      const dot = document.createElement('span'); dot.textContent='.'; title.appendChild(dot);
    }
  }
  buttons.forEach(function(button) {
    button.addEventListener('click', function() { showView(button.dataset.studentView); });
  });
  showView('home');

  document.querySelector('#logout')?.addEventListener('click', async function() {
    const button=this; button.disabled=true;
    try { await logout(); } finally { window.location.replace('/student/pages/login.html'); }
  });
});
