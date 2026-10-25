import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';
document.addEventListener('DOMContentLoaded',async()=>{
 const welcome=document.querySelector('#professor-welcome'),form=document.querySelector('#settings-form'),message=document.querySelector('#page-message');
 try{
  const auth=await getCurrentUser();if(!['professor','admin'].includes(auth.user.role)){location.replace('/student/dashboard.html');return;}welcome.textContent='Olá, '+(auth.user.name||auth.user.email)+'.';
  const r=await fetch('/api/professor/settings',{credentials:'same-origin',cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.error||'settings_unavailable');
  for(const key of ['consultancy_name','login_title','login_message'])form.elements[key].value=d.settings?.[key]?.value||'';
  for(const key of ['registration_enabled','maintenance_mode'])form.elements[key].checked=(d.settings?.[key]?.value||'false')==='true';
  form.addEventListener('submit',async e=>{e.preventDefault();const b=form.querySelector('button[type=submit]');b.disabled=true;const settings={};for(const key of ['consultancy_name','login_title','login_message'])settings[key]=form.elements[key].value;for(const key of ['registration_enabled','maintenance_mode'])settings[key]=String(form.elements[key].checked);try{const res=await fetch('/api/professor/settings',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings})});const out=await res.json();if(!res.ok)throw new Error(out.error||'save_failed');message.textContent='Configurações salvas no banco de dados.'}catch(err){message.textContent='Não foi possível salvar: '+err.message}finally{b.disabled=false}});
  message.textContent='Configurações carregadas.';
 }catch(e){message.textContent='Não foi possível carregar configurações. '+(e.message||'')}
 document.querySelector('#logout')?.addEventListener('click',async()=>{try{await logout()}finally{location.replace('/student/pages/login.html')}});
});
