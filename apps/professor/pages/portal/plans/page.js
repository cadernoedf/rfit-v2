/* R-Fit — módulo independente do professor: plans. */
import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';
document.addEventListener('DOMContentLoaded', async function () {
 const welcome=document.querySelector('#professor-welcome'); const message=document.querySelector('#page-message');
 try { const result=await getCurrentUser(); if(!['professor','admin'].includes(result.user.role)){window.location.replace('/student/dashboard.html');return;} welcome.textContent='Olá, '+(result.user.name||result.user.email)+'.'; if(message)message.textContent='Sessão validada.'; }
 catch(error){window.location.replace('/student/pages/login.html');return;}
 document.querySelector('#logout')?.addEventListener('click',async function(){this.disabled=true;try{await logout();}finally{window.location.replace('/student/pages/login.html');}});
});
