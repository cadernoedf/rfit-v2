/* R-FIT V2 | FINALIZAÇÃO DO CADASTRO VIA GOOGLE */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#google-complete-form');
  const message = document.querySelector('#google-complete-message');
  if (!form || !message) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const phone = String(new FormData(form).get('phone') || '').trim();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) {
      message.textContent = 'Informe um celular válido com DDD.';
      message.dataset.state = 'error';
      return;
    }
    button.disabled = true;
    message.textContent = 'Salvando cadastro…';
    message.dataset.state = 'pending';
    try {
      const response = await fetch('/auth/student/google-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ phone })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'registration_failed');
      message.textContent = 'Cadastro concluído. Abrindo os planos…';
      message.dataset.state = 'success';
      window.location.assign(result.redirect || '/student/pages/portal/plan/index.html');
    } catch (error) {
      message.textContent = error.message === 'unauthenticated'
        ? 'Sua sessão expirou. Volte ao login e entre com o Google novamente.'
        : 'Não foi possível concluir o cadastro. Tente novamente.';
      message.dataset.state = 'error';
      button.disabled = false;
    }
  });
});