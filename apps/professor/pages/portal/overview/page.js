import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';
document.addEventListener('DOMContentLoaded', async () => {
 const welcome=document.querySelector('#professor-welcome'), summary=document.querySelector('#overview-summary'), message=document.querySelector('#page-message');
 try {
  const auth=await getCurrentUser(); if(!['professor','admin'].includes(auth.user.role)){location.replace('/student/dashboard.html');return;}
  welcome.textContent='Olá, '+(auth.user.name||auth.user.email)+'.';
  const response=await fetch('/api/professor/overview',{credentials:'same-origin',cache:'no-store'});
  const data=await response.json(); if(!response.ok) throw new Error(data.error||'overview_unavailable');
  const s=data.students||{}, p=data.plans||{}, sub=data.subscriptions||{};
  summary.replaceChildren();
  const grid=document.createElement('div'); grid.className='metric-grid';
  const metrics=[['Alunos cadastrados',s.total||0],['Alunos ativos',s.active||0],['Cadastros pendentes',s.pending||0],['Planos ativos',p.total||0],['Assinaturas ativas',sub.active||0],['Pagamentos pendentes',sub.pending_payment||0],['Anamneses pendentes',data.anamnesis_pending||0]];
  for(const [label,value] of metrics){const card=document.createElement('article');card.className='metric-card';const l=document.createElement('span');l.textContent=label;const v=document.createElement('strong');v.textContent=String(value);card.append(l,v);grid.append(card);}
  summary.append(grid);
  message.textContent='Indicadores carregados do banco de dados.';
 } catch(e){message.textContent='Não foi possível carregar os indicadores. '+(e.message||'');}
 document.querySelector('#logout')?.addEventListener('click',async()=>{try{await logout()}finally{location.replace('/student/pages/login.html')}});
});
