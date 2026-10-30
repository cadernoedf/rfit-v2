/* R-Fit | mensageiro privado aluno-professor. */
import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';
const $=selector=>document.querySelector(selector);
const dateLabel=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});};
function renderMessages(messages){
 const box=$('#support-messages');box.replaceChildren();
 if(!messages.length){const empty=document.createElement('div');empty.className='messenger-empty';empty.innerHTML='<span>✉</span><strong>Seu canal direto com o professor</strong><p>Envie sua primeira mensagem para começar.</p>';box.append(empty);return;}
 messages.forEach(item=>{const mine=item.sender_role==='student',row=document.createElement('div'),bubble=document.createElement('div'),meta=document.createElement('small');row.className='message-row '+(mine?'mine':'theirs');bubble.className='message-bubble';bubble.textContent=item.body;meta.className='message-meta';meta.textContent=(mine?'Você':'Professor')+' · '+dateLabel(item.created_at);row.append(bubble,meta);box.append(row);});
 box.scrollTop=box.scrollHeight;
}
async function loadMessages(){
 const box=$('#support-messages');try{const response=await fetch('/api/student/support/messages',{credentials:'same-origin',cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error(result.error||'support_unavailable');renderMessages(result.messages||[]);$('#page-message').textContent='';}
 catch(error){$('#page-message').textContent='Não foi possível carregar as mensagens. Tente atualizar.';console.error(error);}
}
document.addEventListener('DOMContentLoaded',async()=>{
 try{const result=await getCurrentUser();if(result.user.role!=='student'){window.location.replace('/professor/');return;}$('#student-welcome').textContent='Olá, '+(result.user.name||result.user.email)+'.';await loadMessages();}
 catch(error){window.location.replace('/student/pages/login.html');return;}
 $('#support-refresh').addEventListener('click',loadMessages);
 $('#support-form').addEventListener('submit',async event=>{
  event.preventDefault();const input=$('#support-input'),button=$('#support-send'),message=input.value.trim();if(!message)return;
  button.disabled=true;$('#page-message').textContent='Enviando…';
  try{const response=await fetch('/api/student/support/messages',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});const result=await response.json();if(!response.ok)throw new Error(result.error||'send_failed');input.value='';await loadMessages();}
  catch(error){$('#page-message').textContent='Não foi possível enviar. Tente novamente.';console.error(error);}
  finally{button.disabled=false;input.focus();}
 });
 $('#logout')?.addEventListener('click',async function(){this.disabled=true;try{await logout();}finally{window.location.replace('/student/pages/login.html');}});
});
