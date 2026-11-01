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


/* ===== PAINEL INTELIGENTE DE ACOMPANHAMENTO ===== */
function renderFollowup(students) {
  const summary = $('#overview-followup-summary');
  const list = $('#overview-followup-list');
  if (!summary || !list) return;
  const now = Date.now();
  const ageDays = (value) => {
    if (!value) return null;
    const parsed = new Date(String(value).length === 10 ? value + 'T12:00:00' : value);
    return Number.isNaN(parsed.getTime()) ? null : Math.floor((now - parsed.getTime()) / 86400000);
  };
  const groups = [
    { key: 'assessment', title: 'Avaliação atrasada', description: 'Mais de 30 dias sem avaliação', rows: [] },
    { key: 'checkin', title: 'Check-in sem atualização', description: 'Mais de 7 dias sem check-in', rows: [] },
    { key: 'anamnesis', title: 'Anamnese pendente', description: 'Cadastro de saúde ainda incompleto', rows: [] },
    { key: 'payment', title: 'Pagamento pendente', description: 'Aguardando confirmação financeira', rows: [] }
  ];
  students.forEach((student) => {
    if (student.status === 'suspended') return;
    const name = student.full_name || 'Aluno sem nome';
    const href = '../students/detail.html?id=' + encodeURIComponent(student.id);
    const add = (key, detail) => groups.find((group) => group.key === key).rows.push({ name, detail, href });
    const assessmentAge = ageDays(student.measurement_at);
    const checkinDate = student.latest_daily_checkin || student.latest_weekly_checkin;
    const checkinAge = ageDays(checkinDate);
    if (assessmentAge === null || assessmentAge > 30) add('assessment', assessmentAge === null ? 'Nenhuma avaliação registrada' : 'Última avaliação há ' + assessmentAge + ' dias');
    if (checkinAge === null || checkinAge > 7) add('checkin', checkinAge === null ? 'Nenhum check-in registrado' : 'Último check-in há ' + checkinAge + ' dias');
    if (!student.anamnesis_completed_at) add('anamnesis', 'Concluir informações iniciais');
    if (student.subscription_status === 'pending_payment' || student.payment_status === 'pending') add('payment', 'Verificar situação do pagamento');
  });
  summary.replaceChildren();
  groups.forEach((group) => {
    const card = document.createElement('article');
    card.className = 'overview-metric-card overview-tone-' + (group.rows.length ? 'warning' : 'success');
    const label = document.createElement('span'); label.textContent = group.title;
    const value = document.createElement('strong'); value.className = 'overview-metric-value'; value.textContent = formatNumber(group.rows.length);
    const detail = document.createElement('small'); detail.textContent = group.description;
    card.append(label, value, detail); summary.append(card);
  });
  list.replaceChildren();
  groups.forEach((group) => {
    const card = document.createElement('article'); card.className = 'overview-followup-group';
    const heading = document.createElement('h3'); heading.textContent = group.title;
    const count = document.createElement('span'); count.textContent = formatNumber(group.rows.length);
    heading.append(count); card.append(heading);
    if (!group.rows.length) {
      const empty = document.createElement('p'); empty.className = 'overview-muted'; empty.textContent = 'Nenhum aluno nesta situação.'; card.append(empty);
    } else {
      group.rows.slice(0, 6).forEach((item) => {
        const row = document.createElement('div'); row.className = 'overview-followup-item';
        const copy = document.createElement('div');
        const name = document.createElement('strong'); name.textContent = item.name;
        const detail = document.createElement('small'); detail.textContent = item.detail;
        copy.append(name, detail);
        const link = document.createElement('a'); link.href = item.href; link.textContent = 'Abrir ficha →';
        row.append(copy, link); card.append(row);
      });
      if (group.rows.length > 6) {
        const more = document.createElement('a'); more.href = '../students/index.html'; more.textContent = 'Ver mais ' + (group.rows.length - 6) + ' aluno(s)'; more.className = 'overview-followup-more'; card.append(more);
      }
    }
    list.append(card);
  });
  if (!students.length) list.innerHTML = '<p class="overview-followup-empty">Nenhum aluno cadastrado para analisar.</p>';
}

async function loadFollowup() {
  const list = $('#overview-followup-list');
  try {
    const response = await fetch('/api/professor/students', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'students_unavailable');
    renderFollowup(Array.isArray(data.students) ? data.students : []);
  } catch (error) {
    if (list) list.textContent = 'Não foi possível analisar os registros dos alunos. Os indicadores gerais continuam disponíveis.';
    console.error('rfit_professor_followup_failed', error);
  }
}
\n/* ===== CONSULTA DOS DADOS REAIS ===== */
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
    await Promise.all([loadOverview(), loadFollowup()]);
  } catch (error) {
    location.replace('/student/pages/login.html');
    return;
  }

  $('#overview-followup-refresh')?.addEventListener('click', loadFollowup);\n  $('#logout')?.addEventListener('click', async () => {
    try {
      await logout();
    } finally {
      location.replace('/student/pages/login.html');
    }
  });
});
