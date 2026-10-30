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
 const checkinModal=document.getElementById('daily-checkin-modal');
 const openCheckin=()=>{if(checkinModal){checkinModal.hidden=false;document.body.style.overflow='hidden';}};
 const closeCheckin=()=>{if(checkinModal){checkinModal.hidden=true;document.body.style.overflow='';}};
 document.getElementById('open-daily-checkin')?.addEventListener('click',openCheckin);
 document.getElementById('close-daily-checkin')?.addEventListener('click',closeCheckin);
 document.getElementById('cancel-daily-checkin')?.addEventListener('click',closeCheckin);
 checkinModal?.addEventListener('click',event=>{if(event.target===checkinModal)closeCheckin();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&checkinModal&&!checkinModal.hidden)closeCheckin();});
 checkinModal?.querySelectorAll('.daily-checkin-scale').forEach(group=>{
   const name=group.dataset.name;
   for(let value=1;value<=5;value++){const button=document.createElement('button');button.type='button';button.textContent=String(value);button.setAttribute('aria-pressed',value===3?'true':'false');button.addEventListener('click',()=>{group.querySelectorAll('button').forEach(item=>item.setAttribute('aria-pressed','false'));button.setAttribute('aria-pressed','true');group.dataset.value=String(value)});group.append(button)}
   group.dataset.value='3';
 });
 ['training_adherence','nutrition_adherence'].forEach(name=>{
   const input=checkinModal?.querySelector('[name="'+name+'"]');const output=document.getElementById(name==='training_adherence'?'training-adherence-value':'nutrition-adherence-value');
   input?.addEventListener('input',()=>{if(output)output.textContent=input.value+'%'});
 });
 document.getElementById('daily-checkin-form')?.addEventListener('submit',async event=>{
   event.preventDefault();
   const form=event.currentTarget,status=document.getElementById('daily-checkin-message'),button=form.querySelector('[type="submit"]');
   const selected=name=>Number(checkinModal.querySelector('[data-name="'+name+'"]')?.dataset.value||0);
   const formData=new FormData(form);
   const payload={weight_kg:formData.get('weight_kg')||null,sleep_quality:selected('sleep_quality'),energy:selected('energy'),appetite:selected('appetite'),training_adherence:Number(formData.get('training_adherence')),nutrition_adherence:Number(formData.get('nutrition_adherence')),discomfort:formData.has('discomfort'),notes:String(formData.get('notes')||'').trim()};
   if(!payload.sleep_quality||!payload.energy||!payload.appetite){if(status)status.textContent='Selecione uma nota de 1 a 5 em cada avaliação.';return;}
   if(button){button.disabled=true;button.textContent='Enviando…';}
   if(status)status.textContent='Salvando seu check-in…';
   try{
     const response=await fetch('/api/student/checkin',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});
     const result=await response.json();
     if(!response.ok||!result.ok)throw new Error(result.error||'checkin_save_failed');
     if(status)status.textContent='✓ Check-in salvo com sucesso!';
     form.reset();
     checkinModal.querySelectorAll('.daily-checkin-scale').forEach(group=>{group.dataset.value='3';group.querySelectorAll('button').forEach((item,index)=>item.setAttribute('aria-pressed',index===2?'true':'false'));});
     ['training-adherence-value','nutrition-adherence-value'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='80%';});
     setTimeout(closeCheckin,900);
   }catch(error){if(status)status.textContent=error.message==='invalid_checkin_fields'?'Confira as notas de sono, energia e apetite.':'Não foi possível salvar agora. Tente novamente.';console.error('daily_checkin_submit_failed',error);}
   finally{if(button){button.disabled=false;button.textContent='Enviar check-in';}}
 });
 document.querySelector('#logout')?.addEventListener('click',async function(){this.disabled=true;try{await logout()}finally{location.replace('/student/pages/login.html')}});
});