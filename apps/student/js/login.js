/* R-FIT V2 | PÁGINA DE LOGIN DO ALUNO */
import { loginStudent } from '../../shared/js/api-client.js';
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#student-login');
  const message = document.querySelector('#login-message');
  if (!form || !message) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true; message.textContent = 'Verificando acesso…'; message.dataset.state = 'pending';
    try {
      const data = new FormData(form);
      const result = await loginStudent(String(data.get('email') || ''), String(data.get('password') || ''));
      message.textContent = 'Acesso confirmado.'; message.dataset.state = 'success';
      window.location.assign(result.redirect);
    } catch (error) {
      message.textContent = error.message === 'invalid_credentials' ? 'E-mail ou senha incorretos.' : 'Não foi possível entrar. Tente novamente.';
      message.dataset.state = 'error'; button.disabled = false;
    }
  });
});