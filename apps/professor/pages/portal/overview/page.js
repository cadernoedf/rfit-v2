/* ==========================================================================
   R-FIT | PORTAL DO PROFESSOR
   Página: Visão geral
   Fonte dos indicadores: API administrativa / banco D1
   ========================================================================== */
import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';

/* ===== IDENTIFICAÇÃO ===== */
const $ = (selector) => document.querySelector(selector);
const formatNumber = (value) => new Intl.NumberFormat('pt-BR').format(Number(value || 0));

/* ===== CARTÕES DE INDICADORES ===== */
function createMetric(metric) {
  const card = document.createElement('a');
  card.className = 'overview-metric-card overview-tone-' + metric.tone;
  card.href = metric.href;
  const top = document.createElement('div');
  top.className = 'overview-metric-top';
  const label = document.createElement('span');
  label.textContent = metric.label;
  const icon = document.createElement('span');
  icon.className = 'overview-metric-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = metric.icon;
  top.append(label, icon);
  const value = document.createElement('strong');
  value.className = 'overview-metric-value';
  value.textContent = formatNumber(metric.value);
  const detail = document.createElement('small');
  detail.textContent = metric.detail;
  card.append(top, value, detail);
  return card;
}

/* ===== LISTA DE PENDÊNCIAS ===== */
function renderPriorities(data) {
  const target = $('#overview-priorities');
  target.replaceChildren();
  const items = [
    { label: 'Cadastros aguardando análise', value: data.students?.pending },
    { label: 'Pagamentos pendentes', value: data.subscriptions?.pending_payment },
    { label: 'Anamneses não preenchidas', value: data.anamnesis_pending }
  ].filter((item) => Number(item.value || 0) > 0);

  if (!items.length) {
    const row = document.createElement('div');
    row.className = 'overview-all-clear';
    const check = document.createElement('span');
    check.textContent = '✓';
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = 'Nenhuma pendência nesses indicadores';
    const note = document.createElement('small');
    note.textContent = 'Os dados consultados estão em dia.';
    copy.append(title, note);
    row.append(check, copy);
    target.append(row);
    return;
  }

  items.forEach((item) => {
    const row = document.createElement('a');
    row.className = 'overview-priority';
    row.href = '../students/index.html';
    const copy = document.createElement('span');
    copy.className = 'overview-priority-copy';
    const title = document.createElement('strong');
    title.textContent = item.label;
    const link = document.createElement('small');
    link.textContent = 'Consultar alunos';
    copy.append(title, link);
    const count = document.createElement('b');
    count.textContent = formatNumber(item.value);
    row.append(copy, count);
    target.append(row);
  });
}

/* ===== CONSULTA DOS DADOS REAIS ===== */
async function loadOverview() {
  const summary = $('#overview-summary');
  const message = $('#page-message');
  try {
    const response = await fetch('/api/professor/overview', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'overview_unavailable');

    const students = data.students || {};
    const plans = data.plans || {};
    const subscriptions = data.subscriptions || {};
    const metrics = [
      { label: 'Alunos cadastrados', value: students.total, detail: 'Total de contas de alunos', icon: '♙', tone: 'default' },
      { label: 'Alunos ativos', value: students.active, detail: 'Com status ativo', icon: '✓', tone: 'success' },
      { label: 'Cadastros pendentes', value: students.pending, detail: 'Aguardando acompanhamento', icon: '…', tone: 'warning' },
      { label: 'Alunos suspensos', value: students.suspended, detail: 'Com acesso suspenso', icon: 'Ⅱ', tone: 'muted' },
      { label: 'Planos ativos', value: plans.total, detail: 'Disponíveis na consultoria', icon: '▤', tone: 'default' },
      { label: 'Assinaturas ativas', value: subscriptions.active, detail: 'Com status ativo', icon: '◆', tone: 'success' },
      { label: 'Pagamentos pendentes', value: subscriptions.pending_payment, detail: 'Aguardando confirmação', icon: 'R$', tone: 'warning' },
      { label: 'Anamneses pendentes', value: data.anamnesis_pending, detail: 'Ainda não preenchidas', icon: '☷', tone: 'warning' }
    ];

    summary.replaceChildren();
    metrics.forEach((metric) => summary.append(createMetric({ ...metric, href: '../students/index.html' })));
    renderPriorities(data);
    $('#overview-updated').textContent = 'Dados atualizados agora';
    message.textContent = 'Indicadores carregados com sucesso.';
    message.dataset.state = 'success';
  } catch (error) {
    summary.replaceChildren();
    const failure = document.createElement('div');
    failure.className = 'overview-loading overview-error';
    failure.textContent = 'Não foi possível carregar os indicadores. Atualize a página ou tente novamente mais tarde.';
    summary.append(failure);
    $('#overview-priorities').textContent = 'As pendências não puderam ser consultadas.';
    message.textContent = 'Falha ao consultar os dados administrativos.';
    message.dataset.state = 'error';
    console.error('rfit_professor_overview_failed', error);
  }
}

/* ===== INICIALIZAÇÃO E SESSÃO ===== */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const auth = await getCurrentUser();
    if (!['professor', 'admin'].includes(auth.user.role)) {
      location.replace('/student/dashboard.html');
      return;
    }
    $('#professor-welcome').textContent = 'Olá, ' + (auth.user.name || auth.user.email) + '.';
    await loadOverview();
  } catch (error) {
    location.replace('/student/pages/login.html');
    return;
  }

  $('#logout')?.addEventListener('click', async () => {
    try {
      await logout();
    } finally {
      location.replace('/student/pages/login.html');
    }
  });
});
