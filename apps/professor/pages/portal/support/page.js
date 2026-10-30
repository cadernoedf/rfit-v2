/* R-Fit | caixa de entrada privada do professor. */
import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';
const $=selector=>document.querySelector(selector);
let selectedStudent=null;
const dateLabel=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});};
function initials(name){return String(name||'Aluno').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase();}
async function loadInbox(){
 const box=$('#support-conversations');box.innerHTML='<div class="support-list-empty">Atualizando caixa de entrada…</div>';
 try{const response=await fetch('/api/professor/support',{credentials:'same-origin',cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error(result.error||'inbox_failed');const rows=result.conversations||[];$('#support-total').textContent=rows.length;box.replaceChildren();
  if(!rows.length){box.innerHTML='<div class="support-list-empty">Nenhuma mensagem recebida ainda.<br>Quando um aluno escrever, a conversa aparecerá aqui.</div>';return;}
  rows.forEach(item=>{const button=document.createElement('button');button.type='button';button.className='support-conversation'+(selectedStudent===item.student_id?' active':'');button.dataset.studentId=item.student_id;
   const avatar=document.createElement('span');avatar.className='support-conversation-avatar';avatar.textContent=initials(item.full_name);
   const body=document.createElement('span');body.className='support-conversation-body';const top=document.createElement('span');top.className='support-conversation-top';const name=document.createElement('strong');name.textContent=item.full_name||'Aluno';const time=document.createElement('time');time.textContent=dateLabel(item.last_message_at);top.append(name,time);
   const preview=document.createElement('span');preview.className='support-conversation-preview';preview.textContent=(item.last_sender_role==='student'?'Aluno: ':'Você: ')+(item.last_message||'');body.append(top,preview);
   if(Number(item.unread_count)>0){const unread=document.createElement('span');unread.className='support-unread';unread.textContent=String(item.unread_count);body.append(unread);}
   button.append(avatar,body);button.addEventListener('click',()=>openConversation(item.student_id,item.full_name,item.avatar_url));box.append(button);
  });
 }catch(error){box.innerHTML='<div class="support-list-empty">Não foi possível carregar as conversas.</div>';console.error(error);}
}
function renderMessages(messages){
 const box=$('#support-chat-messages');box.replaceChildren();
 if(!messages.length){box.innerHTML='<div class="support-chat-placeholder"><span>✉</span><strong>Conversa iniciada</strong><p>Envie uma mensagem para orientar este aluno.</p></div>';return;}
 messages.forEach(item=>{const mine=item.sender_role!=='student',row=document.createElement('div'),bubble=document.createElement('div'),time=document.createElement('time');row.className='admin-message '+(mine?'professor':'student');bubble.className='admin-message-bubble';bubble.textContent=item.body;time.textContent=(mine?'Você':'Aluno')+' · '+dateLabel(item.created_at);row.append(bubble,time);box.append(row);});box.scrollTop=box.scrollHeight;
}
async function openConversation(id,name){
 selectedStudent=id;document.querySelectorAll('.support-conversation').forEach(item=>item.classList.toggle('active',item.dataset.studentId===id));
 const head=$('#support-chat-head');head.replaceChildren();const avatar=document.createElement('div');avatar.className='admin-chat-avatar';avatar.textContent=initials(name);const info=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=name||'Aluno';small.textContent='Conversa privada · somente você e este aluno';info.append(strong,small);head.append(avatar,info);
 $('#support-reply').disabled=false;$('#support-reply-send').disabled=false;$('#support-chat-messages').innerHTML='<div class="support-chat-placeholder">Carregando histórico…</div>';
 try{const response=await fetch('/api/professor/support/'+encodeURIComponent(id)+'/messages',{credentials:'same-origin',cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error(result.error||'thread_failed');renderMessages(result.messages||[]);await loadInbox();}
 catch(error){$('#support-chat-messages').textContent='Não foi possível abrir esta conversa.';console.error(error);}
}
document.addEventListener('DOMContentLoaded',async()=>{
 try{const result=await getCurrentUser();if(!['professor','admin'].includes(result.user.role)){window.location.replace('/student/dashboard.html');return;}$('#professor-welcome').textContent='Olá, '+(result.user.name||result.user.email)+'.';await loadInbox();}
 catch(error){window.location.replace('/student/pages/login.html');return;}
 $('#support-reload').addEventListener('click',loadInbox);
 $('#support-reply-form').addEventListener('submit',async event=>{event.preventDefault();if(!selectedStudent)return;const input=$('#support-reply'),button=$('#support-reply-send'),message=input.value.trim();if(!message)return;button.disabled=true;
  try{const response=await fetch('/api/professor/support/'+encodeURIComponent(selectedStudent)+'/messages',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});const result=await response.json();if(!response.ok)throw new Error(result.error||'reply_failed');input.value='';const active=document.querySelector('.support-conversation.active');if(active)await openConversation(selectedStudent,active.querySelector('strong')?.textContent||'Aluno');}
  catch(error){$('#page-message').textContent='Não foi possível enviar a resposta.';console.error(error);}
  finally{button.disabled=false;input.focus();}
 });
 $('#logout')?.addEventListener('click',async function(){this.disabled=true;try{await logout();}finally{window.location.replace('/student/pages/login.html');}});
});
