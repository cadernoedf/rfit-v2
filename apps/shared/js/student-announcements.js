/* ==========================================================================
   R-FIT | ÁREA DO ALUNO
   Componente compartilhado: avisos e pop-ups do portal.
   Carregado apenas nas páginas autenticadas do aluno.
   ========================================================================== */
async function loadStudentAnnouncements(){
 try{
  const response=await fetch('/api/student/announcements',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
  if(response.status===401||response.status===403)return;
  const data=await response.json();if(!response.ok||!data.ok)return;
  const queue=data.announcements||[];if(!queue.length)return;
  let current=0;
  const overlay=document.createElement('div');overlay.className='student-announcement-overlay';
  const dialog=document.createElement('section');dialog.className='student-announcement-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','student-announcement-title');
  const kicker=document.createElement('span');kicker.className='section-kicker';kicker.textContent='COMUNICADO R-FIT';
  const title=document.createElement('h2');title.id='student-announcement-title';
  const body=document.createElement('p');body.className='student-announcement-message';
  const footer=document.createElement('div');footer.className='student-announcement-footer';
  const counter=document.createElement('small');const close=document.createElement('button');close.type='button';close.className='primary-button';
  footer.append(counter,close);dialog.append(kicker,title,body,footer);overlay.append(dialog);document.body.append(overlay);
  async function showNext(){
   if(current>=queue.length){overlay.remove();return;}
   const item=queue[current];title.textContent=item.title;body.textContent=item.message;
   counter.textContent=(current+1)+' de '+queue.length;
   close.textContent=item.require_acknowledgement?'Li e entendi':'Fechar aviso';
   close.disabled=false;close.onclick=async()=>{
    close.disabled=true;
    try{await fetch('/api/student/announcements/'+encodeURIComponent(item.id)+'/read',{method:'POST',credentials:'same-origin',headers:{Accept:'application/json'}});}
    catch(error){console.warn('student_announcement_ack_failed',error);}
    current+=1;showNext();
   };
   close.focus();
  }
  showNext();
 }catch(error){console.warn('student_announcements_unavailable',error);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadStudentAnnouncements,{once:true});
else loadStudentAnnouncements();
