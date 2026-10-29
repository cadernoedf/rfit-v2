/* R-Fit — painel inicial compacto, com dados reais da anamnese e das avaliações. */
import {getCurrentUser,logout} from '../../../../shared/js/api-client.js';
document.addEventListener('DOMContentLoaded',async()=>{
 const welcome=document.querySelector('#student-welcome'),message=document.querySelector('#page-message');
 const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
 const fmt=(v,unit='')=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?'—':String(v).replace('.',',')+unit;
 const dateFmt=value=>{if(!value)return 'Sem avaliação registrada';const d=new Date(value);return Number.isNaN(d.getTime())?'':'Atualizado em '+d.toLocaleDateString('pt-BR')};
 try{
  const auth=await getCurrentUser();if(auth.user.role!=='student'){location.replace('/professor/');return}
  welcome.textContent='Olá, '+(auth.user.name||auth.user.email)+'.';
  const response=await fetch('/api/student/dashboard',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'dashboard_unavailable');
  const student=data.student||{},name=student.name||auth.user.name||'Aluno';
  set('home-profile-name',name);set('home-profile-email',student.email||auth.user.email||'');
  set('home-avatar-initial',name.trim().charAt(0).toUpperCase()||'A');
  const avatar=document.getElementById('home-avatar');if(student.avatar_url){avatar.src=student.avatar_url;avatar.hidden=false;document.getElementById('home-avatar-initial').hidden=true}else{avatar.hidden=true;document.getElementById('home-avatar-initial').hidden=false}
  const sub=data.subscription;
  set('home-plan-name',sub?.plan_name||'Sem plano ativo');
  set('home-plan-days',!sub?'Escolha seu plano':Number(sub.lifetime)?'Acesso vitalício':sub.days_remaining===null||sub.days_remaining===undefined?'Validade não informada':'Restam '+sub.days_remaining+' '+(sub.days_remaining===1?'dia':'dias'));
  const body=data.body||{};
  set('home-weight',fmt(body.weight_kg,' kg'));
  set('home-weight-date',dateFmt(body.measured_at||data.anamnesis_completed_at));
  set('home-bmi',fmt(body.bmi));
  set('home-waist',fmt(body.waist_cm,' cm'));
  set('home-measure-date',dateFmt(body.measured_at));
  set('home-workout-title',data.workout_title||'Meu treino');
  set('home-workout-text',data.workout_available?'Novo treino disponível — confira sua prescrição.':'Seu treino aparecerá aqui quando for publicado.');
  set('home-diet-title',data.diet_title||'Minha dieta');
  set('home-diet-text',data.diet_available?'Sua dieta está disponível para consulta.':'Sua dieta aparecerá aqui quando for publicada.');
  const reminder=document.querySelector('#anamnesis-reminder');
  const anamnesis=await fetch('/api/student/anamnesis/status',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
  if(reminder&&anamnesis?.has_active_plan&&!anamnesis.completed)reminder.hidden=false;
  if(message)message.textContent='';
 }catch(error){if(message)message.textContent='Não foi possível carregar todos os dados do painel. Atualize a página para tentar novamente.';console.error('student_home_dashboard_failed',error)}
 document.querySelector('#logout')?.addEventListener('click',async function(){this.disabled=true;try{await logout()}finally{location.replace('/student/pages/login.html')}});
});