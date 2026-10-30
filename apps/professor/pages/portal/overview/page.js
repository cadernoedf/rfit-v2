/* ==========================================================================
   R-FIT | PORTAL DO PROFESSOR
   Página: Visão geral
   Dados: API administrativa / D1
   ========================================================================== */
import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';

/* ===== IDENTIFICAÇÃO ===== */
const $ = (selector) => document.querySelector(selector);
const formatNumber = (value) => new Intl.NumberFormat('pt-BR').format(Number(value || 0));

/* ===== COMPONENTES DE INDICADORES ===== */
function createMetric({ label, value, detail, icon, tone = 'default', href }) {
  const card = document.createElement(href ? 'a' : 'article');
  card.className = 'overview-metric-card overview-tone-' + tone;
  if (href) card.href = href;

  const top = document.createElement('div');
  top.className = 'overview-metric-top';
  const name = document.createElement('span');
  name.textContent = label;
  const symbol = document.createElement('span');
  symbol.className = 'overview-metric-icon';
  symbol.setAttribute('aria-hidden', 'true');
  symbol.textContent = icon;
  top.append(name, symbol);

  const number = document.createElement('strong');
  number.className = 'overview-metric-value';
  number.textContent = formatNumber(value);

  const note = document.createElement('small');
  note.textContent = detail;

  card.append(top, number, note);
  return card;
}

/* ===== PENDÊNCIAS ===== */
function renderPriorities(data) {
  const target = $('#overview-priorities');
  target.replaceChildren();
  const items = [
    { label: 'Cadastros aguardando análise', value: data.students?.pending, href: '../students/index.html', detail: 'Ver alunos' },
    { label: 'Pagamentos pendentes', value: data.subscriptions?.pending_payment, href: '../students/index.html', detail: 'Consultar alunos' },
    { label: 'Anamneses não preenchidas', value: data.anamnesis_pending, href: '../students/index.html', detail: 'Acompanhar' }
  ];
  const pending = items.filter((item) => Number(item.value || 0) > 0);

  if (!pending.length) {
    const empty = document.createElement('div');
    empty.className = 'overview-all-clear';
    empty.innerHTML = '<span aria-hidden="true">✓</span><div><strong>Nenhuma pendência nesses indicadores</strong><small>Os dados consultados estão em dia.</small></div>';
    target.append(empty);
    return;
  }

  pending.forEach((item) => {
    const row = document.createElement('a');
    row.className = 'overview-priority';
    row.href = item.href;
    const copy = document.createElement('span');
    copy.className = 'overview-priority-copy';
    const title = document.createElement('strong');
    title.textContent = item.label;
    const link = document.createElement('small');
    link.textContent = item.detail;
    copy.append(title, link);
    const count = document.createElement('b');
    count.textContent = formatNumber(item.value);
    row.append(copy, count);
    target.append(row);
  });
}

/* ===== CARREGAMENTO DOS DADOS REAIS ===== */
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
      { label: 'Alunos cadastrados', value: students.total, detail: 'Total de contas de alunos', icon: '♙', tone: 'default', href: '../students/index.html' },
      { label: 'Alunos ativos', value: students.active, detail: 'Com status ativo', icon: '✓', tone: 'success', href: '../students/index.html' },
      { label: 'Cadastros pendentes', value: students.pending, detail: 'Aguardando acompanhamento', icon: '…', tone: 'warning', href: '../students/index.html' },
      { label: 'Alunos suspensos', value: students.suspended, detail: 'Com acesso suspenso', icon: 'Ⅱ', tone: 'muted', href: '../students/index.html' },
      { label: 'Planos ativos', value: plans.total, detail: 'Disponíveis na consultoria', icon: '▤', tone: 'default', href: '../plans/index.html' },
      { label: 'Assinaturas ativas', value: subscriptions.active, detail: 'Assinaturas com status ativo', icon: '◆', tone: 'success', href: '../students/index.html' },
      { label: 'Pagamentos pendentes', value: subscriptions.pending_payment, detail: 'Aguardando confirmação', icon: 'R$', tone: 'warning', href: '../students/index.html' },
      { label: 'Anamneses pendentes', value: data.anamnesis_pending, detail: 'Ainda não preenchidas', icon: '☷', tone: 'warning', href: '../students/index.html' }
    ];

    summary.replaceChildren();
    metrics.forEach((metric) => summary.append(createMetric(metric)));
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
