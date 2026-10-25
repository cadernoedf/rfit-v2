/* R-FIT | ÁREA DO ALUNO
   A sessão é validada pelo Worker; não confiar em dados de perfil no navegador. */
import { getCurrentUser, logout } from '../../shared/js/api-client.js';

document.addEventListener('DOMContentLoaded', async () => {
  const welcome = document.querySelector('#student-welcome');
  const message = document.querySelector('#student-message');
  try {
    const result = await getCurrentUser();
    const user = result.user;
    if (user.role !== 'student') {
      window.location.replace('/professor/');
      return;
    }
    welcome.textContent = 'Olá, ' + (user.name || user.email) + '. Seu espaço de acompanhamento está pronto.';
    message.textContent = 'Sua sessão está segura. Os próximos módulos serão liberados conforme o cadastro for integrado.';
    message.dataset.state = 'success';
  } catch (error) {
    if (welcome) welcome.textContent = 'Não foi possível validar sua sessão.';
    if (message) {
      message.textContent = 'A sessão não foi reconhecida pelo servidor. Saia e entre novamente. Se persistir, informe o código: student_session_validation_failed.';
      message.dataset.state = 'error';
    }
    console.error('student_session_validation_failed', error);
    return;
  }
  document.querySelector('#logout')?.addEventListener('click', async () => {
    const button = document.querySelector('#logout');
    button.disabled = true;
    try { await logout(); } finally { window.location.replace('/student/pages/login.html'); }
  });
});

document.addEventListener('DOMContentLoaded', function () {
  const buttons = document.querySelectorAll('[data-student-view]');
  const panels = document.querySelectorAll('[data-student-panel]');
  function showStudentView(view) {
    panels.forEach(function (panel) {
      panel.hidden = panel.dataset.studentPanel !== view;
      panel.classList.toggle('is-visible', !panel.hidden);
    });
    buttons.forEach(function (button) {
      const active = button.dataset.studentView === view;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }
  buttons.forEach(function (button) {
    button.addEventListener('click', function () { showStudentView(button.dataset.studentView); });
  });
  showStudentView('home');
});

/* Menu do aluno: telas independentes para treino, dieta e suporte. */
document.addEventListener('DOMContentLoaded', function () {
  const buttons = document.querySelectorAll('[data-student-view]');
  const panels = document.querySelectorAll('[data-student-panel]');
  function showStudentView(view) {
    panels.forEach(function (panel) {
      panel.hidden = panel.dataset.studentPanel !== view;
      panel.classList.toggle('is-visible', !panel.hidden);
    });
    buttons.forEach(function (button) {
      const active = button.dataset.studentView === view;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }
  buttons.forEach(function (button) {
    button.addEventListener('click', function () { showStudentView(button.dataset.studentView); });
  });
  showStudentView('home');
});
