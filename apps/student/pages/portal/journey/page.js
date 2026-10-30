import {getCurrentUser,logout} from '../../../../shared/js/api-client.js';
document.addEventListener('DOMContentLoaded',async()=>{
 const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
 const fmt=(value,unit='')=>value===null||value===undefined||value===''||!Number.isFinite(Number(value))?'—':String(value).replace('.',',')+unit;
 const dateText=value=>{if(!value)return '';const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})};
 const addTimeline=(items,title,description,date,mark='•')=>items.push({title,description,date,mark});
 try{
  const auth=await getCurrentUser();if(auth.user.role!=='student'){location.replace('/professor/');return}
  set('student-welcome','Olá, '+(auth.user.name||auth.user.email)+'.');
  const responses=await Promise.all([fetch('/api/student/measurements',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}}),fetch('/api/student/checkins',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}}),fetch('/api/student/dashboard',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}}),fetch('/api/student/anamnesis/status',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}})]);
  if(!responses[2].ok)throw new Error('dashboard_unavailable');
  const measurementData=responses[0].ok?await responses[0].json():{measurements:[]};
  const checkinData=responses[1].ok?await responses[1].json():{checkins:[],total:0};
  const data=await responses[2].json(),anamnesis=responses[3].ok?await responses[3].json():null;
  const body=data.body||{},sub=data.subscription;
  set('journey-goal',data.goal||data.profile?.goal||'Construindo sua melhor versão.');
  set('journey-subtitle',data.anamnesis_completed?'Seus dados e registros ajudam você e seu personal a acompanhar sua evolução.':'Sua jornada fica mais personalizada quando você conclui a anamnese.');
  const planKind=sub?.access_type==='lifetime'||Number(sub?.lifetime)?'👑 Acesso vitalício':sub?.access_type==='courtesy'?'👑 Cortesia do personal':sub?.is_expired?'Plano vencido':'Plano ativo';
  set('journey-plan',sub?.plan_name||'Nenhum plano ativo');
  const heroTags=document.querySelector('.journey-tags');
  if(heroTags&&sub){const badge=document.createElement('span');badge.textContent=planKind; if(sub.access_type==='lifetime'||sub.access_type==='courtesy'||Number(sub.lifetime)){badge.style.color='#f3cf75';badge.style.borderColor='#b88b36';badge.style.background='#b88b3618'} heroTags.append(badge);}
  set('journey-weight',fmt(body.weight_kg,' kg'));set('journey-bmi',fmt(body.bmi));set('journey-waist',fmt(body.waist_cm,' cm'));
  const bmi=Number(body.bmi),gauge=document.getElementById('journey-bmi-gauge');
  if(gauge&&Number.isFinite(bmi)&&bmi>0){
    const categories=[{max:18.5,label:'Abaixo do peso',color:'#199ed0',desc:'Abaixo da faixa de referência.'},{max:25,label:'Faixa adequada',color:'#159b50',desc:'Dentro da faixa de referência.'},{max:30,label:'Sobrepeso',color:'#c28a00',desc:'Faixa de sobrepeso.'},{max:35,label:'Obesidade grau I',color:'#ed7417',desc:'Obesidade grau I.'},{max:40,label:'Obesidade grau II',color:'#df4b27',desc:'Obesidade grau II.'},{max:Infinity,label:'Obesidade grau III',color:'#c92736',desc:'Obesidade grau III.'}];
    const category=categories.find(item=>bmi<item.max)||categories[categories.length-1];
    set('journey-bmi-value',bmi.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}));
    const badge=document.getElementById('journey-bmi-category');if(badge){badge.textContent=category.label;badge.style.color=category.color;badge.style.background=category.color+'18';}
    set('journey-bmi-description',category.desc);
    const clamped=Math.max(16,Math.min(45,bmi));
    let position;
    if(clamped<18.5)position=((clamped-16)/2.5)*20;
    else if(clamped<25)position=20+((clamped-18.5)/6.5)*25;
    else if(clamped<30)position=45+((clamped-25)/5)*20;
    else if(clamped<35)position=65+((clamped-30)/5)*17;
    else position=82+((clamped-35)/10)*18;
    const marker=document.getElementById('journey-bmi-marker');if(marker)marker.style.left=Math.max(0,Math.min(100,position))+'%';
    const miniBadge=document.getElementById('journey-bmi-category');if(miniBadge){miniBadge.textContent=category.label;miniBadge.style.color=category.color;miniBadge.style.background=category.color+'18';miniBadge.hidden=false;}
    gauge.hidden=false;
  }
  const waist=Number(body.waist_cm),waistGauge=document.getElementById('journey-waist-gauge');
  if(waistGauge&&Number.isFinite(waist)&&waist>0){
    set('journey-waist-value',waist.toLocaleString('pt-BR',{maximumFractionDigits:1})+' cm');
    const marker=document.getElementById('journey-waist-marker');
    if(marker)marker.style.left=(Math.max(0,Math.min(100,((waist-50)/100)*100)))+'%';
    waistGauge.hidden=false;
  }
  set('journey-weight-note',body.weight_source==='checkin'?'Último peso informado no check-in':body.weight_source==='evaluation'?'Última avaliação do professor':'Peso inicial da anamnese');
  set('journey-measure-date',body.measured_at?dateText(body.measured_at):'Sem medida registrada');
   const kcalValue=body.basal_kcal??data.anamnesis_answers?.basal_kcal??data.anamnesis_answers?.form_answers?.basal_kcal??null;
   set('journey-kcal',kcalValue!==null&&kcalValue!==''&&Number.isFinite(Number(kcalValue))?Math.round(Number(kcalValue)).toLocaleString('pt-BR')+' kcal':'—');
   set('journey-kcal-note',kcalValue!==null&&kcalValue!==''&&Number.isFinite(Number(kcalValue))?'Estimativa diária registrada':'Kcal por dia · não informado');
  const checkins=Array.isArray(checkinData.checkins)?checkinData.checkins:[];
  const measurements=Array.isArray(measurementData.measurements)?measurementData.measurements:[];
  set('journey-weight-compare',fmt(body.weight_kg,' kg'));set('journey-waist-compare',fmt(body.waist_cm,' cm'));set('journey-bmi-compare',fmt(body.bmi));
  set('journey-record-count',String(measurements.length+checkins.length)+' registros');
  const heightMeters=Number(body.height_cm||0)/100;
  const checkinWeightPoints=checkins.filter(row=>row.weight_kg!==null&&row.weight_kg!==undefined&&Number(row.weight_kg)>0).map(row=>({measured_at:row.created_at||row.checkin_date,weight_kg:Number(row.weight_kg),bmi:heightMeters>0?Math.round((Number(row.weight_kg)/(heightMeters*heightMeters))*10)/10:null,source:'checkin'}));
  const evaluationPoints=measurements.map(row=>({...row,source:'evaluation'}));
  const combinedWeightHistory=[...evaluationPoints,...checkinWeightPoints].sort((x,y)=>new Date(x.measured_at)-new Date(y.measured_at));
  const chartMetrics={
    weight:{label:'Peso corporal',unit:'kg',color:'#7650ee',value:r=>Number(r.weight_kg),source:'all'},
    waist:{label:'Circunferência abdominal',unit:'cm',color:'#f08a35',value:r=>Number(r.waist_cm),source:'evaluation'},
    bmi:{label:'Índice de massa corporal',unit:'',color:'#2997dc',value:r=>Number(r.bmi),source:'all'},
    kcal:{label:'Gasto calórico basal',unit:'kcal',color:'#16a36a',value:r=>Number(r.basal_kcal),source:'evaluation'}
  };
  let activeMetric='weight';
  const chartNode=document.getElementById('journey-chart'),captionNode=document.getElementById('journey-chart-caption');
  const chartDate=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});};
  const renderJourneyChart=()=>{
    const metric=chartMetrics[activeMetric],sourceRows=metric.source==='all'?combinedWeightHistory:measurements,points=sourceRows.map(row=>({date:row.measured_at,value:metric.value(row),source:row.source||'evaluation'})).filter(p=>Number.isFinite(p.value)&&p.value>0);
    document.querySelectorAll('.journey-chart-toggle').forEach(button=>{const active=button.dataset.metric===activeMetric;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
    if(captionNode)captionNode.textContent=metric.label+(metric.unit?' · '+metric.unit:'')+' · '+points.length+' '+(points.length===1?'registro':'registros')+(activeMetric==='weight'?' (check-ins e avaliações)':activeMetric==='bmi'?' (calculado por registro)':' do professor');
    if(!chartNode)return;
    if(!points.length){chartNode.innerHTML='<div class="journey-chart-empty"><span aria-hidden="true">↗</span><strong>Seu histórico está começando</strong><p>Assim que seu personal registrar avaliações com este indicador, a evolução aparecerá aqui.</p></div>';return;}
    if(points.length===1){const p=points[0];chartNode.innerHTML='<div class="journey-chart-empty"><span aria-hidden="true">✓</span><strong>Primeira avaliação registrada</strong><p>'+p.value.toLocaleString('pt-BR')+(metric.unit?' '+metric.unit:'')+' · '+chartDate(p.date)+'. Registros seguintes formarão a linha de evolução.</p></div>';return;}
    const vals=points.map(p=>p.value),min=Math.min(...vals),max=Math.max(...vals),spread=max-min||Math.max(Math.abs(max)*.08,1),lo=min-spread*.18,hi=max+spread*.18;
    const x=i=>38+i*(684/(points.length-1)),y=v=>20+(1-(v-lo)/(hi-lo))*145;
    const coords=points.map((p,i)=>x(i)+','+y(p.value)).join(' ');
    const grid=[35,80,125,170].map(gy=>'<line x1="38" y1="'+gy+'" x2="722" y2="'+gy+'" stroke="#e9edf3" stroke-dasharray="3 5"/>').join('');
    const dots=points.map((p,i)=>{const label=chartDate(p.date)+': '+p.value.toLocaleString('pt-BR')+(metric.unit?' '+metric.unit:'');return `<g class="journey-chart-point" tabindex="0" role="img" aria-label="${label}"><circle cx="${x(i)}" cy="${y(p.value)}" r="5" fill="#fff" stroke="${metric.color}" stroke-width="3"><title>${label}</title></circle><text x="${x(i)}" y="${y(p.value)-12}" text-anchor="middle" fill="#273043" font-size="11" font-weight="800">${p.value.toLocaleString('pt-BR')}</text></g>`;}).join('');
    const dates=points.map((p,i)=>i===0||i===points.length-1||i===Math.floor((points.length-1)/2)?'<text x="'+x(i)+'" y="194" text-anchor="middle" fill="#7b8494" font-size="10">'+chartDate(p.date)+'</text>':'').join('');
    chartNode.innerHTML='<svg viewBox="0 0 760 205" role="img" aria-label="Gráfico de '+metric.label+' ao longo das avaliações">'+grid+'<polyline points="'+coords+'" fill="none" stroke="'+metric.color+'" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'+dots+dates+'</svg>';
  };
  document.querySelectorAll('.journey-chart-toggle').forEach(button=>button.addEventListener('click',()=>{activeMetric=button.dataset.metric;renderJourneyChart();}));
  renderJourneyChart();
  set('journey-checkin-count',String(checkins.length));
  const ring=document.querySelector('.journey-ring');if(ring){const progress=Math.min(100,checkins.length/30*100);ring.style.background='conic-gradient(#ff3348 '+(progress*3.6)+'deg,#eceff4 0deg 360deg)';}

  const goalsList=document.getElementById('journey-goals-list');
  const goalForm=document.getElementById('journey-goal-form');
  const goalMessage=document.getElementById('journey-goal-message');
  const photoForm=document.getElementById('journey-photo-form');
  const photoGallery=document.getElementById('journey-photo-gallery');
  const photoMessage=document.getElementById('journey-photo-message');
  let currentGoals=[],journeyPhotos=[];
  const refreshGoals=async()=>{
    const response=await fetch('/api/student/journey/goals',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('goals_unavailable');
    const data=await response.json();currentGoals=Array.isArray(data.goals)?data.goals:[];renderGoals(currentGoals);renderAchievements();return currentGoals;
  };
  const renderGoals=(goals)=>{
    if(!goalsList)return;goalsList.replaceChildren();
    if(!goals.length){const empty=document.createElement('p');empty.className='journey-muted';empty.textContent='Você ainda não definiu uma meta. Registre seu próximo objetivo abaixo.';goalsList.append(empty);return;}
    goals.forEach(goal=>{
      const card=document.createElement('article');card.className='journey-goal-item';
      const title=document.createElement('strong');title.textContent=goal.title;
      const current=goal.current_value===null||goal.current_value===undefined?'Aguardando avaliação':('Atual: '+fmt(goal.current_value,goal.unit?' '+goal.unit:''));
      const target='Meta: '+fmt(goal.target_value,goal.unit?' '+goal.unit:'');
      const status=goal.status==='completed'?'Concluída':goal.status==='paused'?'Pausada':'Em andamento';
      const values=document.createElement('p');values.textContent='Início: '+fmt(goal.start_value,goal.unit?' '+goal.unit:'')+' · '+current+' · '+target+' · '+status;
      card.append(title,values);
      if(goal.progress_percent!==null&&goal.progress_percent!==undefined){const track=document.createElement('div');track.className='journey-goal-progress';const fill=document.createElement('i');fill.style.width=goal.progress_percent+'%';track.append(fill);const pct=document.createElement('p');pct.textContent=goal.progress_percent+'% do caminho até sua meta';card.append(track,pct);}
      if(goal.completed_at){const done=document.createElement('p');done.textContent='Meta alcançada em '+dateText(goal.completed_at);card.append(done);}
      if(goal.notes){const note=document.createElement('p');note.textContent=goal.notes;card.append(note);}
      const actions=document.createElement('div');actions.className='journey-goal-actions';
      const remove=document.createElement('button');remove.type='button';remove.textContent='Excluir meta';remove.addEventListener('click',async()=>{if(!confirm('Excluir esta meta?'))return;remove.disabled=true;try{const response=await fetch('/api/student/journey/goals/'+encodeURIComponent(goal.id),{method:'DELETE',credentials:'same-origin'});if(!response.ok)throw new Error('delete_failed');await refreshGoals();}catch(error){if(goalMessage)goalMessage.textContent='Não foi possível excluir a meta.';remove.disabled=false;}});actions.append(remove);card.append(actions);goalsList.append(card);
    });
  };
  try{await refreshGoals();}catch(error){renderGoals([]);console.warn('journey_goals_load_failed');}
  if(goalForm)goalForm.addEventListener('submit',async event=>{
    event.preventDefault();const submit=goalForm.querySelector('button[type="submit"]');submit.disabled=true;if(goalMessage)goalMessage.textContent='Salvando objetivo…';
    try{const form=new FormData(goalForm),payload=Object.fromEntries(form.entries());payload.start_value=payload.start_value===''?null:Number(payload.start_value);payload.target_value=payload.target_value===''?null:Number(payload.target_value);
      const response=await fetch('/api/student/journey/goals',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'goal_save_failed');await refreshGoals();goalForm.reset();if(goalMessage)goalMessage.textContent='Objetivo salvo. A evolução será atualizada quando novas avaliações forem registradas.';
    }catch(error){if(goalMessage)goalMessage.textContent='Não foi possível salvar seu objetivo. Confira os valores e tente novamente.';console.error('journey_goal_save_failed',error)}
    finally{submit.disabled=false;}
  });
  const loadPhotos=async()=>{
    const response=await fetch('/api/student/journey/photos',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('photos_unavailable');const data=await response.json();journeyPhotos=Array.isArray(data.photos)?data.photos:[];
    if(photoGallery){photoGallery.replaceChildren();if(!journeyPhotos.length){const empty=document.createElement('p');empty.className='journey-muted';empty.textContent='Nenhuma foto registrada ainda. Sua primeira foto marcará o início da galeria.';photoGallery.append(empty);}
      journeyPhotos.forEach(photo=>{const card=document.createElement('article');card.className='journey-photo-item';const image=document.createElement('img');image.loading='lazy';image.alt='Foto de evolução '+photo.photo_type;image.src='/api/student/journey/photos/'+encodeURIComponent(photo.id)+'/image';const info=document.createElement('div');const title=document.createElement('strong');title.textContent=({frente:'Frente',lado:'Lado',costas:'Costas',progresso:'Progresso geral'})[photo.photo_type]||'Foto de evolução';const date=document.createElement('small');date.textContent=dateText(photo.taken_at);info.append(title,date);if(photo.note){const note=document.createElement('small');note.textContent=photo.note;info.append(note);}const remove=document.createElement('button');remove.type='button';remove.textContent='Excluir foto';remove.addEventListener('click',async()=>{if(!confirm('Excluir esta foto permanentemente?'))return;remove.disabled=true;try{const result=await fetch('/api/student/journey/photos/'+encodeURIComponent(photo.id),{method:'DELETE',credentials:'same-origin'});if(!result.ok)throw new Error('photo_delete_failed');await loadPhotos();renderAchievements();}catch(error){if(photoMessage)photoMessage.textContent='Não foi possível excluir a foto.';remove.disabled=false;}});info.append(remove);card.append(image,info);photoGallery.append(card);});
    }
    return journeyPhotos;
  };
  try{await loadPhotos();}catch(error){if(photoGallery){photoGallery.replaceChildren();const msg=document.createElement('p');msg.className='journey-muted';msg.textContent='Não foi possível carregar a galeria agora.';photoGallery.append(msg);}console.warn('journey_photos_load_failed');}
  const compressPhoto=async file=>{
    if(!file||!file.type.startsWith('image/'))throw new Error('Selecione uma imagem válida.');
    if(!('createImageBitmap'in window))throw new Error('Este navegador não oferece compressão local de imagem. Atualize o navegador.');
    const bitmap=await createImageBitmap(file);let width=bitmap.width,height=bitmap.height;const maxSide=1280;
    if(Math.max(width,height)>maxSide){const scale=maxSide/Math.max(width,height);width=Math.round(width*scale);height=Math.round(height*scale);}
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');context.drawImage(bitmap,0,0,width,height);bitmap.close?.();
    const toBlob=quality=>new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
    let blob=await toBlob(.78);if(blob&&blob.size>716800)blob=await toBlob(.62);
    if(blob&&blob.size>716800){const scaled=document.createElement('canvas');scaled.width=Math.round(width*.78);scaled.height=Math.round(height*.78);scaled.getContext('2d').drawImage(canvas,0,0,scaled.width,scaled.height);blob=await new Promise(resolve=>scaled.toBlob(resolve,'image/jpeg',.58));}
    if(!blob||blob.size>716800)throw new Error('Não foi possível reduzir a foto para menos de 700 KB. Escolha outra imagem.');
    return blob;
  };
  if(photoForm)photoForm.addEventListener('submit',async event=>{
    event.preventDefault();const submit=photoForm.querySelector('button[type="submit"]'),file=document.getElementById('journey-photo-file')?.files?.[0];submit.disabled=true;if(photoMessage)photoMessage.textContent='Comprimindo e enviando foto…';
    try{const blob=await compressPhoto(file),form=new FormData(photoForm),params=new URLSearchParams({type:String(form.get('type')||'progresso'),date:String(form.get('date')||''),note:String(form.get('note')||'')});
      const response=await fetch('/api/student/journey/photos?'+params.toString(),{method:'POST',credentials:'same-origin',headers:{'Content-Type':'image/jpeg'},body:blob});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'photo_upload_failed');photoForm.reset();if(photoMessage)photoMessage.textContent='Foto salva com segurança no D1.';await loadPhotos();renderAchievements();
    }catch(error){if(photoMessage)photoMessage.textContent=error.message==='image_too_large'?'A foto ficou maior que 700 KB após compressão.':error.message||'Não foi possível enviar a foto.';console.error('journey_photo_upload_failed',error)}
    finally{submit.disabled=false;}
  });
  const dateFor=(records,index,field)=>records[index]?(records[index][field]||records[index].created_at||records[index].checkin_date||null):null;
  const weekKey=value=>{const date=new Date(value);if(Number.isNaN(date.getTime()))return null;date.setUTCHours(0,0,0,0);const day=date.getUTCDay()||7;date.setUTCDate(date.getUTCDate()-day+1);return date.toISOString().slice(0,10);};
  const weekStreak=()=>{
    const keys=[...new Set(checkins.map(item=>weekKey(item.week_start||item.checkin_date||item.created_at)).filter(Boolean))].sort();
    let best=0,run=0,previous=null,runEnd=null,bestEnd=null;
    keys.forEach(key=>{const current=new Date(key+'T00:00:00Z');const expected=previous?new Date(new Date(previous+'T00:00:00Z').getTime()+7*86400000):null;run=previous&&current.getTime()===expected.getTime()?run+1:1;if(run>best){best=run;bestEnd=key;}previous=key;});
    return {count:best,end:bestEnd};
  };
  const nthDate=(records,n,field)=>{const sorted=[...records].sort((a,b)=>new Date(a[field]||a.created_at||a.checkin_date||0)-new Date(b[field]||b.created_at||b.checkin_date||0));return sorted[n-1]?(sorted[n-1][field]||sorted[n-1].created_at||sorted[n-1].checkin_date):null;};
  const achievementList=document.getElementById('journey-achievements-list');
  const renderAchievements=()=>{
    const streak=weekStreak(),completed=currentGoals.filter(goal=>goal.status==='completed'),firstPhoto=journeyPhotos.length?[...journeyPhotos].sort((a,b)=>new Date(a.taken_at)-new Date(b.taken_at))[0].taken_at:null;
    const defs=[
      {id:'first-checkin',icon:'✓',title:'Primeiro passo',desc:'Realizou seu primeiro check-in.',date:nthDate(checkins,1,'created_at')},
      {id:'five-checkins',icon:'★',title:'Ritmo constante',desc:'Completou 5 check-ins.',date:nthDate(checkins,5,'created_at')},
      {id:'ten-checkins',icon:'🏅',title:'Compromisso em ação',desc:'Completou 10 check-ins.',date:nthDate(checkins,10,'created_at')},
      {id:'thirty-checkins',icon:'🏆',title:'30 passos de evolução',desc:'Completou 30 check-ins.',date:nthDate(checkins,30,'created_at')},
      {id:'first-measurement',icon:'⚖',title:'Ponto de partida',desc:'Recebeu sua primeira avaliação corporal.',date:nthDate(measurements,1,'measured_at')},
      {id:'five-measurements',icon:'📈',title:'Evolução acompanhada',desc:'Possui 5 avaliações corporais.',date:nthDate(measurements,5,'measured_at')},
      {id:'first-goal',icon:'🎯',title:'Olhar no objetivo',desc:'Definiu sua primeira meta.',date:currentGoals.length?[...currentGoals].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))[0].created_at:null},
      {id:'four-week-streak',icon:'🔥',title:'Quatro semanas firmes',desc:'Registrou check-ins em 4 semanas consecutivas.',date:streak.count>=4?streak.end:null},
      {id:'eight-week-streak',icon:'🌟',title:'Constância de verdade',desc:'Registrou check-ins em 8 semanas consecutivas.',date:streak.count>=8?streak.end:null},
      {id:'first-photo',icon:'📸',title:'Minha transformação',desc:'Adicionou sua primeira foto de evolução.',date:firstPhoto},
      {id:'goal-complete',icon:'🏁',title:'Meta alcançada',desc:'Concluiu um objetivo acompanhado por avaliações.',date:completed.length?[...completed].sort((a,b)=>new Date(a.completed_at)-new Date(b.completed_at))[0].completed_at:null},
      {id:'ten-photos',icon:'🖼',title:'Álbum de evolução',desc:'Registrou 10 fotos de acompanhamento.',date:journeyPhotos.length>=10?[...journeyPhotos].sort((a,b)=>new Date(a.taken_at)-new Date(b.taken_at))[9].taken_at:null}
    ];
    const unlocked=defs.filter(item=>item.date).length;set('journey-achievement-count',unlocked+' de '+defs.length+' desbloqueadas');
    if(achievementList){achievementList.replaceChildren();defs.forEach(item=>{const card=document.createElement('article');card.className='journey-achievement'+(item.date?'':' is-locked');const medal=document.createElement('span');medal.className='medal';medal.textContent=item.icon;const title=document.createElement('strong');title.textContent=item.title;const desc=document.createElement('small');desc.textContent=item.date?'Desbloqueada em '+dateText(item.date):item.desc;card.append(medal,title,desc);achievementList.append(card);});}
    const points=checkins.length+measurements.length*2+journeyPhotos.length+completed.length*3;
    const levels=[{min:0,name:'Iniciante'},{min:5,name:'Comprometido'},{min:15,name:'Constante'},{min:30,name:'Focado'},{min:50,name:'Conquistador'}];
    let current=levels[0],next=null;levels.forEach((level,index)=>{if(points>=level.min){current=level;next=levels[index+1]||null;}});
    set('journey-level',current.name);set('journey-level-next',next?'Faltam '+Math.max(0,next.min-points)+' pontos para '+next.name: 'Nível máximo alcançado. Continue evoluindo!');
    const bar=document.getElementById('journey-level-progress');if(bar)bar.style.width=next?Math.min(100,((points-current.min)/(next.min-current.min))*100)+'%':'100%';
  };
  renderAchievements();
  document.getElementById('journey-print-report')?.addEventListener('click',()=>window.print());
  const healthCard=document.getElementById('journey-health-card'),healthItems=document.getElementById('journey-health-items'),healthInfo=data.health_info||{};
  let formAnswers=data.anamnesis_answers?.form_answers||null;
  if(!formAnswers&&data.anamnesis_answers?.additional_notes){try{const old=JSON.parse(data.anamnesis_answers.additional_notes);formAnswers=old.form_answers||old}catch{}}
  const values=(key)=>Array.isArray(formAnswers?.[key])?formAnswers[key].map(x=>String(x).trim()).filter(x=>x&&!/^(nenhum|nenhuma|não|nao)$/i.test(x)):[];
  const healthGroups=[
    {emoji:'🩺',label:'Condições de saúde',items:values('diagnoses')},
    {emoji:'🏥',label:'Cirurgias',items:values('surgeries')},
    {emoji:'⚠️',label:'Sintomas relatados',items:values('symptoms')},
    {emoji:'🏃',label:'Durante o exercício',items:values('exercise_sensations')},
    {emoji:'💊',label:'Medicamentos',items:formAnswers?.medication_status==='Sim'&&String(formAnswers?.medications_detail||'').trim()?[String(formAnswers.medications_detail).trim()]:[]},
    {emoji:'🥗',label:'Restrições alimentares',items:formAnswers?.food_restriction_status==='Sim'&&String(formAnswers?.food_restriction_detail||'').trim()?[String(formAnswers.food_restriction_detail).trim()]:[]}
  ];
  if(!formAnswers){
    const legacy=String(healthInfo.health_conditions||'').split(' — ').map(x=>x.trim()).filter(x=>x&&!/^(nenhum|nenhuma|não|nao)$/i.test(x));
    healthGroups[0].items=legacy.filter(x=>!/^Cirurgia:|^Sintoma:|^Sensação no exercício:/i.test(x));
    healthGroups[1].items=legacy.filter(x=>/^Cirurgia:/i.test(x)).map(x=>x.replace(/^Cirurgia:\s*/i,''));
    healthGroups[2].items=legacy.filter(x=>/^Sintoma:/i.test(x)).map(x=>x.replace(/^Sintoma:\s*/i,''));
    healthGroups[3].items=legacy.filter(x=>/^Sensação no exercício:/i.test(x)).map(x=>x.replace(/^Sensação no exercício:\s*/i,''));
    if(healthInfo.medications&&!/^(nenhum|nenhuma|não|nao)$/i.test(String(healthInfo.medications).trim()))healthGroups[4].items=[String(healthInfo.medications).trim()];
    if(healthInfo.restrictions&&!/^(nenhum|nenhuma|não|nao)$/i.test(String(healthInfo.restrictions).trim()))healthGroups[5].items=[String(healthInfo.restrictions).trim()];
  }
  if(healthCard&&healthItems){
    healthItems.replaceChildren();
    healthGroups.filter(group=>group.items.length).forEach(group=>{
      const card=document.createElement('div');card.className='journey-health-item';
      const emoji=document.createElement('span');emoji.className='health-emoji';emoji.textContent=group.emoji;
      const copy=document.createElement('span');copy.className='health-copy';
      const label=document.createElement('span');label.className='health-label';label.textContent=group.label;
      const value=document.createElement('span');value.className='health-value';value.textContent=group.items.join(', ');
      copy.append(label,value);card.append(emoji,copy);healthItems.append(card);
    });
    healthCard.hidden=healthItems.childElementCount===0;
  }
  const reminder=document.getElementById('journey-anamnesis');
  const isAnamnesisCompleted=Boolean(anamnesis?.completed||data.anamnesis_completed);
  if(reminder){reminder.hidden=!(anamnesis?.has_active_plan&&!isAnamnesisCompleted)}
  const updateCard=document.getElementById('journey-anamnesis-update'),updateNote=document.getElementById('journey-anamnesis-update-note');
  if(updateCard){updateCard.hidden=!isAnamnesisCompleted;if(isAnamnesisCompleted&&updateNote)updateNote.textContent='Última atualização: '+(dateText(anamnesis?.completed_at)||'data não disponível')+'. Atualize se seu estado de saúde, rotina, objetivos ou restrições mudarem.';}
  const items=[];
  if(data.anamnesis_completed||anamnesis?.completed)addTimeline(items,'Anamnese concluída','Dados iniciais registrados para orientar seu acompanhamento.',anamnesis?.completed_at,'✓');
  else addTimeline(items,'Complete sua anamnese','Preencha os dados iniciais para personalizar o acompanhamento.','','!');
  if(sub)addTimeline(items,'Plano ativo: '+(sub.plan_name||'R-Fit'),Number(sub.lifetime)?'Seu acesso é vitalício.':(sub.days_remaining===null?'Plano em andamento.':'Restam '+sub.days_remaining+' dias de acesso.'),sub.expires_at,'R');
  if(body.weight_kg!==null||body.waist_cm!==null)addTimeline(items,'Medidas corporais disponíveis','Peso: '+fmt(body.weight_kg,' kg')+' · Abdômen: '+fmt(body.waist_cm,' cm')+' · IMC: '+fmt(body.bmi),body.measured_at,'↗');
  checkins.slice(0,30).reverse().forEach(item=>{
    const answers=item.answers&&typeof item.answers==='object'?item.answers:{};
    const dailyLabels={sleep_quality:'Sono',energy:'Energia',appetite:'Apetite',training_adherence:'Treinos',nutrition_adherence:'Alimentação',discomfort:'Desconforto'};
    const answersText=Object.entries(answers).filter(([key,value])=>value!==null&&value!==undefined&&value!=='').map(([key,value])=>{
      const label=item.kind==='daily'?(dailyLabels[key]||key):key;
      const display=key==='discomfort'?(Number(value)?'Sim':'Não'):(key==='sleep_quality'||key==='energy'||key==='appetite'?value+'/5':key.endsWith('_adherence')?value+'%':Array.isArray(value)?value.join(', '):String(value));
      return label+': '+display;
    }).join(' · ');
    const details=[item.weight_kg?'Peso: '+fmt(item.weight_kg,' kg'):'',answersText,item.notes].filter(Boolean).join(' · ');
    addTimeline(items,item.kind==='daily'?'Check-in diário registrado':'Check-in semanal registrado',details,item.created_at||item.week_start||item.checkin_date,'✓');
  });
  journeyPhotos.forEach(photo=>addTimeline(items,'Foto de evolução adicionada',(photo.note||'Registro visual · '+(photo.photo_type||'progresso')),photo.taken_at,'📸'));
  currentGoals.forEach(goal=>{addTimeline(items,'Objetivo definido: '+goal.title,'Meta: '+fmt(goal.target_value,goal.unit?' '+goal.unit:''),goal.created_at,'🎯');if(goal.completed_at)addTimeline(items,'Objetivo alcançado: '+goal.title,'Parabéns por concluir esta meta!',goal.completed_at,'🏆');});
  if(data.workout_available)addTimeline(items,'Treino disponível',data.workout_title||'Confira a prescrição de treino.','','↗');
  if(data.diet_available)addTimeline(items,'Plano alimentar disponível',data.diet_title||'Confira seu plano alimentar.','','↗');
  if(!items.length)addTimeline(items,'Sua jornada começa agora','Seu personal poderá adicionar medidas, treino e dieta conforme o acompanhamento evoluir.','','•');
  const list=document.getElementById('journey-timeline-list');list.replaceChildren();
  items.forEach(item=>{const li=document.createElement('li'),dot=document.createElement('span'),wrap=document.createElement('div'),title=document.createElement('strong'),desc=document.createElement('p'),time=document.createElement('time');dot.className='journey-timeline-dot';dot.textContent=item.mark;title.textContent=item.title;desc.textContent=item.description;if(item.date){time.textContent=dateText(item.date);time.dateTime=item.date}wrap.append(title,desc);if(item.date)wrap.append(time);li.append(dot,wrap);list.append(li)});
  const message=document.getElementById('page-message');if(message)message.textContent='';
 }catch(error){const message=document.getElementById('page-message');if(message)message.textContent='Não foi possível carregar sua jornada agora. Atualize a página para tentar novamente.';console.error('student_journey_load_failed',error)}
 document.getElementById('logout')?.addEventListener('click',async function(){this.disabled=true;try{await logout()}finally{location.replace('/student/pages/login.html')}});
});