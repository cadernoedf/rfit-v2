/* R-Fit — módulo independente: suporte. */
import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';
document.addEventListener('DOMContentLoaded', async function () {
  try { const result=await getCurrentUser(); if(result.user.role!=='student'){window.location.replace('/professor/');return;} document.querySelector('#student-welcome').textContent='Olá, '+(result.user.name||result.user.email)+'.'; document.querySelector('#page-message').textContent='Sessão validada.'; }
  catch(error){window.location.replace('/student/pages/login.html');return;}
  document.querySelector('#logout')?.addEventListener('click',async function(){this.disabled=true;try{await logout();}finally{window.location.replace('/student/pages/login.html');}});
});
