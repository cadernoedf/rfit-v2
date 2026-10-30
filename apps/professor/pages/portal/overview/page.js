import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';

const $ = (selector) => document.querySelector(selector);
const setText = (selector, value) => { const node = $(selector); if (node) node.textContent = String(value ?? 0); };

document.addEventListener('DOMContentLoaded', async () => {
  const message = $('#page-message');
  try {
    const auth = await getCurrentUser();
    if (!['professor', 'admin'].includes(auth.user?.role)) {
      location.replace('/student/dashboard.html');
      return;
    }
    $('#professor-welcome').textContent = 'Olá, ' + (auth.user.name || auth.user.email) + '.';

    const response = await fetch('/api/professor/overview', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'overview_unavailable');

    const students = data.students || {};
    const plans = data.plans || {};
    const subscriptions = data.subscriptions || {};
    const pending = Number(students.pending || 0);
    const payments = Number(subscriptions.pending_payment || 0);
    const anamnesis = Number(data.anamnesis_pending || 0);

    setText('#metric-students', students.total);
    setText('#metric-active', students.active);
    setText('#metric-pending', pending);
    setText('#metric-suspended', students.suspended);
    setText('#metric-plans', plans.total);
    setText('#metric-subscriptions', subscriptions.active);
    setText('#metric-payments', payments);
    setText('#metric-anamnesis', anamnesis);

    setText('#priority-pending', pending ? pending + ' cadastro(s) aguardando análise' : 'Nenhum cadastro pendente');
    setText('#priority-payments', payments ? payments + ' pagamento(s) aguardando confirmação' : 'Nenhum pagamento pendente');
    setText('#priority-anamnesis', anamnesis ? anamnesis + ' anamnese(s) para acompanhar' : 'Todas as anamneses estão em dia');

    $('#overview-updated').textContent = 'Dados atualizados agora';
    message.textContent = 'Indicadores atualizados a partir do banco R-Fit.';
    message.dataset.state = 'success';
  } catch (error) {
    $('#overview-updated').textContent = 'Não foi possível atualizar';
    message.textContent = 'Não foi possível carregar os indicadores. ' + (error.message || '');
    message.dataset.state = 'error';
  }

  $('#logout')?.addEventListener('click', async () => {
    try { await logout(); } finally { location.replace('/student/pages/login.html'); }
  });
});
