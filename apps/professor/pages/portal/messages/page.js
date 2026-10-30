/* R-FIT | Central WhatsApp do professor
   Lista de alunos por vencimento real da assinatura. */
import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';

const $=(selector)=>document.querySelector(selector);
let students=[];
let activeFilter='all';

function localDate(value){
 if(!value)return null;
 const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(!match)return null;
 return new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));
}
function daysUntil(value){
 const expiry=localDate(value);if(!expiry)return null;
 const today=new Date();today.setHours(0,0,0,0);
 return Math.round((expiry.getTime()-today.getTime())/86400000);
}
function dateLabel(value){const d=localDate(value);return d?d.toLocaleDateString('pt-BR'):'Sem vencimento';}
function escapeText(value){return String(value??'');}
function phoneDigits(value){return String(value||'').replace(/\D/g,'');}
function isLifetime(s){return Number(s.lifetime)===1||!s.expires_at;}
function stateFor(s){
 if(isLifetime(s))return {kind:'nodate',label:'Sem vencimento',tone:'success',days:null};
 const days=daysUntil(s.expires_at);
 if(days===null)return {kind:'nodate',label:'Sem vencimento',tone:'success',days:null};
 if(days<0)return {kind:'overdue',label:'Vencido há '+Math.abs(days)+' dia(s)',tone:'danger',days};
 if(days===0)return {kind:'attention',label:'Vence hoje',tone:'danger',days};
 if(days<=5)return {kind:'attention',label:'Vence em '+days+' dia(s)',tone:'danger',days};
 if(days<=7)return {kind:'attention',label:'Vence em '+days+' dia(s)',tone:'warning',days};
 return {kind:'future',label:'Vence em '+days+' dias',tone:'success',days};
}
function messageFor(s,state){
 const name=(s.full_name||'').trim().split(/\s+/)[0]||'tudo bem';
 if(state.kind==='overdue')return 'Olá, '+name+'! Tudo bem? Vi que seu plano no R-Fit venceu em '+dateLabel(s.expires_at)+'. Gostaria de conversar sobre a renovação e dar continuidade aos seus treinos. Posso te ajudar?';
 return 'Olá, '+name+'! Tudo bem? Estou passando para lembrar que seu plano no R-Fit vence em '+dateLabel(s.expires_at)+'. Se quiser continuar com seus treinos, posso te ajudar com a renovação. Conte comigo!';
}
function makeRow(s){
 const state=stateFor(s);
 const row=document.createElement('article');row.className='message-center-row';
 const person=document.createElement('div');person.className='message-center-person';
 const avatar=document.createElement('span');avatar.className='message-center-avatar';
 if(s.avatar_url){const img=document.createElement('img');img.src=s.avatar_url;img.alt='';avatar.append(img);}else avatar.textContent=(s.full_name||'R').trim().charAt(0).toUpperCase();
 const identity=document.createElement('div');const name=document.createElement('strong');name.textContent=s.full_name||'Aluno sem nome';const contact=document.createElement('small');contact.textContent=s.phone||s.email||'Contato não cadastrado';identity.append(name,contact);person.append(avatar,identity);
 const plan=document.createElement('div');const planName=document.createElement('span');planName.className='plan-name';planName.textContent=s.plan_name||'Plano';const expiry=document.createElement('small');expiry.style.display='block';expiry.textContent='Vencimento: '+dateLabel(s.expires_at);plan.append(planName,expiry);
 const status=document.createElement('div');const pill=document.createElement('span');pill.className='message-center-pill '+state.tone;pill.textContent=state.label;status.append(pill);
 const digits=phoneDigits(s.phone);const action=document.createElement('a');action.className='message-center-action';action.textContent='Abrir WhatsApp';action.target='_blank';action.rel='noopener noreferrer';
 if(digits.length>=10){const number=digits.startsWith('55')?digits:'55'+digits;action.href='https://wa.me/'+number+'?text='+encodeURIComponent(messageFor(s,state));action.setAttribute('aria-label','Abrir WhatsApp e preparar mensagem para '+(s.full_name||'aluno'));}else{action.href='#';action.setAttribute('aria-disabled','true');action.title='Cadastre um telefone válido no perfil do aluno';}
 row.append(person,plan,status,action);return row;
}
function matches(s,query){
 const state=stateFor(s);const q=query.toLocaleLowerCase('pt-BR');
 const text=[s.full_name,s.email,s.phone,s.plan_name].join(' ').toLocaleLowerCase('pt-BR');
 const filterOk=activeFilter==='all'||(activeFilter==='attention'&&state.kind==='attention')||(activeFilter==='overdue'&&state.kind==='overdue')||(activeFilter==='nodate'&&state.kind==='nodate');
 return filterOk&&text.includes(q);
}
function render(){
 const query=$('#center-search').value.trim();const target=$('#message-center-list');target.replaceChildren();
 const sorted=[...students].sort((a,b)=>{
  const sa=stateFor(a),sb=stateFor(b);
  const rank=x=>x.kind==='overdue'?0:x.kind==='attention'?1:x.kind==='future'?2:3;
  if(rank(sa)!==rank(sb))return rank(sa)-rank(sb);
  if(sa.days!==null&&sb.days!==null)return sa.days-sb.days;
  if(sa.days!==null)return -1;if(sb.days!==null)return 1;
  return String(a.full_name||'').localeCompare(String(b.full_name||''),'pt-BR');
 }).filter(s=>matches(s,query));
 if(!sorted.length){const empty=document.createElement('div');empty.className='message-center-empty';empty.textContent='Nenhum aluno encontrado para este filtro.';target.append(empty);return;}
 sorted.forEach(s=>target.append(makeRow(s)));
}
function renderCounters(){
 const states=students.map(stateFor);
 $('#count-urgent').textContent=states.filter(s=>s.days!==null&&s.days>=0&&s.days<=5).length;
 $('#count-soon').textContent=states.filter(s=>s.days!==null&&s.days>=0&&s.days<=7).length;
 $('#count-overdue').textContent=states.filter(s=>s.kind==='overdue').length;
 $('#count-no-date').textContent=states.filter(s=>s.kind==='nodate').length;
}
async function load(){
 const target=$('#message-center-list');target.innerHTML='<div class="message-center-empty">Atualizando lista de alunos…</div>';
 try{
  const response=await fetch('/api/professor/message-center',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
  const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'Não foi possível carregar os alunos.');
  students=data.students||[];renderCounters();render();$('#center-updated').textContent='Atualizado às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  $('#center-message').textContent='';
 }catch(error){target.innerHTML='<div class="message-center-empty">Não foi possível carregar os vencimentos. Atualize a página ou tente novamente.</div>';$('#center-message').textContent=error.message;}
}
async function init(){
 try{const user=await getCurrentUser();if(!user)throw new Error('Sessão não encontrada.');$('#professor-welcome').textContent='Olá, '+(user.full_name||user.name||'professor')+'. Acompanhe os contatos e vencimentos dos seus alunos.';}
 catch{window.location.href='/professor/';return;}
 $('#logout')?.addEventListener('click',logout);
 $('#refresh-center')?.addEventListener('click',load);
 $('#center-search')?.addEventListener('input',render);
 document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));render();}));
 await load();
}
init();
