import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';
document.addEventListener('DOMContentLoaded',async()=>{
 const welcome=document.querySelector('#professor-welcome'),list=document.querySelector('#students-list'),message=document.querySelector('#page-message');
 try{
  const auth=await getCurrentUser();if(!['professor','admin'].includes(auth.user.role)){location.replace('/student/dashboard.html');return;}
  welcome.textContent='Olá, '+(auth.user.name||auth.user.email)+'.';
  const response=await fetch('/api/professor/students',{credentials:'same-origin',cache:'no-store'}),data=await response.json();if(!response.ok)throw new Error(data.error||'students_unavailable');
  list.replaceChildren();
  const search=document.createElement('input');search.type='search';search.placeholder='Buscar aluno por nome ou e-mail';search.className='search-field';search.setAttribute('aria-label','Buscar aluno');list.append(search);
  const table=document.createElement('div');table.className='table-wrap';const t=document.createElement('table');t.className='student-table';
  const head=document.createElement('thead'),hr=document.createElement('tr');['Aluno','E-mail','Plano','Pagamento','Status','Ação'].forEach(v=>{const th=document.createElement('th');th.textContent=v;hr.append(th)});head.append(hr);const body=document.createElement('tbody');t.append(head,body);table.append(t);list.append(table);
  const students=data.students||[];
  function render(){body.replaceChildren();const q=search.value.trim().toLowerCase();students.filter(s=>[s.full_name,s.email,s.plan_name].some(v=>String(v||'').toLowerCase().includes(q))).forEach(s=>{const tr=document.createElement('tr');[s.full_name||'—',s.email||'—',s.plan_name||'Sem plano',s.payment_status||'—',s.status||'—'].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});const td=document.createElement('td'),select=document.createElement('select');['active','pending','suspended'].forEach(status=>{const op=document.createElement('option');op.value=status;op.textContent=({active:'Ativo',pending:'Pendente',suspended:'Suspenso'})[status];select.append(op)});select.value=s.status;select.setAttribute('aria-label','Alterar status de '+(s.full_name||s.email));select.addEventListener('change',async()=>{select.disabled=true;try{const r=await fetch('/api/professor/students/'+encodeURIComponent(s.id)+'/status',{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:select.value})});if(!r.ok)throw new Error('status_update_failed');s.status=select.value;message.textContent='Status do aluno atualizado.'}catch(e){select.value=s.status;message.textContent='Não foi possível alterar o status.'}finally{select.disabled=false}});td.append(select);tr.append(td);body.append(tr)});}
  search.addEventListener('input',render);render();message.textContent=students.length+' aluno(s) carregado(s).';
 }catch(e){message.textContent='Não foi possível carregar alunos. '+(e.message||'')}
 document.querySelector('#logout')?.addEventListener('click',async()=>{try{await logout()}finally{location.replace('/student/pages/login.html')}});
});
