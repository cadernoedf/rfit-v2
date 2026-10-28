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
      '<td>' + date(student.created_at) + ((/teste|test/i.test(String(student.email || ''))) ? '<br><button type="button" class="text-button" data-test-access="' + escapeHtml(student.id) + '">Ativar 30 dias (teste)</button>' : '') + '</td></tr>';
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
  $('#student-rows')?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-test-access]');
    if (!button) return;
    const studentId = button.dataset.testAccess;
    if (!confirm('Ativar 30 dias de acesso TEMPORÁRIO nesta conta de teste, sem cobrança?')) return;
    button.disabled = true;
    try {
      const response = await fetch('/api/professor/students/' + encodeURIComponent(studentId) + '/test-access', {
        method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'test_access_failed');
      alert('Acesso de teste ativado por 30 dias. Nenhuma cobrança foi criada.');
      await loadDashboard();
    } catch (error) {
      alert(error.message === 'test_account_only' ? 'Por segurança, esse botão só funciona em contas cujo e-mail contém “teste” ou “test”.' : 'Não foi possível ativar o acesso de teste. Verifique a publicação e tente novamente.');
      button.disabled = false;
    }
  });
  $('#student-search')?.addEventListener('input', renderStudents);
  $('#student-filter')?.addEventListener('change', renderStudents);
  await loadDashboard();
});

async function loadPlans() {
  const message = $('#plans-message'); if (!message) return;
  try {
    const response = await fetch('/api/professor/plans', {credentials:'same-origin',cache:'no-store'});
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'plans_unavailable');
    const list = $('#plans-list');
    list.innerHTML = (data.plans || []).map(function(plan) {
      return '<article class="plan-row"><div><strong>' + escapeHtml(plan.name) + '</strong><small>' + escapeHtml(plan.description || '') + '</small></div><span>' + new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(plan.price_cents || 0)/100) + '</span><span class="status-pill">' + (plan.is_active ? 'Ativo' : 'Inativo') + '</span></article>';
    }).join('') || '<p>Nenhum plano cadastrado.</p>';
    message.textContent = 'Planos carregados do banco R-Fit.'; message.dataset.state='success';
  } catch (error) { message.textContent = 'Falha ao carregar planos. Confira se a migração do D1 foi aplicada.'; message.dataset.state='error'; }
}
async function loadSettings() {
  const message = $('#settings-message'); if (!message) return;
  try {
    const response = await fetch('/api/professor/settings',{credentials:'same-origin',cache:'no-store'});
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'settings_unavailable');
    const form=$('#settings-form');
    ['consultancy_name','login_title','login_message'].forEach(function(key){form.elements[key].value=(data.settings && data.settings[key] && data.settings[key].value) || '';});
    ['registration_enabled','maintenance_mode'].forEach(function(key){const fallback=key==='registration_enabled';form.elements[key].checked=((data.settings && data.settings[key] && data.settings[key].value) || String(fallback))==='true';});
    message.textContent='Configurações carregadas do D1.'; message.dataset.state='success';
  } catch (error) { message.textContent='Falha ao carregar configurações. Confira a migração do D1.'; message.dataset.state='error'; }
}
document.addEventListener('DOMContentLoaded', function(){
  const settingsForm=$('#settings-form');
  if(settingsForm) settingsForm.addEventListener('submit',async function(event){
    event.preventDefault(); const message=$('#settings-message'); const form=event.currentTarget;
    const settings={consultancy_name:form.elements.consultancy_name.value,login_title:form.elements.login_title.value,login_message:form.elements.login_message.value,registration_enabled:String(form.elements.registration_enabled.checked),maintenance_mode:String(form.elements.maintenance_mode.checked)};
    try { const response=await fetch('/api/professor/settings',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings:settings})}); const data=await response.json(); if(!response.ok) throw new Error(data.error || 'save_failed'); message.textContent='Configurações salvas no D1.'; message.dataset.state='success'; }
    catch(error){message.textContent='Não foi possível salvar as configurações.';message.dataset.state='error';}
  });
  const planForm=$('#create-plan-form');
  if(planForm) planForm.addEventListener('submit',async function(event){
    event.preventDefault(); const form=event.currentTarget; const message=$('#plans-message');
    const payload={name:form.elements.name.value,description:form.elements.description.value,price_cents:Math.round(Number(form.elements.price.value)*100),duration_days:form.elements.lifetime.checked?null:Number(form.elements.duration_days.value),lifetime:form.elements.lifetime.checked,includes_training:form.elements.includes_training.checked,includes_nutrition:form.elements.includes_nutrition.checked};
    try { const response=await fetch('/api/professor/plans',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const data=await response.json(); if(!response.ok) throw new Error(data.error || 'create_failed'); message.textContent='Plano criado no D1.'; message.dataset.state='success'; form.reset(); await loadPlans(); }
    catch(error){message.textContent='Não foi possível criar o plano.';message.dataset.state='error';}
  });
  $('#load-plans') && $('#load-plans').addEventListener('click',loadPlans);
  $('#load-settings') && $('#load-settings').addEventListener('click',loadSettings);
});

document.addEventListener('DOMContentLoaded', function () {
  const buttons = document.querySelectorAll('[data-view]');
  const panels = document.querySelectorAll('[data-view-panel]');
  const title = document.querySelector('.admin-title');
  const names = { overview: 'Visão geral', students: 'Alunos', plans: 'Planos da consultoria', settings: 'Configurações' };
  function showView(view) {
    panels.forEach(function (panel) {
      panel.hidden = panel.dataset.viewPanel !== view;
      panel.classList.toggle('is-visible', !panel.hidden);
    });
    buttons.forEach(function (button) {
      const active = button.dataset.view === view;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (title) {
      title.textContent = names[view] || 'Painel';
      const accent = document.createElement('span');
      accent.textContent = '.';
      title.appendChild(accent);
    }
    if (view === 'plans') loadPlans();
    if (view === 'settings') loadSettings();
    if (view === 'students') loadDashboard();
  }
  buttons.forEach(function (button) {
    button.addEventListener('click', function () { showView(button.dataset.view); });
  });
  showView('overview');
});
