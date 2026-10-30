/* ==========================================================================
   R-FIT | PORTAL DO PROFESSOR
   Módulo: Perfil individual, treinos e dietas.
   ========================================================================== */
import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';

/* ===== IDENTIFICAÇÃO ===== */
const $=(selector)=>document.querySelector(selector);
const studentId=new URLSearchParams(location.search).get('id');
const message=(text,state='')=>{const el=$('#page-message');el.textContent=text;el.dataset.state=state;};
async function api(url,options={}){const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers:{Accept:'application/json','Content-Type':'application/json',...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.error||'request_failed');return data;}
const money=(cents)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(cents||0)/100);
function makeListItem(title,detail,status){const item=document.createElement('div');item.className='detail-record';const name=document.createElement('strong');name.textContent=title;const note=document.createElement('small');note.textContent=detail;const state=document.createElement('span');state.className='detail-record-status';state.textContent=status;item.append(name,note,state);return item;}

/* ===== RENDERIZAÇÃO DO PERFIL ===== */
function render(data){
 const s=data.student,sub=data.subscription;
 $('#student-title').textContent=s.full_name||'Aluno';
 const hero=$('#student-profile');hero.replaceChildren();
 const avatar=document.createElement('div');avatar.className='student-profile-avatar';
 if(s.avatar_url){const img=document.createElement('img');img.src=s.avatar_url;img.alt='';avatar.append(img)}else avatar.textContent=String(s.full_name||'R').trim().charAt(0).toUpperCase();
 const info=document.createElement('div');info.className='student-profile-info';
 const name=document.createElement('h2');name.textContent=s.full_name;
 const email=document.createElement('p');email.textContent=s.email;
 const badges=document.createElement('div');badges.className='student-profile-badges';
 [s.status==='active'?'Acesso ativo':s.status==='suspended'?'Acesso suspenso':'Aguardando ativação',sub?.plan_name||'Sem plano',sub?.status==='active'?'Assinatura ativa':sub?.status||'Sem assinatura'].forEach(text=>{const badge=document.createElement('span');badge.textContent=text;badges.append(badge)});
 info.append(name,email,badges);
 const actions=document.createElement('div');actions.className='student-profile-contact';const phone=document.createElement('span');phone.textContent=s.phone||'Telefone não informado';const goal=document.createElement('span');goal.textContent=s.goal||'Objetivo não informado';actions.append(phone,goal);
 hero.append(avatar,info,actions);
 const workoutBox=$('#student-workouts');workoutBox.replaceChildren();
 (data.workouts||[]).forEach(w=>workoutBox.append(makeListItem(w.title,(w.goal||'Sem objetivo')+' · '+w.weekly_frequency+'x por semana',w.status)));
 if(!(data.workouts||[]).length)workoutBox.textContent='Nenhum treino cadastrado.';
 const dietBox=$('#student-diets');dietBox.replaceChildren();
 (data.diets||[]).forEach(d=>dietBox.append(makeListItem(d.title,(d.goal||'Sem objetivo')+(d.calories_target?' · '+d.calories_target+' kcal':''),d.status)));
 if(!(data.diets||[]).length)dietBox.textContent='Nenhuma dieta cadastrada.';
 const measureBox=$('#student-measurements');measureBox.replaceChildren();
 (data.measurements||[]).forEach(m=>{const detail=[m.weight_kg?m.weight_kg+' kg':null,m.waist_cm?'Cintura '+m.waist_cm+' cm':null,m.body_fat_pct?'Gordura '+m.body_fat_pct+'%':null].filter(Boolean).join(' · ')||'Medidas registradas';measureBox.append(makeListItem(new Date(m.measured_at).toLocaleDateString('pt-BR'),detail,''));});
 if(!(data.measurements||[]).length)measureBox.textContent='Nenhuma avaliação registrada.';
}

