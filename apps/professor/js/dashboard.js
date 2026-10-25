/* ==========================================================================
   R-FIT | PAINEL DO PROFESSOR
   Dados carregados exclusivamente da API autenticada do Worker.
   ========================================================================== */
import { getCurrentUser, logout } from '../../shared/js/api-client.js';

const $ = (selector) => document.querySelector(selector);
let students = [];

function text(value, fallback = '—') {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}
function date(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(parsed);
}
function statusOf(student) {
  if (student.status === 'suspended' || ['expired','cancelled','past_due'].includes(student.subscription_status)) return 'inactive';
  if (student.subscription_status === 'pending_payment' || student.payment_status === 'pending') return 'pending_payment';
  if (!student.anamnesis_completed_at) return 'anamnesis';
  if (student.status === 'pending') return 'pending';
  return 'active';
}
const statusLabel = {
  active: 'Ativo', pending: 'Cadastro pendente', pending_payment: 'Aguardando pagamento',
  anamnesis: 'Anamnese pendente', inactive: 'Inativo'
};
function badge(status) {
  const safe = statusLabel[status] || 'Sem status';
  return '<span class="status-pill status-' + status + '">' + safe + '</span>';
}
function renderStudents() {
  const query = ($('#student-search')?.value || '').trim().toLocaleLowerCase('pt-BR');
  const filter = $('#student-filter')?.value || 'all';
  const filtered = students.filter((student) => {
    const status = statusOf(student);
    const haystack = [student.full_name, student.email, student.plan_name].join(' ').toLocaleLowerCase('pt-BR');
    return (!query || haystack.includes(query)) && (filter === 'all' || filter === status);
  });
  $('#student-count').textContent = filtered.length + (filtered.length === 1 ? ' aluno' : ' alunos');
  const body = $('#student-rows');
  if (!filtered.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum aluno corresponde a este filtro.</td></tr>';
    return;
  }
  body.innerHTML = filtered.map((student) => {
    const name = text(student.full_name, 'Aluno sem nome');
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
    const status = statusOf(student);
    const avatar = student.avatar_url
      ? '<img class="student-avatar" src="' + encodeURI(student.avatar_url).replace(/"/g, '&quot;') + '" alt="" referrerpolicy="no-referrer">'
      : '<span class="student-avatar avatar-fallback">' + initials + '</span>';
    return '<tr><td><div class="student-identity">' + avatar + '<div><strong>' + escapeHtml(name) + '</strong><small>' + escapeHtml(text(student.email)) + '</small></div></div></td>' +
      '<td>' + escapeHtml(text(student.plan_name, 'Ainda não selecionado')) + '</td><td>' + badge(status) + '</td>' +
      '<td>' + (student.anamnesis_completed_at ? '<span class="plain-status done">Concluída</span>' : '<span class="plain-status waiting">Pendente</span>') + '</td>' +
      '<td>' + date(student.created_at) + '</td></tr>';
  }).join('');
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}
async function loadDashboard() {
  const message = $('#dashboard-message');
  message.textContent = 'Consultando dados atualizados…';
  message.dataset.state = 'pending';
  try {
    const [overviewResponse, studentsResponse] = await Promise.all([
      fetch('/api/professor/overview', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } }),
      fetch('/api/professor/students', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } })
    ]);
    if (!overviewResponse.ok || !studentsResponse.ok) throw new Error('admin_data_unavailable');
    const overview = await overviewResponse.json();
    const data = await studentsResponse.json();
    $('#metric-students').textContent = text(overview.students?.total, '0');
    $('#metric-active').textContent = text(overview.subscriptions?.active, '0');
    $('#metric-payment').textContent = text(overview.subscriptions?.pending_payment, '0');
    $('#metric-anamnesis').textContent = text(overview.anamnesis_pending, '0');
    $('#metric-students-note').textContent = text(overview.students?.pending, '0') + ' cadastros aguardando conclusão';
    students = Array.isArray(data.students) ? data.students : [];
    renderStudents();
    message.textContent = 'Dados atualizados a partir do banco R-Fit.';
    message.dataset.state = 'success';
  } catch (error) {
    message.textContent = 'Não foi possível carregar os dados administrativos. Verifique a publicação da API e tente novamente.';
    message.dataset.state = 'error';
    $('#student-rows').innerHTML = '<tr><td colspan="5" class="empty-state">A lista está indisponível até a API responder corretamente.</td></tr>';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const result = await getCurrentUser();
    if (!['professor', 'admin'].includes(result.user?.role)) {
      window.location.replace('/student/');
      return;
    }
    $('#professor-welcome').textContent = 'Olá, ' + text(result.user.name || result.user.email) + '. Aqui está o resumo da sua operação.';
  } catch {
    window.location.replace('/student/');
    return;
  }
  $('#professor-logout')?.addEventListener('click', async () => { await logout(); window.location.replace('/student/'); });
  $('#refresh-dashboard')?.addEventListener('click', loadDashboard);
  $('#student-search')?.addEventListener('input', renderStudents);
  $('#student-filter')?.addEventListener('change', renderStudents);
  await loadDashboard();
});
