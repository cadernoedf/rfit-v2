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
  set('journey-goal',data.goal||'Construindo sua melhor versão.');
  set('journey-subtitle',data.anamnesis_completed?'Seus dados e registros ajudam você e seu personal a acompanhar sua evolução.':'Sua jornada fica mais personalizada quando você conclui a anamnese.');
  set('journey-plan',sub?.plan_name||'Nenhum plano ativo');
  set('journey-days',sub?(Number(sub.lifetime)?'Acesso vitalício':sub.days_remaining===null||sub.days_remaining===undefined?'Plano ativo':'Restam '+sub.days_remaining+' '+(sub.days_remaining===1?'dia':'dias')):'Escolha seu plano');
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
  set('journey-weight-note',body.measured_at?'Atualizado em '+dateText(body.measured_at):'Dado da anamnese ou última avaliação');
  set('journey-measure-date',body.measured_at?dateText(body.measured_at):'Sem medida registrada');
  set('journey-days-count',!sub?'—':Number(sub.lifetime)?'∞':sub.days_remaining===null||sub.days_remaining===undefined?'—':String(sub.days_remaining));
  set('journey-expiry-note',!sub?'Nenhum plano ativo':Number(sub.lifetime)?'Acesso vitalício':sub.expires_at?'Vence em '+dateText(sub.expires_at):'Validade não informada');
  set('journey-weight-compare',fmt(body.weight_kg,' kg'));set('journey-waist-compare',fmt(body.waist_cm,' cm'));set('journey-bmi-compare',fmt(body.bmi));
  set('journey-record-count',body.measured_at?'1 registro recente':'0 registros');
  const checkins=Array.isArray(checkinData.checkins)?checkinData.checkins:[];
  const measurements=Array.isArray(measurementData.measurements)?measurementData.measurements:[];
  const chartMetrics={
    weight:{label:'Peso corporal',unit:'kg',color:'#7650ee',value:r=>Number(r.weight_kg)},
    waist:{label:'Circunferência abdominal',unit:'cm',color:'#f08a35',value:r=>Number(r.waist_cm)},
    bmi:{label:'Índice de massa corporal',unit:'',color:'#2997dc',value:r=>Number(r.bmi)},
    kcal:{label:'Gasto calórico basal',unit:'kcal',color:'#16a36a',value:r=>Number(r.basal_kcal)}
  };
  let activeMetric='weight';
  const chartNode=document.getElementById('journey-chart'),captionNode=document.getElementById('journey-chart-caption');
  const chartDate=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});};
  const renderJourneyChart=()=>{
    const metric=chartMetrics[activeMetric],points=measurements.map(row=>({date:row.measured_at,value:metric.value(row)})).filter(p=>Number.isFinite(p.value)&&p.value>0);
    document.querySelectorAll('.journey-chart-toggle').forEach(button=>{const active=button.dataset.metric===activeMetric;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
    if(captionNode)captionNode.textContent=metric.label+(metric.unit?' · '+metric.unit:'')+' · '+points.length+' '+(points.length===1?'avaliação':'avaliações');
    if(!chartNode)return;
    if(!points.length){chartNode.innerHTML='<div class="journey-chart-empty"><span aria-hidden="true">↗</span><strong>Seu histórico está começando</strong><p>Assim que seu personal registrar avaliações com este indicador, a evolução aparecerá aqui.</p></div>';return;}
    if(points.length===1){const p=points[0];chartNode.innerHTML='<div class="journey-chart-empty"><span aria-hidden="true">✓</span><strong>Primeira avaliação registrada</strong><p>'+p.value.toLocaleString('pt-BR')+(metric.unit?' '+metric.unit:'')+' · '+chartDate(p.date)+'. Registros seguintes formarão a linha de evolução.</p></div>';return;}
    const vals=points.map(p=>p.value),min=Math.min(...vals),max=Math.max(...vals),spread=max-min||Math.max(Math.abs(max)*.08,1),lo=min-spread*.18,hi=max+spread*.18;
    const x=i=>38+i*(684/(points.length-1)),y=v=>20+(1-(v-lo)/(hi-lo))*145;
    const coords=points.map((p,i)=>x(i)+','+y(p.value)).join(' ');
    const grid=[35,80,125,170].map(gy=>'<line x1="38" y1="'+gy+'" x2="722" y2="'+gy+'" stroke="#e9edf3" stroke-dasharray="3 5"/>').join('');
    const dots=points.map((p,i)=>'<g class="journey-chart-point" tabindex="0" role="img" aria-label="'+chartDate(p.date)+': '+p.value.toLocaleString('pt-BR')+(metric.unit?' '+metric.unit:'')+'"><circle cx="'+x(i)+'" cy="'+y(p.value)+'" r="5" fill="#fff" stroke="'+metric.color+'" stroke-width="3"><title>'+chartDate(p.date)+' · '+p.value.toLocaleString('pt-BR')+(metric.unit?' '+metric.unit:'')+'</title></circle><text x="'+x(i)+'" y="'+(y(p.value)-12)+'" text-anchor="middle" fill="#273043" font-size="11" font-weight="800">'+p.value.toLocaleString('pt-BR')</text></g>').join('');
    const dates=points.map((p,i)=>i===0||i===points.length-1||i===Math.floor((points.length-1)/2)?'<text x="'+x(i)+'" y="194" text-anchor="middle" fill="#7b8494" font-size="10">'+chartDate(p.date)+'</text>':'').join('');
    chartNode.innerHTML='<svg viewBox="0 0 760 205" role="img" aria-label="Gráfico de '+metric.label+' ao longo das avaliações">'+grid+'<polyline points="'+coords+'" fill="none" stroke="'+metric.color+'" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'+dots+dates+'</svg>';
  };
  document.querySelectorAll('.journey-chart-toggle').forEach(button=>button.addEventListener('click',()=>{activeMetric=button.dataset.metric;renderJourneyChart();}));
  renderJourneyChart();
  set('journey-checkin-count',String(checkins.length));
  const ring=document.querySelector('.journey-ring');if(ring){const progress=Math.min(100,checkins.length/30*100);ring.style.background='conic-gradient(#ff3348 '+(progress*3.6)+'deg,#eceff4 0deg 360deg)';}

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
  checkins.slice(0,8).reverse().forEach(item=>{
    const details='Sono '+item.sleep_quality+'/5 · Energia '+item.energy+'/5 · Apetite '+item.appetite+'/5 · Treinos '+item.training_adherence+'% · Alimentação '+item.nutrition_adherence+'%'+(Number(item.discomfort)?' · Relatou desconforto':'')+(item.notes?' · '+item.notes:'');
    addTimeline(items,'Check-in diário registrado',details,item.created_at||item.checkin_date,'✓');
  });
  if(data.workout_available)addTimeline(items,'Treino disponível',data.workout_title||'Confira a prescrição de treino.','','↗');
  if(data.diet_available)addTimeline(items,'Plano alimentar disponível',data.diet_title||'Confira seu plano alimentar.','','↗');
  if(!items.length)addTimeline(items,'Sua jornada começa agora','Seu personal poderá adicionar medidas, treino e dieta conforme o acompanhamento evoluir.','','•');
  const list=document.getElementById('journey-timeline-list');list.replaceChildren();
  items.forEach(item=>{const li=document.createElement('li'),dot=document.createElement('span'),wrap=document.createElement('div'),title=document.createElement('strong'),desc=document.createElement('p'),time=document.createElement('time');dot.className='journey-timeline-dot';dot.textContent=item.mark;title.textContent=item.title;desc.textContent=item.description;if(item.date){time.textContent=dateText(item.date);time.dateTime=item.date}wrap.append(title,desc);if(item.date)wrap.append(time);li.append(dot,wrap);list.append(li)});
  const message=document.getElementById('page-message');if(message)message.textContent='';
 }catch(error){const message=document.getElementById('page-message');if(message)message.textContent='Não foi possível carregar sua jornada agora. Atualize a página para tentar novamente.';console.error('student_journey_load_failed',error)}
 document.getElementById('logout')?.addEventListener('click',async function(){this.disabled=true;try{await logout()}finally{location.replace('/student/pages/login.html')}});
});