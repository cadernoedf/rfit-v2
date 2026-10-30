/* ==========================================================================
   R-FIT | PORTAL DO PROFESSOR
   Módulo: Lista de alunos em cartões e acesso ao perfil individual.
   ========================================================================== */
import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';

/* ===== IDENTIFICAÇÃO ===== */
const $=(selector)=>document.querySelector(selector);
const statusLabel={active:'Ativo',pending:'Pendente',suspended:'Suspenso'};
async function api(url,options={}){const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers:{Accept:'application/json','Content-Type':'application/json',...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.error||'request_failed');return data;}

/* ===== CARTÃO-RG DO ALUNO ===== */
function createStudentCard(student,message){
 const card=document.createElement('article');
 const isCourtesy=Number(student.is_courtesy)===1;
 const isLifetime=Number(student.plan_lifetime)===1||Number(student.subscription_lifetime)===1||student.plan_code==='premium_lifetime';
 const planTone=isCourtesy||isLifetime?'gold':({nutrition:'nutrition',training:'training',combo:'combo'})[String(student.plan_code||'').toLowerCase()]||'default';
 card.className='managed-student-card student-id-card plan-'+planTone;
 const main=document.createElement('a');main.className='managed-student-main';main.href='./detail.html?id='+encodeURIComponent(student.id);
 const avatar=document.createElement('span');avatar.className='managed-student-avatar';
 if(student.avatar_url){const img=document.createElement('img');img.src=student.avatar_url;img.alt='Foto de '+(student.full_name||'aluno');avatar.append(img)}else avatar.textContent=String(student.full_name||'R').trim().charAt(0).toUpperCase();
 const identity=document.createElement('span');identity.className='managed-student-identity';
 const name=document.createElement('strong');name.textContent=student.full_name||'Aluno sem nome';
 const email=document.createElement('small');email.textContent=student.email||'E-mail não informado';
 const plan=document.createElement('span');plan.className='managed-student-plan';
 plan.textContent=isCourtesy?'👑 Cortesia':isLifetime?'👑 Vitalício':student.plan_name||'Sem plano';
 identity.append(name,email,plan);main.append(avatar,identity);
 const meta=document.createElement('div');meta.className='managed-student-meta';
 const status=document.createElement('span');status.className='managed-student-status status-'+student.status;status.textContent=statusLabel[student.status]||student.status||'Sem status';
 const payment=document.createElement('span');payment.className='managed-student-payment';
 payment.textContent=isCourtesy?'Acesso cortesia':isLifetime?'Acesso vitalício':({approved:'Pagamento confirmado',pending:'Pagamento pendente',rejected:'Pagamento recusado',refunded:'Pagamento estornado',cancelled:'Pagamento cancelado'})[student.payment_status]||'Pagamento não registrado';
 const anam=document.createElement('span');anam.className='managed-student-anam';anam.textContent=student.anamnesis_completed_at?'Anamnese preenchida':'Anamnese pendente';
 meta.append(status,payment,anam);
 const info=document.createElement('div');info.className='student-id-facts';
 const goal=student.workout_goal||student.profile_goal||'Objetivo não informado';
 const frequency=student.workout_frequency||student.profile_training_frequency;
 const weight=student.current_weight!==null&&student.current_weight!==undefined?Number(student.current_weight):null;
 const previous=student.previous_weight!==null&&student.previous_weight!==undefined?Number(student.previous_weight):null;
 const weightText=weight!==null&&!Number.isNaN(weight)?weight.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' kg':'Sem avaliação';
 let evolution='Histórico insuficiente';
 if(weight!==null&&previous!==null&&!Number.isNaN(weight)&&!Number.isNaN(previous)){const diff=weight-previous;evolution=(diff>0?'+':'')+diff.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' kg desde a avaliação anterior';}
 const checkin=latestCheckin(student);
 const facts=[
  ['FOCO DO TREINO',goal],
  ['FREQUÊNCIA',frequency?frequency+'x por semana':'Não definida'],
  ['PESO ATUAL',weightText],
  ['EVOLUÇÃO',evolution],
  ['ÚLTIMO CHECK-IN',formatStudentDate(checkin)]
 ];
 facts.forEach(([label,value])=>{const item=document.createElement('div');item.className='student-id-fact';const caption=document.createElement('small');caption.textContent=label;const strong=document.createElement('strong');strong.textContent=value;item.append(caption,strong);info.append(item)});
 const alerts=document.createElement('div');alerts.className='student-id-alerts';
 if(!student.anamnesis_completed_at)addStudentAlert(alerts,'Anamnese pendente','warning');
 if(!checkin)addStudentAlert(alerts,'Sem check-in','muted');
 else if((Date.now()-checkin.getTime())>7*86400000)addStudentAlert(alerts,'Check-in atrasado','warning');
 if(!student.workout_goal&&!student.profile_goal)addStudentAlert(alerts,'Objetivo não definido','muted');
 if(student.subscription_status==='past_due')addStudentAlert(alerts,'Assinatura em atraso','danger');
 if(student.subscription_status==='expired')addStudentAlert(alerts,'Assinatura expirada','danger');
 const actions=document.createElement('div');actions.className='managed-student-actions';
 const statusSelect=document.createElement('select');statusSelect.setAttribute('aria-label','Situação de '+(student.full_name||student.email));
 Object.entries(statusLabel).forEach(([value,label])=>statusSelect.add(new Option(label,value)));statusSelect.value=student.status;
 statusSelect.addEventListener('change',async()=>{const previousStatus=student.status;statusSelect.disabled=true;try{await api('/api/professor/students/'+encodeURIComponent(student.id)+'/status',{method:'PATCH',body:JSON.stringify({status:statusSelect.value})});student.status=statusSelect.value;status.textContent=statusLabel[student.status];status.className='managed-student-status status-'+student.status;message.textContent='Situação do aluno atualizada.';}catch(error){statusSelect.value=previousStatus;message.textContent='Não foi possível alterar a situação: '+error.message;}finally{statusSelect.disabled=false;}});
 const noteDetails=document.createElement('details');noteDetails.className='managed-student-note';const noteSummary=document.createElement('summary');noteSummary.textContent='＋ Enviar orientação';const noteInput=document.createElement('textarea');noteInput.rows=3;noteInput.maxLength=1200;noteInput.placeholder='Escreva uma orientação que aparecerá na jornada do aluno…';const noteButton=document.createElement('button');noteButton.type='button';noteButton.className='secondary-button';noteButton.textContent='Enviar orientação';
 noteButton.addEventListener('click',async()=>{const note=noteInput.value.trim();if(!note){message.textContent='Escreva uma orientação antes de enviar.';return;}noteButton.disabled=true;try{await api('/api/professor/students/'+encodeURIComponent(student.id)+'/journey-notes',{method:'POST',body:JSON.stringify({note})});noteInput.value='';noteDetails.open=false;message.textContent='Orientação enviada para '+(student.full_name||student.email)+'.';}catch(error){message.textContent='Não foi possível enviar a orientação: '+error.message;}finally{noteButton.disabled=false;}});
 noteDetails.append(noteSummary,noteInput,noteButton);actions.append(statusSelect,noteDetails);
 const open=document.createElement('a');open.className='managed-student-open';open.href=main.href;open.textContent='Abrir perfil →';
 card.append(main,meta,info);if(alerts.childElementCount)card.append(alerts);card.append(actions,open);return card;
}
function addStudentAlert(container,label,tone){const item=document.createElement('span');item.className='student-id-alert alert-'+tone;item.textContent=label;container.append(item);}
function latestCheckin(student){
 const dates=[student.latest_daily_checkin,student.latest_weekly_checkin].filter(Boolean).map(value=>new Date(value)).filter(value=>!Number.isNaN(value.getTime()));
 return dates.length?new Date(Math.max(...dates.map(value=>value.getTime()))):null;
}
function formatStudentDate(value){if(!value)return 'Ainda não realizou';return value.toLocaleDateString('pt-BR');}

