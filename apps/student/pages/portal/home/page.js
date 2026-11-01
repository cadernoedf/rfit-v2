/* R-Fit — painel inicial compacto, com dados reais da anamnese e das avaliações. */
import {getCurrentUser,logout} from '../../../../shared/js/api-client.js';
document.addEventListener('DOMContentLoaded',async()=>{
 const welcome=document.querySelector('#student-welcome'),message=document.querySelector('#page-message');
 const achievementPopover=document.getElementById('home-achievement-popover');
 const achievementBell=document.getElementById('home-achievement-bell');
 const closeAchievements=()=>{if(achievementPopover)achievementPopover.hidden=true;achievementBell?.setAttribute('aria-expanded','false');};
 const loadHomeGamification=async()=>{
  try{
   const response=await fetch('/api/student/gamification',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'gamification_unavailable');
   const xp=Number(data.xp||0);
    const nextAchievement=(data.achievements||[]).find(item=>!item.unlocked);
    const trophyName=document.getElementById('home-next-achievement');if(trophyName)trophyName.textContent=nextAchievement?nextAchievement.icon+' '+nextAchievement.title:'Coleção completa!';
    const trophyDesc=document.getElementById('home-next-achievement-description');if(trophyDesc)trophyDesc.textContent=nextAchievement?(nextAchievement.description||'Continue registrando sua evolução.'):'Você desbloqueou todas as conquistas disponíveis.';
    const trophyXp=document.getElementById('home-next-achievement-xp');if(trophyXp)trophyXp.textContent=nextAchievement?'Recompensa: +'+Number(nextAchievement.xp||0)+' XP':'';
   const level=document.getElementById('home-achievement-level');if(level)level.textContent=String(data.level||1);
   const title=document.getElementById('home-achievement-title');if(title)title.textContent='Nível '+data.level+' · '+data.level_name;
   const total=document.getElementById('home-achievement-xp');if(total)total.textContent=xp.toLocaleString('pt-BR')+' XP acumulados';
   const bar=document.getElementById('home-achievement-progress');if(bar)bar.style.width=(data.progress_percent||0)+'%';
   const next=document.getElementById('home-achievement-next');if(next)next.textContent=data.next_level?'Faltam '+Number(data.next_level.remaining).toLocaleString('pt-BR')+' XP para '+data.next_level.name:'Nível máximo alcançado!';
    const unlockedCount=document.getElementById('home-achievement-unlocked-count');if(unlockedCount)unlockedCount.textContent=Number(data.unlocked_count||0)+' de '+Number(data.total_achievements||0)+' troféus desbloqueados';
   const list=document.getElementById('home-achievement-recent');if(list){list.replaceChildren();const recent=(data.achievements||[]).filter(item=>item.unlocked).sort((a,b)=>new Date(b.unlocked_at)-new Date(a.unlocked_at)).slice(0,3);if(!recent.length){const empty=document.createElement('small');empty.textContent='Suas primeiras conquistas aparecerão aqui.';list.append(empty);}else recent.forEach(item=>{const row=document.createElement('article'),icon=document.createElement('span'),copy=document.createElement('div'),name=document.createElement('strong'),earned=document.createElement('small');icon.textContent=item.icon;name.textContent=item.title;earned.textContent='+'+item.xp+' XP';copy.append(name,earned);row.append(icon,copy);list.append(row);});}
  }catch(error){console.warn('home_gamification_unavailable',error);}
 };
 achievementBell?.addEventListener('click',async()=>{const opening=achievementPopover?.hidden===true;if(!achievementPopover)return;if(opening){closeNotifications();achievementPopover.hidden=false;achievementBell.setAttribute('aria-expanded','true');await loadHomeGamification();}else closeAchievements();});
 document.getElementById('home-achievement-close')?.addEventListener('click',closeAchievements);
 const notificationList=document.getElementById('home-notification-list');
 const notificationPopover=document.getElementById('home-notification-popover');
 const notificationBell=document.getElementById('home-notification-bell');
 const closeNotifications=()=>{if(notificationPopover)notificationPopover.hidden=true;notificationBell?.setAttribute('aria-expanded','false');};
 const notificationCount=document.getElementById('home-notification-count');
 const readAllButton=document.getElementById('home-notification-read-all');
 const escapeNotification=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const renderHomeNotifications=async()=>{
  if(!notificationList)return;
  try{
   const response=await fetch('/api/student/notifications',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'notifications_unavailable');
   const items=Array.isArray(result.notifications)?result.notifications:[];
   const unread=Number(result.unread_count||0);
   if(notificationCount){notificationCount.textContent=unread>99?'99+':String(unread);notificationCount.hidden=unread===0;}
   if(readAllButton)readAllButton.hidden=unread===0;
   if(!items.length){notificationList.innerHTML='<div class="home-notification-empty">Você está em dia! Nenhuma notificação por enquanto.</div>';return;}
   notificationList.innerHTML=items.map(item=>{
    const date=item.created_at?new Date(item.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';
    const href=item.url&&item.url.startsWith('/student/')?item.url:'#';
    return '<article class="home-notification-item '+(item.is_read?'read':'unread')+'"><span class="home-notification-dot" aria-hidden="true"></span><span class="home-notification-copy"><strong>'+escapeNotification(item.title)+'</strong><small>'+escapeNotification(item.message)+'</small><time>'+escapeNotification(date)+'</time></span>'+(item.is_read?'':'<button class="home-notification-read" type="button" data-notification-read="'+escapeNotification(item.id)+'">Marcar como lida</button>')+(href!=='#'?'<a class="home-notification-read" href="'+escapeNotification(href)+'" data-notification-open="'+escapeNotification(item.id)+'">Ver</a>':'')+'</article>';
   }).join('');
  }catch(error){notificationList.innerHTML='<div class="home-notification-empty">Não foi possível carregar as notificações agora.</div>';console.warn('home_notifications_unavailable',error);}
 };
 notificationList?.addEventListener('click',async event=>{
  const read=event.target.closest('[data-notification-read]');
  const open=event.target.closest('[data-notification-open]');
  const id=read?.dataset.notificationRead||open?.dataset.notificationOpen;
  if(!id)return;
  try{const response=await fetch('/api/student/notifications/'+encodeURIComponent(id)+'/read',{method:'POST',credentials:'same-origin',headers:{Accept:'application/json'}});if(response.ok&&read)renderHomeNotifications();}
  catch(error){console.warn('home_notification_read_failed',error);}
 });
 readAllButton?.addEventListener('click',async()=>{readAllButton.disabled=true;try{const response=await fetch('/api/student/notifications/read-all',{method:'POST',credentials:'same-origin',headers:{Accept:'application/json'}});if(response.ok)await renderHomeNotifications();}finally{readAllButton.disabled=false;}});
 notificationBell?.addEventListener('click',async()=>{const opening=notificationPopover?.hidden===true;if(!notificationPopover)return;if(opening){notificationPopover.hidden=false;notificationBell.setAttribute('aria-expanded','true');await renderHomeNotifications();}else closeNotifications();});
 document.getElementById('home-notification-close')?.addEventListener('click',closeNotifications);
 document.addEventListener('click',event=>{if(!event.target.closest('.home-notification-wrap')){closeNotifications();closeAchievements();}});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeNotifications();closeAchievements();}});
 const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
 const fmt=(v,unit='')=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?'—':String(v).replace('.',',')+unit;
 const dateFmt=value=>{if(!value)return 'Sem avaliação registrada';const d=new Date(value);return Number.isNaN(d.getTime())?'':'Atualizado em '+d.toLocaleDateString('pt-BR')};
 try{
  const auth=await getCurrentUser();if(auth.user.role!=='student'){location.replace('/professor/');return}
  welcome.textContent='Olá, '+(auth.user.name||auth.user.email)+'.';
  renderHomeNotifications();
  loadHomeGamification();
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
   const nextTitle=document.getElementById('home-next-title'),nextDescription=document.getElementById('home-next-description'),nextLink=document.getElementById('home-next-link');
   if(!data.anamnesis_completed){if(nextTitle)nextTitle.textContent='Complete sua anamnese';if(nextDescription)nextDescription.textContent='Esse é o primeiro passo para personalizar seu acompanhamento.';if(nextLink){nextLink.href='/student/pages/portal/anamnesis/index.html';nextLink.textContent='Responder anamnese →';}}
   else if(!data.workout_available){if(nextTitle)nextTitle.textContent='Confira seu treino';if(nextDescription)nextDescription.textContent='Seu personal ainda pode disponibilizar ou atualizar sua prescrição.';if(nextLink){nextLink.href='../training/index.html';nextLink.textContent='Abrir meu treino →';}}
   else{if(nextTitle)nextTitle.textContent='Registre seu check-in';if(nextDescription)nextDescription.textContent='Conte como está sua rotina hoje. Seu personal acompanha esses registros.';if(nextLink){nextLink.href='#open-daily-checkin';nextLink.textContent='Fazer check-in →';nextLink.addEventListener('click',event=>{event.preventDefault();document.getElementById('open-daily-checkin')?.click();},{once:true});}}
  set('home-weight',fmt(body.weight_kg,' kg'));
  set('home-weight-date',dateFmt(body.measured_at||data.anamnesis_completed_at));
  set('home-bmi',fmt(body.bmi));
  set('home-waist',fmt(body.waist_cm,' cm'));
  set('home-measure-date',dateFmt(body.measured_at));
  set('home-workout-title',data.workout_title||'Meu treino');
  set('home-workout-text',data.workout_available?'Novo treino disponível — confira sua prescrição.':'Seu treino aparecerá aqui quando for publicado.');
  set('home-diet-title',data.diet_title||'Minha dieta');
  set('home-diet-text',data.diet_available?'Sua dieta está disponível para consulta.':'Sua dieta aparecerá aqui quando for publicada.');
  // Resumo da evolução na home: usa apenas anamnese e avaliações reais do professor.
  try{
   const measurementsResponse=await fetch('/api/student/measurements',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   const measurementsData=measurementsResponse.ok?await measurementsResponse.json():{measurements:[]};
   const rows=Array.isArray(measurementsData.measurements)?measurementsData.measurements.slice().sort((a,b)=>new Date(a.measured_at||a.created_at||0)-new Date(b.measured_at||b.created_at||0)):[];
   const answers=data.anamnesis_answers||{};
   const normalize=value=>String(value||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
   const findAnswer=(needles)=>{
    const wanted=needles.map(normalize),seen=new Set();
    const visit=(node,depth=0)=>{if(!node||typeof node!=='object'||depth>8||seen.has(node))return null;seen.add(node);
     for(const [key,value] of Object.entries(node)){if(wanted.some(term=>normalize(key)===term||normalize(key).includes(term))){const raw=value&&typeof value==='object'?(value.value??value.answer??value.resposta??value.response??value.valor):value;const number=typeof raw==='number'?raw:Number(String(raw??'').replace(',','.').replace(/[^0-9.-]/g,''));if(Number.isFinite(number)&&number>0)return number;}}
     for(const value of Object.values(node)){const found=visit(value,depth+1);if(found!==null)return found;}return null;};
    return visit(answers);
   };
   const firstValue=keys=>{for(const row of rows){for(const key of keys){const value=Number(row?.[key]);if(Number.isFinite(value)&&value>0)return value;}}return null;};
   const latestValue=keys=>{for(let i=rows.length-1;i>=0;i--){for(const key of keys){const value=Number(rows[i]?.[key]);if(Number.isFinite(value)&&value>0)return value;}}return null;};
   const baselineWeight=findAnswer(['weight_kg','weight','peso_inicial','peso_atual','peso']);
   const currentWeight=latestValue(['weight_kg']);
   const baselineWaist=firstValue(['waist_cm','abdomen_cm','abdominal_cm','circumference_abdominal_cm']);
   const currentWaist=latestValue(['waist_cm','abdomen_cm','abdominal_cm','circumference_abdominal_cm']);
   const fmtDelta=(value,unit)=>Math.abs(value).toLocaleString('pt-BR',{maximumFractionDigits:1})+' '+unit;
   const start=[];
   if(baselineWeight!==null&&currentWeight!==null){const d=currentWeight-baselineWeight;start.push('Peso: '+(d===0?'sem alteração':fmtDelta(d,'kg')+(d<0?' a menos':' a mais')));}
   if(baselineWaist!==null&&currentWaist!==null){const d=currentWaist-baselineWaist;start.push('Abdômen: '+(d===0?'sem alteração':fmtDelta(d,'cm')+(d<0?' a menos':' a mais')));}
   set('home-smart-summary-start',start.length?start.join(' · '):'Ainda faltam dados para comparar');
   const cutoff=Date.now()-30*86400000,recent=rows.filter(row=>{const date=new Date(row.measured_at||row.created_at||0);return !Number.isNaN(date.getTime())&&date.getTime()>=cutoff;});
   if(recent.length>=2){const first=recent[0],last=recent[recent.length-1],delta=(keys)=>{const get=row=>{for(const key of keys){const n=Number(row?.[key]);if(Number.isFinite(n)&&row?.[key]!==null&&row?.[key]!=='' )return n;}return null;};const a=get(first),b=get(last);return a===null||b===null?null:b-a;};const parts=[];const wd=delta(['weight_kg']),ad=delta(['waist_cm','abdomen_cm','abdominal_cm']);if(wd!==null)parts.push('Peso '+(wd>0?'+':'')+fmtDelta(wd,'kg'));if(ad!==null)parts.push('Abdômen '+(ad>0?'+':'')+fmtDelta(ad,'cm'));set('home-smart-summary-recent',parts.length?parts.join(' · '):'Avaliações registradas');}
   else set('home-smart-summary-recent',recent.length===1?'1 avaliação registrada':'Nenhuma avaliação nos últimos 30 dias');
   const latest=rows[rows.length-1];
   if(latest){const date=new Date(latest.measured_at||latest.created_at||0),days=Math.max(0,Math.floor((Date.now()-date.getTime())/86400000));set('home-smart-summary-next',days>=45?'Considere agendar uma nova avaliação':'Continue registrando sua rotina');set('home-smart-summary-next-note',days>=45?'Sua última avaliação foi há '+days+' dias. Converse com seu personal sobre a próxima.':'Última avaliação: '+date.toLocaleDateString('pt-BR')+'.');}
   else{set('home-smart-summary-next','Faça sua primeira avaliação');set('home-smart-summary-next-note','Seu personal poderá registrar as medidas para iniciar o histórico.');}
  }catch(error){console.warn('home_evolution_summary_unavailable',error);}
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
   for(let value=1;value<=5;value++){const button=document.createElement('button');button.type='button';button.textContent=String(value);button.setAttribute('aria-label','Nota '+value+' de 5');button.title='Nota '+value+' de 5';button.setAttribute('aria-pressed',value===3?'true':'false');button.addEventListener('click',()=>{group.querySelectorAll('button').forEach(item=>item.setAttribute('aria-pressed','false'));button.setAttribute('aria-pressed','true');group.dataset.value=String(value)});group.append(button)}
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