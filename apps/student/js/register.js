/* R-FIT V2 | CADASTRO DE ALUNO */
import { registerStudent } from '../../shared/js/api-client.js';

const messages = {
  email_already_registered: 'Este e-mail já possui cadastro. Entre pela tela de login.',
  registration_invalid: 'Confira o nome, o e-mail, o celular com DDD e preencha a senha.',
  registration_failed: 'Não foi possível criar a conta agora. Tente novamente.',
  auth_not_configured: 'O servidor está sem configuração de autenticação.',
  origin_not_allowed: 'Origem não autorizada pelo servidor.'
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#student-register');
  const message = document.querySelector('#register-message');
  if (!form || !message) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const password = String(data.get('password') || '');
    const confirmation = String(data.get('confirm-password') || '');
    if (password !== confirmation) {
      message.textContent = 'As senhas não coincidem.';
      message.dataset.state = 'error';
      return;
    }
    button.disabled = true;
    message.textContent = 'Criando sua conta…';
    message.dataset.state = 'pending';
    try {
      await registerStudent(name, phone, email, password);
      message.textContent = 'Cadastro criado! Redirecionando para a escolha do plano…';
      message.dataset.state = 'success';
      // Cadastro não deve iniciar cobrança automaticamente.
      // Todo aluno recém-cadastrado passa primeiro pela escolha do plano.
      window.setTimeout(() => window.location.assign('/student/pages/plans.html'), 400);
    } catch (error) {
      const code = String(error?.message || 'registration_failed');
      message.textContent = error?.detail ? `Falha no servidor: ${error.detail}` : (messages[code] || 'Não foi possível concluir o cadastro. Tente novamente.');
      message.dataset.state = 'error';
      button.disabled = false;
    }
  });
});
