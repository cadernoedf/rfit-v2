/* R-Fit V2 — catálogo e seleção de plano do aluno.
   Os valores exibidos vêm do catálogo ativo no D1; não liberar plano pelo clique. */
import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';

const formatBRL = (cents) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cents || 0) / 100);
async function loadCurrentSubscription() {\n  const panel=document.querySelector('#current-plan-panel');\n  try {\n    const response=await fetch('/api/student/subscription',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});\n    const data=await response.json().catch(()=>({}));\n    if(!response.ok) throw new Error('subscription_unavailable');\n    if(!data.subscription) { panel.hidden=false; document.querySelector('#current-plan-name').textContent='Nenhum plano ativo'; document.querySelector('#current-plan-details').textContent='Escolha um plano abaixo para começar seu acompanhamento.'; document.querySelector('#current-plan-days').textContent=''; document.querySelector('#current-plan-type').textContent=''; return; }\n    const s=data.subscription; panel.hidden=false;\n    document.querySelector('#current-plan-name').textContent=s.plan_name||'Seu plano R-Fit';\n    document.querySelector('#current-plan-details').textContent='Plano atual: '+(s.plan_name||'R-Fit')+'.';\n    document.querySelector('#current-plan-days').textContent=Number(s.lifetime)?'Acesso vitalício — não expira.':(s.days_remaining===null?'Validade não informada':`Restam ${s.days_remaining} ${s.days_remaining===1?'dia':'dias'} de acesso.`);\n    const type=Number(s.lifetime)?'Acesso vitalício':s.plan_code==='nutrition'?'Plano de dieta / nutrição':s.plan_code==='training'?'Plano de treino':s.plan_code==='combo'?'Plano completo: treino + dieta':(Number(s.includes_nutrition)&&Number(s.includes_training))?'Plano de treino + dieta':Number(s.includes_nutrition)?'Plano de dieta / nutrição':'Plano de treino';\n    document.querySelector('#current-plan-type').textContent=type;\n  } catch { panel.hidden=false; document.querySelector('#current-plan-name').textContent='Não foi possível consultar seu plano'; document.querySelector('#current-plan-details').textContent='Atualize a página para verificar sua assinatura e a validade.'; }\n}\n\nconst benefits = {
  nutrition: ['Plano alimentar e orientação nutricional', 'Área de dieta no portal', 'Acompanhe sua jornada'],
  training: ['Fichas de treino no portal', 'Organização da rotina de treino', 'Acompanhe sua evolução'],
  combo: ['Tudo do plano Nutrição', 'Tudo do plano Treino', 'Treino e nutrição em um só lugar'],
  premium_lifetime: ['Acesso vitalício aos recursos da plataforma', 'Recursos de treino e nutrição', 'Pagamento único, sem mensalidade']
};
let selectedPlan = null;

function safeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function planCard(plan) {
  const code = String(plan.code || '');
  const featured = code === 'combo';
  const lifetime = Boolean(Number(plan.lifetime));
  const period = lifetime ? 'pagamento único' : '/ mês';
  const list = benefits[code] || [
    Number(plan.includes_training) ? 'Acesso à área de treino' : null,
    Number(plan.includes_nutrition) ? 'Acesso à área de nutrição' : null,
    'Acompanhe sua jornada no portal'
  ].filter(Boolean);
  return `<article class="plan-card ${featured ? 'is-featured' : ''}" data-plan-card="${safeText(plan.id)}">
    ${featured ? '<div class="plan-ribbon">MAIS VANTAJOSO</div>' : ''}
    <div class="plan-card-head"><span class="plan-icon">${code === 'nutrition' ? '🥗' : code === 'training' ? '🏋️' : code === 'combo' ? '⚡' : '👑'}</span><span class="plan-type">${lifetime ? 'ACESSO VITALÍCIO' : 'PLANO MENSAL'}</span></div>
    <h3>${safeText(plan.name)}</h3><p class="plan-description">${safeText(plan.description || '')}</p>
    <div class="plan-price"><strong>${formatBRL(plan.price_cents)}</strong><span>${period}</span></div>
    <ul class="plan-benefits">${list.map(item => `<li><span aria-hidden="true">✓</span>${safeText(item)}</li>`).join('')}</ul>
    <button type="button" class="plan-choose-button ${featured ? 'is-primary' : ''}" data-select-plan="${safeText(plan.id)}">Escolher este plano <span aria-hidden="true">→</span></button>
  </article>`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const welcome = document.querySelector('#student-welcome');
  const message = document.querySelector('#page-message');
  const catalog = document.querySelector('#plan-catalog');
  const selection = document.querySelector('#plan-selection-note');
  const continueButton = document.querySelector('#continue-plan');
  try {
    const result = await getCurrentUser();
    if (result.user.role !== 'student') { window.location.replace('/professor/'); return; }
    welcome.textContent = 'Olá, ' + (result.user.name || result.user.email) + '.';\n    loadCurrentSubscription();
  } catch {
    window.location.replace('/student/pages/login.html');
    return;
  }
  document.querySelector('#logout')?.addEventListener('click', async function () {
    this.disabled = true;
    try { await logout(); } finally { window.location.replace('/student/pages/login.html'); }
  });

  try {
    const response = await fetch('/api/student/plans', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os planos.');
    const plans = Array.isArray(data.plans) ? data.plans : [];
    if (!plans.length) {
      catalog.innerHTML = '<div class="plan-loading">Nenhum plano está disponível no momento. Tente novamente mais tarde.</div>';
      catalog.setAttribute('aria-busy', 'false');
      return;
    }
    catalog.innerHTML = plans.map(planCard).join('');
    catalog.setAttribute('aria-busy', 'false');
    catalog.addEventListener('click', event => {
      const button = event.target.closest('[data-select-plan]');
      if (!button) return;
      selectedPlan = plans.find(plan => String(plan.id) === button.dataset.selectPlan);
      if (!selectedPlan) return;
      catalog.querySelectorAll('.plan-card').forEach(card => card.classList.toggle('is-selected', card.dataset.planCard === String(selectedPlan.id)));
      catalog.querySelectorAll('[data-select-plan]').forEach(item => {
        item.innerHTML = item.dataset.selectPlan === String(selectedPlan.id) ? 'Plano selecionado <span aria-hidden="true">✓</span>' : 'Escolher este plano <span aria-hidden="true">→</span>';
      });
      document.querySelector('#selected-plan-name').textContent = selectedPlan.name;
      document.querySelector('#selected-plan-copy').textContent = formatBRL(selectedPlan.price_cents) + (Number(selectedPlan.lifetime) ? ' — pagamento único, acesso vitalício.' : ' por mês. Você seguirá para a etapa segura de pagamento.');
      selection.hidden = false;
      message.textContent = 'Plano selecionado. Confira os detalhes antes de continuar.';
      message.dataset.state = 'success';
      selection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  } catch (error) {
    catalog.innerHTML = '<div class="plan-loading">Não foi possível carregar os planos. Atualize a página para tentar novamente.</div>';
    catalog.setAttribute('aria-busy', 'false');
    message.textContent = error.message || 'Erro ao carregar os planos.';
    message.dataset.state = 'error';
  }

  continueButton.addEventListener('click', () => {
    if (!selectedPlan) return;
    message.textContent = 'Sua escolha está salva nesta tela. A etapa de geração e confirmação do PIX ainda precisa ser conectada antes de receber pagamentos. Nenhuma cobrança foi criada.';
    message.dataset.state = 'pending';
  });
});
