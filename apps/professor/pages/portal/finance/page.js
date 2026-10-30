/* ==========================================================================
   R-FIT | PORTAL DO PROFESSOR
   Módulo: Financeiro
   Fonte: pagamentos confirmados e pendentes registrados no D1.
   ========================================================================== */
import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';

/* ===== IDENTIFICAÇÃO E FORMATAÇÃO ===== */
const $=(selector)=>document.querySelector(selector);
const money=(cents)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(cents||0)/100);
const date=(value)=>value?new Date(value).toLocaleDateString('pt-BR'):'—';
let payments=[];

/* ===== INDICADORES ===== */
function metric(label,value,detail,icon,tone='default'){
 const card=document.createElement('article');card.className='overview-metric-card overview-tone-'+tone;
 const top=document.createElement('div');top.className='overview-metric-top';
 const title=document.createElement('span');title.textContent=label;
 const symbol=document.createElement('span');symbol.className='overview-metric-icon';symbol.textContent=icon;top.append(title,symbol);
 const amount=document.createElement('strong');amount.className='overview-metric-value';amount.textContent=money(value);
 const note=document.createElement('small');note.textContent=detail;card.append(top,amount,note);return card;
}
function renderBilling(data){
 const target=$('#finance-billing-rows');
 target.replaceChildren();
 $('#finance-overdue').textContent=Number(data.schedule?.overdue_count||0)+' vencido(s)';
 const rows=data.billing_schedule||[];
 if(!rows.length){
  const empty=document.createElement('p');empty.className='overview-muted';empty.textContent='Nenhuma cobrança prevista cadastrada.';target.append(empty);return;
 }
 rows.forEach(item=>{
  const row=document.createElement('div');row.className='finance-billing-row';
  const copy=document.createElement('span');copy.className='finance-billing-copy';
  const name=document.createElement('strong');name.textContent=item.full_name||item.email;
  const plan=document.createElement('small');plan.textContent=item.plan_name+' · '+new Date(item.billing_starts_at).toLocaleDateString('pt-BR');
  copy.append(name,plan);
  const amount=document.createElement('b');amount.textContent=money(item.price_cents);
  row.append(copy,amount);target.append(row);
 });
}
function renderRows(){
 const body=$('#finance-rows'),q=$('#finance-search').value.trim().toLowerCase();body.replaceChildren();
 const rows=payments.filter(p=>[p.full_name,p.email,p.plan_name].some(v=>String(v||'').toLowerCase().includes(q)));
 $('#finance-empty').hidden=rows.length>0;
 if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent='Nenhum resultado para este filtro.';tr.append(td);body.append(tr);return;}
 rows.forEach(p=>{
  const tr=document.createElement('tr');
  [p.full_name||p.email||'Aluno',p.plan_name||'Plano não identificado',date(p.paid_at||p.created_at),p.provider||'—',money(p.amount_cents)].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});
  const td=document.createElement('td'),badge=document.createElement('span');badge.className='finance-status finance-status-'+p.status;badge.textContent=({approved:'Confirmado',pending:'Pendente',rejected:'Recusado',refunded:'Estornado',cancelled:'Cancelado'})[p.status]||p.status;td.append(badge);tr.append(td);body.append(tr);
 });
}

/* ===== CONSULTA DA API ===== */
async function loadFinance(){
 $('#finance-refresh').disabled=true;$('#finance-updated').textContent='Atualizando…';
 try{
  const response=await fetch('/api/professor/finance',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
  const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'finance_unavailable');
  const totals=data.totals||{},month=data.month||{};
  const metrics=[
   metric('Recebido no mês',month.total_cents,'Pagamentos aprovados no mês atual','R$','success'),
   metric('Total recebido',totals.received_cents,'Todos os pagamentos aprovados','✓','success'),
   metric('A receber',totals.pending_cents,'Transações ainda pendentes','◷','warning'),
   metric('Estornos',totals.refunded_cents,'Valores registrados como estornados','↶','muted')
  ];
  const target=$('#finance-metrics');target.replaceChildren(...metrics);
  payments=data.payments||[];renderRows();renderBilling(data);$('#finance-updated').textContent='Atualizado em '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  $('#page-message').textContent=payments.length+' transação(ões) encontrada(s).';
 }catch(error){$('#page-message').textContent='Não foi possível carregar o financeiro. '+error.message;$('#finance-updated').textContent='Falha ao atualizar';}
 finally{$('#finance-refresh').disabled=false;}
}

/* ===== SESSÃO ===== */
document.addEventListener('DOMContentLoaded',async()=>{
 try{const auth=await getCurrentUser();if(!['professor','admin'].includes(auth.user.role)){location.replace('/student/dashboard.html');return;}$('#professor-welcome').textContent='Olá, '+(auth.user.name||auth.user.email)+'.';}
 catch{location.replace('/student/pages/login.html');return;}
 $('#finance-refresh').addEventListener('click',loadFinance);$('#finance-search').addEventListener('input',renderRows);
 $('#logout')?.addEventListener('click',async()=>{try{await logout()}finally{location.replace('/student/pages/login.html')}});
 await loadFinance();
});
