/* R-FIT V2 | PÁGINA DE LOGIN DO ALUNO */
import { loginStudent } from '../../shared/js/api-client.js';

const errorMessages = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  auth_not_configured: 'O login está sem configuração no servidor. Avise o administrador.',
  auth_database_error: 'O servidor não conseguiu consultar o banco de dados. Código: auth_database_error.',
  origin_not_allowed: 'A origem desta página não foi autorizada pelo servidor.',
  invalid_json: 'Os dados enviados estão inválidos.',
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#student-login');
  const message = document.querySelector('#login-message');
  if (!form || !message) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    message.textContent = 'Verificando acesso…';
    message.dataset.state = 'pending';

    try {
      const data = new FormData(form);
      const result = await loginStudent(
        String(data.get('email') || ''),
        String(data.get('password') || '')
      );
      message.textContent = 'Acesso confirmado.';
      message.dataset.state = 'success';
      window.location.assign(result.redirect);
    } catch (error) {
      const code = String(error?.message || 'login_failed');
      message.textContent = errorMessages[code] || `Falha no login (código: ${code}). Tente novamente ou envie esse código ao administrador.`;
      message.dataset.state = 'error';
      button.disabled = false;
    }
  });
});