/* ===== CARREGAMENTO E FILTRO ===== */
document.addEventListener('DOMContentLoaded',async()=>{
 const list=$('#students-list'),message=$('#page-message');
 try{
  const auth=await getCurrentUser();if(!['professor','admin'].includes(auth.user.role)){location.replace('/student/dashboard.html');return;}
  $('#professor-welcome').textContent='Olá, '+(auth.user.name||auth.user.email)+'.';
  const data=await api('/api/professor/students');const students=data.students||[];
  list.replaceChildren();
  const toolbar=document.createElement('div');toolbar.className='students-toolbar';
  const search=document.createElement('input');search.type='search';search.className='search-field';search.placeholder='Buscar por nome, e-mail ou plano';search.setAttribute('aria-label','Buscar alunos');
  const count=document.createElement('span');count.className='students-count';toolbar.append(search,count);
  const grid=document.createElement('div');grid.className='managed-students-grid';list.append(toolbar,grid);
  function render(){grid.replaceChildren();const query=search.value.trim().toLowerCase();const filtered=students.filter(student=>[student.full_name,student.email,student.plan_name].some(value=>String(value||'').toLowerCase().includes(query)));count.textContent=filtered.length+' de '+students.length+' aluno(s)';filtered.forEach(student=>grid.append(createStudentCard(student,message)));if(!filtered.length){const empty=document.createElement('p');empty.className='overview-muted';empty.textContent='Nenhum aluno encontrado.';grid.append(empty);}}
  search.addEventListener('input',render);render();message.textContent=students.length+' aluno(s) carregado(s).';
 }catch(error){message.textContent='Não foi possível carregar alunos: '+error.message;}
 $('#logout')?.addEventListener('click',async()=>{try{await logout()}finally{location.replace('/student/pages/login.html')}});
});
