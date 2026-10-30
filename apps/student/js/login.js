/* R-FIT V2 | PÁGINA DE LOGIN DO ALUNO */
import { loginStudent } from '../../shared/js/api-client.js';

const errorMessages = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  auth_not_configured: 'O login está sem configuração no servidor. Avise o administrador.',
  auth_database_error: 'O servidor não conseguiu consultar o banco de dados. Código: auth_database_error.',
  origin_not_allowed: 'A origem desta página não foi autorizada pelo servidor.',
  invalid_json: 'Os dados enviados estão inválidos.',
};

async function loadPortalPresentation(){
 try{
  const response=await fetch('/api/public/portal-config',{credentials:'same-origin',cache:'no-store'});
  const data=await response.json();if(!response.ok||!data.ok)return;
  const settings=data.settings||{};
  const title=document.querySelector('.login-title'),intro=document.querySelector('#login-message-intro');
  if(title&&settings.login_title)title.textContent=settings.login_title;
  if(intro&&settings.login_message)intro.textContent=settings.login_message;
  const list=document.querySelector('#login-featured-list'),section=document.querySelector('#login-featured');
  const students=data.top_students||[];
  if(list&&section&&students.length){
   list.replaceChildren();
   students.slice(0,5).forEach((student,index)=>{
    const item=document.createElement('div');item.className='login-featured-item';
    const rank=document.createElement('span');rank.className='login-featured-rank';rank.textContent=String(index+1).padStart(2,'0');
    const avatar=document.createElement('span');avatar.className='login-featured-avatar';
    if(student.avatar_url){const image=document.createElement('img');image.src=student.avatar_url;image.alt='';avatar.append(image)}else avatar.textContent=String(student.full_name||'R').trim().charAt(0).toUpperCase();
    const name=document.createElement('strong');name.textContent=student.full_name||'Aluno R-Fit';item.append(rank,avatar,name);list.append(item);
   });
   section.hidden=false;
  }
 }catch(error){console.warn('rfit_login_presentation_unavailable',error);}
}

document.addEventListener('DOMContentLoaded', () => {
  loadPortalPresentation();
  const form = document.querySelector('#student-login');
  const message = document.querySelector('#login-message');
  if (!form || !message) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    message.textContent = 'Verificando acesso…';
    message.dataset.state = 'pending';

    try {
      const data = new FormData(form);
      const result = await loginStudent(
        String(data.get('email') || ''),
        String(data.get('password') || '')
      );
      message.textContent = 'Acesso confirmado.';
      message.dataset.state = 'success';
      window.location.assign(result.redirect);
    } catch (error) {
      const code = String(error?.message || 'login_failed');
      message.textContent = errorMessages[code] || `Falha no login (código: ${code}). Tente novamente ou envie esse código ao administrador.`;
      message.dataset.state = 'error';
      button.disabled = false;
    }
  });
});
