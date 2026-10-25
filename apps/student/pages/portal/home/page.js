/* R-Fit — módulo independente: home. */
import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';
document.addEventListener('DOMContentLoaded', async function () {
  const welcome=document.querySelector('#student-welcome');
  const message=document.querySelector('#page-message');
  try {
    const result=await getCurrentUser();
    if(result.user.role!=='student'){window.location.replace('/professor/');return;}
    welcome.textContent='Olá, '+(result.user.name||result.user.email)+'.';
    if(message) message.textContent='Sessão validada.';
  } catch(error) { window.location.replace('/student/pages/login.html'); return; }
  document.querySelector('#logout')?.addEventListener('click',async function(){this.disabled=true;try{await logout();}finally{window.location.replace('/student/pages/login.html');}});
});