/* ===== EDITOR DE TREINO ===== */
let workoutDayCount=0;
function addWorkoutDay(){
 if(workoutDayCount>=7)return;
 workoutDayCount++;
 const day=document.createElement('fieldset');day.className='workout-day-editor';
 const legend=document.createElement('legend');legend.textContent='Treino '+String.fromCharCode(64+workoutDayCount);day.append(legend);
 const title=document.createElement('input');title.placeholder='Nome do dia (ex.: Peito e tríceps)';title.maxLength=100;title.value='Treino '+String.fromCharCode(64+workoutDayCount);title.dataset.field='title';day.append(title);
 const exercise=document.createElement('input');exercise.placeholder='Exercício';exercise.maxLength=120;exercise.dataset.field='exercise';exercise.dataset.field='exercise';day.append(exercise);
 const sets=document.createElement('input');sets.type='number';sets.min='1';sets.max='20';sets.value='3';sets.dataset.field='sets';sets.setAttribute('aria-label','Séries');day.append(sets);
 const reps=document.createElement('input');reps.placeholder='Repetições';reps.value='12';reps.dataset.field='reps';reps.setAttribute('aria-label','Repetições');day.append(reps);
 const more=document.createElement('button');more.type='button';more.className='secondary-button';more.textContent='Adicionar exercício';more.addEventListener('click',()=>{const row=document.createElement('div');row.className='workout-exercise-editor';[['exercise','Exercício'],['sets','Séries'],['reps','Repetições']].forEach(([field,placeholder])=>{const input=document.createElement('input');input.dataset.field=field;input.placeholder=placeholder;if(field==='sets'){input.type='number';input.min='1';input.max='20';input.value='3'}if(field==='reps')input.value='12';row.append(input)});day.insertBefore(row,more);});day.append(more);$('#workout-days').append(day);
}
function collectWorkoutDays(){return Array.from(document.querySelectorAll('.workout-day-editor')).map(day=>{const title=day.querySelector('[data-field=title]')?.value||'Dia';const rows=[day,...day.querySelectorAll('.workout-exercise-editor')];const exercises=rows.map(row=>({name:row.querySelector('[data-field=exercise]')?.value||'',sets:Number(row.querySelector('[data-field=sets]')?.value||3),reps:row.querySelector('[data-field=reps]')?.value||'12'})).filter(x=>x.name.trim());return{title,exercises};});}

/* ===== EDITOR DE DIETA ===== */
function addDietMeal(){
 const meal=document.createElement('fieldset');meal.className='diet-meal-editor';const title=document.createElement('input');title.placeholder='Nome da refeição (ex.: Café da manhã)';title.maxLength=100;title.dataset.field='name';
 const items=document.createElement('textarea');items.rows=3;items.placeholder='Um alimento por linha';items.dataset.field='items';
 meal.append(title,items);$('#diet-meals').append(meal);
}
function collectDietMeals(){return Array.from(document.querySelectorAll('.diet-meal-editor')).map(meal=>({name:meal.querySelector('[data-field=name]').value,items:meal.querySelector('[data-field=items]').value.split('\n').map(v=>v.trim()).filter(Boolean)})).filter(m=>m.name.trim());}

/* ===== INICIALIZAÇÃO E SALVAMENTO ===== */
document.addEventListener('DOMContentLoaded',async()=>{
 try{const auth=await getCurrentUser();if(!['professor','admin'].includes(auth.user.role)){location.replace('/student/dashboard.html');return;}$('#professor-welcome').textContent='Olá, '+(auth.user.name||auth.user.email)+'.';}
 catch{location.replace('/student/pages/login.html');return;}
 if(!studentId){message('Identificador do aluno não informado.');return;}
 try{render(await api('/api/professor/students/'+encodeURIComponent(studentId)));}catch(error){message('Não foi possível carregar o aluno: '+error.message);}
 $('#add-workout-day').addEventListener('click',addWorkoutDay);addWorkoutDay();
 $('#workout-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type=submit]'),days=collectWorkoutDays();if(!days.length){message('Adicione pelo menos um dia de treino.','error');return;}button.disabled=true;try{const fd=new FormData(form);await api('/api/professor/students/'+encodeURIComponent(studentId)+'/workouts',{method:'POST',body:JSON.stringify({title:fd.get('title'),goal:fd.get('goal'),weekly_frequency:Number(fd.get('weekly_frequency')),sessions:days})});form.reset();$('#workout-days').replaceChildren();workoutDayCount=0;addWorkoutDay();render(await api('/api/professor/students/'+encodeURIComponent(studentId)));message('Treino cadastrado e vinculado ao aluno.','success');}catch(error){message('Não foi possível salvar o treino: '+error.message,'error');}finally{button.disabled=false;}});
 $('#add-diet-meal').addEventListener('click',addDietMeal);addDietMeal();
 $('#diet-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type=submit]'),meals=collectDietMeals();if(!meals.length){message('Adicione pelo menos uma refeição.','error');return;}button.disabled=true;try{const fd=new FormData(form);await api('/api/professor/students/'+encodeURIComponent(studentId)+'/diets',{method:'POST',body:JSON.stringify({title:fd.get('title'),goal:fd.get('goal'),calories_target:fd.get('calories_target')||null,meals})});form.reset();$('#diet-meals').replaceChildren();addDietMeal();render(await api('/api/professor/students/'+encodeURIComponent(studentId)));message('Dieta cadastrada e vinculada ao aluno.','success');}catch(error){message('Não foi possível salvar a dieta: '+error.message,'error');}finally{button.disabled=false;}});
 $('#logout')?.addEventListener('click',async()=>{try{await logout()}finally{location.replace('/student/pages/login.html')}});
});
