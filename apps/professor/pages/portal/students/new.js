/* ==========================================================================
   R-FIT | PORTAL DO PROFESSOR
   Módulo: Cadastro administrativo de aluno
   A senha temporária é exibida uma única vez após a criação.
   ========================================================================== */
import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';
const $=(selector)=>document.querySelector(selector);
async function api(url,options={}){const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers:{Accept:'application/json','Content-Type':'application/json',...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.error||'request_failed');return data;}
document.addEventListener('DOMContentLoaded',async()=>{
 try{const auth=await getCurrentUser();if(!['professor','admin'].includes(auth.user.role)){location.replace('/student/dashboard.html');return;}$('#professor-welcome').textContent='Olá, '+(auth.user.name||auth.user.email)+'.';}
 catch{location.replace('/student/pages/login.html');return;}
 const form=$('#student-create-form'),select=$('#student-plan'),courtesy=$('#student-courtesy'),delay=$('#billing-delay-wrap'),message=$('#page-message'),result=$('#student-created');
 try{const data=await api('/api/professor/plans');select.replaceChildren(new Option('Selecione um plano',''));(data.plans||[]).filter(p=>p.is_active).forEach(plan=>{const option=new Option(plan.name+' · '+(Number(plan.price_cents||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),plan.id);select.add(option);});if(select.options.length===1)message.textContent='Cadastre um plano ativo antes de adicionar alunos.';}
 catch(error){message.textContent='Não foi possível carregar os planos: '+error.message;}
 courtesy.addEventListener('change',()=>{delay.hidden=courtesy.checked;form.elements.billing_delay_days.required=!courtesy.checked;});
 form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;message.textContent='Criando cadastro…';result.hidden=true;
  try{const values=new FormData(form);const data=await api('/api/professor/students',{method:'POST',body:JSON.stringify({name:values.get('name'),email:values.get('email'),phone:values.get('phone'),plan_id:values.get('plan_id'),courtesy:courtesy.checked,billing_delay_days:Number(values.get('billing_delay_days')||0)})});
   result.replaceChildren();const title=document.createElement('h3');title.textContent='Aluno cadastrado com sucesso';const detail=document.createElement('p');detail.textContent=data.student.name+' · '+data.student.email+' · '+data.student.plan_name;
   const note=document.createElement('p');note.textContent=data.student.courtesy?'Acesso cortesia liberado.':'Data prevista para início da cobrança: '+new Date(data.student.billing_starts_at).toLocaleDateString('pt-BR')+'. A cobrança não será automática nesta etapa.';
   const passLabel=document.createElement('strong');passLabel.textContent='Senha temporária (copie e entregue ao aluno):';
   const pass=document.createElement('code');pass.className='temporary-password';pass.textContent=data.temporary_password;
   const copy=document.createElement('button');copy.type='button';copy.className='secondary-button';copy.textContent='Copiar senha';copy.addEventListener('click',async()=>{await navigator.clipboard.writeText(data.temporary_password);copy.textContent='Senha copiada';});
   result.append(title,detail,note,passLabel,pass,copy);result.hidden=false;form.reset();delay.hidden=false;message.textContent='A senha temporária só é exibida nesta tela. Guarde-a antes de sair.';
  }catch(error){message.textContent=error.message==='email_already_registered'?'Este e-mail já está cadastrado.': 'Não foi possível cadastrar: '+error.message;}
  finally{button.disabled=false;}
 });
 $('#logout')?.addEventListener('click',async()=>{try{await logout()}finally{location.replace('/student/pages/login.html')}});
});
