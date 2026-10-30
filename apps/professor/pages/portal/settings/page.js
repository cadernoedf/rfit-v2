/* ==========================================================================
   R-FIT | PORTAL DO PROFESSOR
   Módulo: Configurações, destaques de login e avisos aos alunos.
   ========================================================================== */
import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';

/* ===== IDENTIFICAÇÃO ===== */
const $=(selector)=>document.querySelector(selector);
const message=(text,state='')=>{const node=$('#page-message');node.textContent=text;node.dataset.state=state;};
async function request(url,options={}){
 const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers:{Accept:'application/json','Content-Type':'application/json',...(options.headers||{})}});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!data.ok)throw new Error(data.error||'request_failed');
 return data;
}

/* ===== CARREGAR ALUNOS PARA OS DESTAQUES E AVISOS ===== */
async function loadStudents(){
 const data=await request('/api/professor/students');
 const students=data.students||[];
 const featured=$('#login-top-students'),targets=$('#announcement-targets');
 [featured,targets].forEach(select=>select.replaceChildren());
 students.forEach(student=>{
  const label=(student.full_name||student.email)+' · '+student.email;
  featured.add(new Option(label,student.id));
  targets.add(new Option(label,student.id));
 });
 return students;
}

/* ===== CONFIGURAÇÕES GERAIS ===== */
async function loadSettings(){
 const data=await request('/api/professor/settings'),form=$('#settings-form'),settings=data.settings||{};
 for(const key of ['consultancy_name','login_title','login_message'])form.elements[key].value=settings[key]?.value||'';
 for(const key of ['registration_enabled','maintenance_mode'])form.elements[key].checked=(settings[key]?.value||'false')==='true';
 let selected=[];try{selected=JSON.parse(settings.login_top_students?.value||'[]')}catch{}
 Array.from(form.elements.login_top_students.options).forEach(option=>{option.selected=selected.includes(option.value)});
 form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;
  try{
   const values={};for(const key of ['consultancy_name','login_title','login_message'])values[key]=form.elements[key].value;
   for(const key of ['registration_enabled','maintenance_mode'])values[key]=String(form.elements[key].checked);
   const chosen=Array.from(form.elements.login_top_students.selectedOptions).map(option=>option.value);
   if(chosen.length>5)throw new Error('Selecione no máximo cinco alunos para a tela de login.');
   values.login_top_students=JSON.stringify(chosen);
   await request('/api/professor/settings',{method:'PUT',body:JSON.stringify({settings:values})});
   message('Configurações salvas no banco D1.','success');
  }catch(error){message('Não foi possível salvar: '+error.message,'error');}
  finally{button.disabled=false;}
 });
}

/* ===== AVISOS E POP-UPS ===== */
function renderAnnouncements(items){
 const target=$('#announcement-list');target.replaceChildren();
 if(!items.length){const empty=document.createElement('p');empty.className='overview-muted';empty.textContent='Nenhum aviso cadastrado.';target.append(empty);return;}
 items.forEach(item=>{
  const card=document.createElement('article');card.className='settings-announcement-card';
  const title=document.createElement('strong');title.textContent=item.title;
  const body=document.createElement('p');body.textContent=item.message;
  const meta=document.createElement('small');meta.textContent=(item.audience==='all'?'Todos os alunos':'Alunos selecionados')+' · '+(item.is_active?'Ativo':'Inativo')+(item.require_acknowledgement?' · Confirmação de leitura':'');
  const button=document.createElement('button');button.type='button';button.className='secondary-button';button.textContent=item.is_active?'Desativar aviso':'Aviso desativado';button.disabled=!item.is_active;
  button.addEventListener('click',async()=>{button.disabled=true;try{await request('/api/professor/announcements/'+encodeURIComponent(item.id),{method:'PATCH',body:JSON.stringify({is_active:false})});await loadAnnouncements();message('Aviso desativado.','success');}catch(error){button.disabled=false;message('Não foi possível desativar: '+error.message,'error');}});
  card.append(title,body,meta,button);target.append(card);
 });
}
async function loadAnnouncements(){const data=await request('/api/professor/announcements');renderAnnouncements(data.announcements||[]);}
function bindAnnouncementForm(){
 const form=$('#announcement-form'),audience=form.elements.audience,targets=$('#announcement-target-wrap');
 audience.addEventListener('change',()=>{targets.hidden=audience.value!=='selected';});
 form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;
  try{
   const values=new FormData(form),selected=Array.from($('#announcement-targets').selectedOptions).map(option=>option.value);
   if(audience.value==='selected'&&!selected.length)throw new Error('Selecione pelo menos um aluno.');
   const toIso=(value)=>value?new Date(value).toISOString():null;
   await request('/api/professor/announcements',{method:'POST',body:JSON.stringify({
    title:values.get('title'),message:values.get('message'),audience:audience.value,target_user_ids:selected,
    starts_at:toIso(values.get('starts_at')),ends_at:toIso(values.get('ends_at')),
    require_acknowledgement:form.elements.require_acknowledgement.checked,is_active:true
   })});
   form.reset();targets.hidden=true;await loadAnnouncements();message('Aviso publicado. Ele será exibido aos alunos no próximo acesso.','success');
  }catch(error){message('Não foi possível publicar o aviso: '+error.message,'error');}
  finally{button.disabled=false;}
 });
}

/* ===== SESSÃO E INICIALIZAÇÃO ===== */
document.addEventListener('DOMContentLoaded',async()=>{
 try{
  const auth=await getCurrentUser();
  if(!['professor','admin'].includes(auth.user.role)){location.replace('/student/dashboard.html');return;}
  $('#professor-welcome').textContent='Olá, '+(auth.user.name||auth.user.email)+'.';
  await loadStudents();await loadSettings();await loadAnnouncements();bindAnnouncementForm();
 }catch(error){message('Não foi possível carregar as configurações: '+error.message,'error');}
 $('#logout')?.addEventListener('click',async()=>{try{await logout()}finally{location.replace('/student/pages/login.html')}});
});
