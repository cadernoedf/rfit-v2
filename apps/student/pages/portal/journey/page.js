import {getCurrentUser,logout} from '../../../../shared/js/api-client.js';
document.addEventListener('DOMContentLoaded',async()=>{
 const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
 const organizeJourneyTabs=()=>{
  const root=document.getElementById('journey-tab-panels');if(!root||root.dataset.ready)return;
  const groups={overview:['#journey-anamnesis','.journey-metrics','.journey-content-grid'],evolution:['#journey-monthly-summary','.journey-comparison','#journey-timeline'],assessment:['#student-advanced-assessment'],progress:['.journey-goals','#journey-goal-modal','.journey-photos','.journey-report-actions'],achievements:['.journey-achievements'],notes:['#journey-professional-notes','#journey-anamnesis-update']};
  Object.entries(groups).forEach(([key,selectors],index)=>{const panel=document.createElement('section');panel.className='journey-tab-panel'+(index===0?' is-active':'');panel.dataset.journeyPanel=key;panel.hidden=index!==0;selectors.forEach(selector=>{const node=document.querySelector(selector);if(node)panel.append(node)});root.append(panel)});
  const nav=document.querySelector('.journey-tabs');nav?.querySelectorAll('[data-journey-tab]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.journeyTab;nav.querySelectorAll('[data-journey-tab]').forEach(item=>{const active=item===button;item.classList.toggle('is-active',active);item.setAttribute('aria-selected',String(active))});root.querySelectorAll('[data-journey-panel]').forEach(panel=>{const active=panel.dataset.journeyPanel===key;panel.classList.toggle('is-active',active);panel.hidden=!active});}));
  const activateHash=()=>{
    if(location.hash==='#student-advanced-assessment'){nav?.querySelector('[data-journey-tab="assessment"]')?.click();return;}
    if(location.hash==='#journey-timeline'){
      nav?.querySelector('[data-journey-tab="evolution"]')?.click();
      window.setTimeout(()=>document.getElementById('journey-timeline')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
    }
  };
  document.querySelectorAll('a[href="#journey-timeline"]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();if(location.hash!=='#journey-timeline')history.pushState(null,'','#journey-timeline');activateHash();}));
  window.addEventListener('hashchange',activateHash);activateHash();root.dataset.ready='1';
 };
 organizeJourneyTabs();
 const fmt=(value,unit='')=>value===null||value===undefined||value===''||!Number.isFinite(Number(value))?'—':Number(value).toLocaleString('pt-BR',{maximumFractionDigits:1})+unit;
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
   const kcalValue=body.basal_kcal??body.bmr_kcal??data.anamnesis_answers?.basal_kcal??data.anamnesis_answers?.bmr_kcal??data.anamnesis_answers?.form_answers?.basal_kcal??data.anamnesis_answers?.form_answers?.bmr_kcal??null;
   set('journey-kcal',kcalValue!==null&&kcalValue!==''&&Number.isFinite(Number(kcalValue))?Math.round(Number(kcalValue)).toLocaleString('pt-BR')+' kcal':'—');
   set('journey-kcal-note',kcalValue!==null&&kcalValue!==''&&Number.isFinite(Number(kcalValue))?'Estimativa diária registrada':'Kcal por dia · não informado');
  const checkins=Array.isArray(checkinData.checkins)?checkinData.checkins:[];
  const measurements=Array.isArray(measurementData.measurements)?measurementData.measurements:[];
  const orderedMeasurements=[...measurements].sort((a,b)=>new Date(a.measured_at||a.created_at||0)-new Date(b.measured_at||b.created_at||0));
  const firstMeasurement=orderedMeasurements[0]||null;
  const lastMeasurement=orderedMeasurements[orderedMeasurements.length-1]||null;
  // O ponto de partida vem da anamnese; o valor atual vem da última avaliação do professor.
  const readBaseline=(needles)=>{
    const normalize=value=>String(value||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
    const wanted=needles.map(normalize),seen=new Set();
    const visit=(node,depth=0)=>{
      if(!node||typeof node!=='object'||depth>8||seen.has(node))return null;seen.add(node);
      for(const [key,value] of Object.entries(node)){
        const k=normalize(key);
        if(wanted.some(term=>k===term||k.includes(term))){
          const raw=typeof value==='object'&&value!==null?(value.value??value.answer??value.resposta??value.response??value.valor):value;
          const number=typeof raw==='number'?raw:Number(String(raw??'').replace(',','.').replace(/[^0-9.-]/g,''));
          if(Number.isFinite(number)&&number>0)return number;
        }
      }
      for(const value of Object.values(node)){const found=visit(value,depth+1);if(found!==null)return found;}
      return null;
    };
    return visit(data.anamnesis_answers);
  };
  const baseline={weight_kg:readBaseline(['weight_kg','weight','peso_inicial','peso_atual','peso']),waist_cm:null,basal_kcal:null};
  const firstEvaluationValue=(...keys)=>{for(const row of orderedMeasurements){for(const key of keys){const value=row?.[key];if(value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))&&Number(value)>0)return Number(value);}}return null;};
  // Abdômen e gasto calórico começam na primeira avaliação do professor que contém cada medida.
  baseline.waist_cm=firstEvaluationValue('waist_cm','abdomen_cm','abdominal_cm','circumference_abdominal_cm');
  baseline.basal_kcal=firstEvaluationValue('basal_kcal','bmr_kcal','kcal');
  const baselineHeight=readBaseline(['height_cm','altura_cm','height','altura']);
  const heightMeters=baselineHeight?(baselineHeight>3?baselineHeight/100:baselineHeight):null;
  if(baseline.weight_kg&&heightMeters)baseline.bmi=Math.round((baseline.weight_kg/(heightMeters*heightMeters))*10)/10;
  const latestValue=(...keys)=>{for(let i=orderedMeasurements.length-1;i>=0;i--){for(const key of keys){const value=orderedMeasurements[i]?.[key];if(value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))&&Number(value)>0)return Number(value);}}return null;};
  const currentValues={weight_kg:latestValue('weight_kg'),waist_cm:latestValue('waist_cm','abdomen_cm','abdominal_cm','circumference_abdominal_cm'),bmi:latestValue('bmi'),basal_kcal:latestValue('basal_kcal','bmr_kcal','kcal')};
  if(!currentValues.bmi&&currentValues.weight_kg){const h=latestValue('height_cm')||baselineHeight;if(h){const hm=h>3?h/100:h;currentValues.bmi=Math.round(currentValues.weight_kg/(hm*hm)*10)/10;}}
  const comparisonRoot=document.getElementById('journey-body-comparison');
  const comparisonMetrics=[
    {key:'weight_kg',label:'Peso',emoji:'⚖️',unit:'kg',digits:1,startLabel:'Anamnese'},
    {key:'waist_cm',label:'Abdômen',emoji:'📏',unit:'cm',digits:1,startLabel:'1ª avaliação'},
    {key:'bmi',label:'IMC',emoji:'📊',unit:'',digits:1,startLabel:'Anamnese'},
    {key:'basal_kcal',label:'Calorias basais',emoji:'🔥',unit:'kcal',digits:0,startLabel:'1ª avaliação'}
  ];
  if(comparisonRoot){
    comparisonRoot.replaceChildren();
    comparisonMetrics.forEach(metric=>{
      const initial=baseline[metric.key],latest=currentValues[metric.key];
      const card=document.createElement('article');card.className='journey-body-metric';
      const head=document.createElement('div');head.className='journey-body-metric-head';
      const labelWrap=document.createElement('div');labelWrap.className='journey-body-metric-label';
      const emoji=document.createElement('span');emoji.className='journey-body-emoji';emoji.setAttribute('aria-hidden','true');emoji.textContent=metric.emoji;
      const label=document.createElement('strong');label.textContent=metric.label;
      labelWrap.append(emoji,label);
      const unit=document.createElement('span');unit.textContent=metric.unit||'índice';
      head.append(labelWrap,unit);
      const values=document.createElement('div');values.className='journey-body-values';
      const makeValue=(caption,value,current=false)=>{
        const wrap=document.createElement('div');wrap.className='journey-body-value'+(current?' journey-body-value-current':'');
        const small=document.createElement('small');small.textContent=caption;
        const strong=document.createElement('strong');
        strong.textContent=value===null||value===undefined||!Number.isFinite(Number(value))?'—':Number(value).toLocaleString('pt-BR',{minimumFractionDigits:metric.digits,maximumFractionDigits:metric.digits})+(metric.unit?' '+metric.unit:'');
        wrap.append(small,strong);return wrap;
      };
      values.append(makeValue(metric.startLabel,initial),Object.assign(document.createElement('span'),{className:'journey-body-arrow',textContent:'→'}),makeValue('Última avaliação',latest,true));
      const delta=document.createElement('div');delta.className='journey-body-delta';
      if(initial!==null&&initial!==undefined&&latest!==null&&latest!==undefined&&Number.isFinite(Number(initial))&&Number.isFinite(Number(latest))){
        const diff=Number(latest)-Number(initial);
        delta.textContent=Math.abs(diff)<0.005?'Sem alteração':(diff>0?'+':'')+diff.toLocaleString('pt-BR',{minimumFractionDigits:metric.digits,maximumFractionDigits:metric.digits})+(metric.unit?' '+metric.unit:'');
        delta.classList.add(Math.abs(diff)<0.005?'is-neutral':diff<0?'is-down':'is-up');
      }else{delta.textContent='Aguardando dados iniciais e avaliação';}
      card.append(head,values,delta);comparisonRoot.append(card);
    });
  }
  set('journey-record-count',String(measurements.length)+' avaliações · '+checkins.length+' check-ins');
  // Evolução corporal: exclusivamente avaliações registradas pelo professor.
  const evaluationPoints=orderedMeasurements.map(row=>({...row,source:'evaluation'}));
  const chartMetrics={
    weight:{label:'Peso corporal',unit:'kg',color:'#ef3348',value:r=>Number(r.weight_kg)},
    waist:{label:'Circunferência abdominal',unit:'cm',color:'#f08a35',value:r=>Number(r.waist_cm)},
    bmi:{label:'Índice de massa corporal',unit:'',color:'#2997dc',value:r=>Number(r.bmi)},
    kcal:{label:'Gasto calórico basal',unit:'kcal',color:'#2997dc',value:r=>Number(r.basal_kcal??r.bmr_kcal)}
  };
  const trendText=(key,unit='')=>{
    const first=baseline[key];
    const last=lastMeasurement?.[key]??(key==='basal_kcal'?lastMeasurement?.bmr_kcal:null);
    if(first===null||first===undefined||last===null||last===undefined)return 'Aguardando dados da anamnese e avaliação do professor';
    const delta=Number(last)-Number(first);
    if(!Number.isFinite(delta))return 'Aguardando dados da anamnese e avaliação do professor';
    if(Math.abs(delta)<0.005)return 'Sem alteração desde o início';
    const down=delta<0,el=document.createElement('span');
    el.textContent=(down?'↓ ':'↑ ')+Math.abs(delta).toLocaleString('pt-BR',{maximumFractionDigits:1})+unit+' desde o início';
    el.style.color=down?'#159b50':'#d33b4b';el.style.fontWeight='800';
    return el;
  };
  const trendTargets=[['journey-weight-note','weight_kg',' kg'],['journey-waist-note','waist_cm',' cm'],['journey-bmi-note','bmi',''],['journey-kcal-note','basal_kcal',' kcal']];
  trendTargets.forEach(([id,key,unit])=>{const target=document.getElementById(id);if(!target)return;const value=trendText(key,unit);target.replaceChildren();if(value instanceof Node)target.append(value);else target.textContent=value;});
  let activeMetric='weight';
  const chartNode=document.getElementById('journey-chart'),captionNode=document.getElementById('journey-chart-caption');
  const chartDate=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});};
  const renderJourneyChart=()=>{
    const metric=chartMetrics[activeMetric],points=measurements.map(row=>({date:row.measured_at,value:metric.value(row),source:'evaluation'})).filter(p=>Number.isFinite(p.value)&&p.value>0);
    document.querySelectorAll('.journey-chart-toggle').forEach(button=>{const active=button.dataset.metric===activeMetric;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
    if(captionNode)captionNode.textContent=metric.label+(metric.unit?' · '+metric.unit:'')+' · '+points.length+' '+(points.length===1?'registro':'registros')+' · avaliações do professor';
    if(!chartNode)return;
    if(!points.length){chartNode.innerHTML='<div class="journey-chart-empty"><span aria-hidden="true">↗</span><strong>Seu histórico está começando</strong><p>Assim que seu personal registrar avaliações com este indicador, a evolução aparecerá aqui.</p></div>';return;}
    if(points.length===1){const p=points[0],y=92;chartNode.innerHTML='<div class="journey-single-point-chart"><svg viewBox="0 0 760 205" role="img" aria-label="Primeiro registro de '+metric.label+'"><line x1="38" y1="170" x2="722" y2="170" stroke="#e9edf3" stroke-dasharray="3 5"/><line x1="38" y1="92" x2="722" y2="92" stroke="#e9edf3" stroke-dasharray="3 5"/><line x1="38" y1="20" x2="722" y2="20" stroke="#e9edf3" stroke-dasharray="3 5"/><circle cx="380" cy="'+y+'" r="8" fill="#fff" stroke="'+metric.color+'" stroke-width="4"/><text x="380" y="68" text-anchor="middle" fill="#273043" font-size="15" font-weight="800">'+p.value.toLocaleString('pt-BR')+(metric.unit?' '+metric.unit:'')+'</text><text x="380" y="194" text-anchor="middle" fill="#7b8494" font-size="11">'+chartDate(p.date)+'</text></svg><div class="journey-chart-empty"><strong>Primeiro registro realizado</strong><p>O ponto já mostra sua medida inicial. Com a próxima avaliação, aparecerá a linha de evolução.</p></div></div>';return;}
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
  // Comparação objetiva entre as duas avaliações mais recentes, sem misturar check-ins.
  const deltaRoot=document.querySelector('#journey-evaluation-delta .journey-evaluation-delta-grid');
  if(deltaRoot){
    deltaRoot.replaceChildren();
    const metrics=[['Peso','weight_kg','kg'],['Abdômen','waist_cm','cm'],['IMC','bmi',''],['Kcal basal','basal_kcal','kcal']];
    const validRows=[...measurements].sort((a,b)=>new Date(a.measured_at||a.created_at||0)-new Date(b.measured_at||b.created_at||0));
    metrics.forEach(([label,key,unit])=>{
      const fieldValue=row=>{const value=key==='basal_kcal'?(row?.basal_kcal??row?.bmr_kcal):key==='waist_cm'?(row?.waist_cm??row?.abdomen_cm??row?.abdominal_cm):row?.[key];return value===null||value===undefined||value===''||!Number.isFinite(Number(value))?null:Number(value);};
      const rows=validRows.map(row=>({row,value:fieldValue(row)})).filter(item=>item.value!==null);
      const card=document.createElement('article');card.className='journey-evaluation-delta-item';
      const name=document.createElement('span');name.textContent=label;
      const value=document.createElement('strong'),note=document.createElement('small');
      if(rows.length>=2){
        const previous=rows[rows.length-2],latest=rows[rows.length-1],diff=latest.value-previous.value;
        value.textContent=(diff>0?'+':'')+diff.toLocaleString('pt-BR',{maximumFractionDigits:key==='kcal'?0:1})+(unit?' '+unit:'');
        note.textContent='Anterior '+previous.value.toLocaleString('pt-BR')+' → atual '+latest.value.toLocaleString('pt-BR');
        value.style.color=Math.abs(diff)<0.005?'#7b8494':diff<0?'#159b50':'#d33b4b';
      }else if(rows.length===1){value.textContent=rows[0].value.toLocaleString('pt-BR')+(unit?' '+unit:'');note.textContent='Aguardando próxima avaliação';}
      else{value.textContent='—';note.textContent='Sem registro disponível';}
      card.append(name,value,note);deltaRoot.append(card);
    });
  }
  // Consistência: somente check-ins diários contam como dias registrados.
  const dailyCheckins=checkins.filter(item=>item.kind==='daily');
  const localDayKey=value=>{
    if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
    const date=value instanceof Date?value:new Date(value);
    if(Number.isNaN(date.getTime()))return '';
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    return parts.find(part=>part.type==='year').value+'-'+parts.find(part=>part.type==='month').value+'-'+parts.find(part=>part.type==='day').value;
  };
  const currentDayKey=localDayKey(new Date()),currentMonthKey=currentDayKey.slice(0,7);
  const dailyDates=[...new Set(dailyCheckins.map(item=>localDayKey(item.checkin_date||item.created_at)).filter(value=>/^\d{4}-\d{2}-\d{2}$/.test(value)))].sort().reverse();
  const monthDailyDays=new Set(dailyDates.filter(value=>value.slice(0,7)===currentMonthKey)).size;
  const monthDailyCheckins=dailyCheckins.filter(item=>localDayKey(item.checkin_date||item.created_at).slice(0,7)===currentMonthKey);
  const averageFieldFrom=(source,field)=>{
    const values=source.map(item=>Number(item[field])).filter(value=>Number.isFinite(value)&&value>=0&&value<=100);
    return values.length?Math.round(values.reduce((sum,value)=>sum+value,0)/values.length):null;
  };
  const trainingAverage=averageFieldFrom(monthDailyCheckins,'training_adherence');
  const foodAverage=averageFieldFrom(monthDailyCheckins,'nutrition_adherence');
  let streak=0;
  const yesterdayDate=new Date();yesterdayDate.setDate(yesterdayDate.getDate()-1);
  const streakStart=dailyDates.includes(currentDayKey)?currentDayKey:localDayKey(yesterdayDate);
  if(dailyDates.includes(streakStart)){
    let cursor=new Date(streakStart+'T12:00:00Z');
    for(;;){const key=cursor.toISOString().slice(0,10);if(!dailyDates.includes(key))break;streak++;cursor.setUTCDate(cursor.getUTCDate()-1);}
  }
  const setStat=(id,value)=>{const node=document.getElementById(id);if(node)node.textContent=value;};
  setStat('journey-consistency-days',String(monthDailyDays));
  setStat('journey-consistency-training',trainingAverage===null?'—':trainingAverage+'%');
  setStat('journey-consistency-food',foodAverage===null?'—':foodAverage+'%');
  setStat('journey-consistency-streak',String(streak));
  set('journey-checkin-count',String(monthDailyDays));
  const ring=document.querySelector('.journey-ring');
  if(ring){
    const daysInMonth=new Date(Number(currentMonthKey.slice(0,4)),Number(currentMonthKey.slice(5,7)),0).getDate();
    const progress=daysInMonth?Math.min(100,monthDailyDays/daysInMonth*100):0;
    ring.style.background='conic-gradient(#ff3348 '+(progress*3.6)+'deg,#eceff4 0deg 360deg)';
  }

  const goalsList=document.getElementById('journey-goals-list');
  const goalForm=document.getElementById('journey-goal-form');
  const goalMessage=document.getElementById('journey-goal-message');
  const goalMetric=goalForm?.querySelector('select[name="metric"]'),goalUnit=goalForm?.querySelector('input[name="unit"]'),goalStart=goalForm?.querySelector('input[name="start_value"]');
  const latestEvaluation=[...measurements].sort((a,b)=>new Date(b.measured_at||b.created_at||0)-new Date(a.measured_at||a.created_at||0))[0]||null;
  const metricConfig={weight:{unit:'kg',field:'weight_kg',label:'Peso'},waist:{unit:'cm',field:'waist_cm',label:'Abdômen'},body_fat:{unit:'%',field:'body_fat_pct',label:'Percentual de gordura'},fitness:{unit:'',field:null,label:'Condicionamento'},custom:{unit:'',field:null,label:'Outro'}};
  const syncGoalMetric=(fillStart=true)=>{
    if(!goalMetric)return;const config=metricConfig[goalMetric.value]||metricConfig.custom;
    if(goalUnit)goalUnit.value=config.unit;
    if(goalStart){
      const value=config.field&&latestEvaluation?latestEvaluation[config.field]:null;
      if(fillStart)goalStart.value=value!==null&&value!==undefined&&value!==''?String(value):'';
      const hasValue=value!==null&&value!==undefined&&value!=='';
      goalStart.placeholder=hasValue?'Última avaliação: '+String(value).replace('.',',')+(config.unit?' '+config.unit:''):'Nenhuma avaliação encontrada';
      const baselineNote=document.getElementById('journey-goal-baseline-note');
      if(baselineNote)baselineNote.textContent=hasValue?'Preenchido automaticamente com a última avaliação registrada pelo professor.':'Ainda não há avaliação deste indicador; você pode informar o valor inicial manualmente.';
      if(hasValue)goalStart.title='Última avaliação do professor: '+String(value)+(config.unit?' '+config.unit:'');else goalStart.removeAttribute('title');
    }
  };
  goalMetric?.addEventListener('change',()=>syncGoalMetric(true));syncGoalMetric(true);

  const goalModal=document.getElementById('journey-goal-modal');
  const openGoalButton=document.getElementById('journey-open-goal');
  const closeGoalModal=()=>{if(goalModal)goalModal.hidden=true;};
  openGoalButton?.addEventListener('click',()=>{syncGoalMetric(true);if(goalModal)goalModal.hidden=false;goalForm?.querySelector('input[name="title"]')?.focus();});
  goalModal?.querySelectorAll('[data-close-goal]').forEach(button=>button.addEventListener('click',closeGoalModal));
  goalModal?.addEventListener('click',event=>{if(event.target===goalModal)closeGoalModal();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&goalModal&&!goalModal.hidden)closeGoalModal();});

  const photoForm=document.getElementById('journey-photo-form');
  const photoGallery=document.getElementById('journey-photo-gallery');
  const photoMessage=document.getElementById('journey-photo-message');
  let currentGoals=[],journeyPhotos=[];
  const refreshGoals=async()=>{
    const response=await fetch('/api/student/journey/goals',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('goals_unavailable');
    const data=await response.json();currentGoals=Array.isArray(data.goals)?data.goals:[];renderGoals(currentGoals);return currentGoals;
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
      if(goal.current_value!==null&&goal.current_value!==undefined&&goal.target_value!==null&&goal.target_value!==undefined){
        const start=Number(goal.start_value),currentValue=Number(goal.current_value),targetValue=Number(goal.target_value);
        if(Number.isFinite(currentValue)&&Number.isFinite(targetValue)){
          const increasing=Number.isFinite(start)?targetValue>=start:targetValue>=currentValue;
          const remaining=Math.max(0,increasing?targetValue-currentValue:currentValue-targetValue);
          const distance=document.createElement('p');distance.className='journey-goal-distance';
          distance.textContent=remaining===0?'🎉 Meta alcançada!': 'Faltam '+fmt(remaining,goal.unit?' '+goal.unit:'')+' para alcançar sua meta.';
          card.append(distance);
        }
      }
      if(goal.completed_at){const done=document.createElement('p');done.textContent='Meta alcançada em '+dateText(goal.completed_at);card.append(done);}
      if(goal.notes){const note=document.createElement('p');note.textContent=goal.notes;card.append(note);}
      const actions=document.createElement('div');actions.className='journey-goal-actions';
      const remove=document.createElement('button');remove.type='button';remove.textContent='Excluir meta';remove.addEventListener('click',async()=>{if(!confirm('Excluir esta meta?'))return;remove.disabled=true;try{const response=await fetch('/api/student/journey/goals/'+encodeURIComponent(goal.id),{method:'DELETE',credentials:'same-origin'});if(!response.ok)throw new Error('delete_failed');await refreshGoals();}catch(error){if(goalMessage)goalMessage.textContent='Não foi possível excluir a meta.';remove.disabled=false;}});actions.append(remove);card.append(actions);goalsList.append(card);
    });
  };
  try{await refreshGoals();}catch(error){if(goalsList){goalsList.replaceChildren();const warning=document.createElement('p');warning.className='journey-muted';warning.textContent='Não foi possível consultar suas metas salvas. Seus registros não foram apagados.';goalsList.append(warning);}console.error('journey_goals_load_failed',error);}
  if(goalForm)goalForm.addEventListener('submit',async event=>{
    event.preventDefault();const submit=goalForm.querySelector('button[type="submit"]');submit.disabled=true;if(goalMessage)goalMessage.textContent='Salvando objetivo…';
    try{const form=new FormData(goalForm),payload=Object.fromEntries(form.entries());payload.start_value=payload.start_value===''?null:Number(payload.start_value);payload.target_value=payload.target_value===''?null:Number(payload.target_value);
      const response=await fetch('/api/student/journey/goals',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'goal_save_failed');await refreshGoals();goalForm.reset();closeGoalModal();if(goalMessage)goalMessage.textContent='Objetivo salvo. A evolução será atualizada quando novas avaliações forem registradas.';
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
  const cameraInput=document.getElementById('journey-photo-camera-input'),galleryInput=document.getElementById('journey-photo-file'),selectedText=document.getElementById('journey-photo-selected');
  const photoDateInput=photoForm?.querySelector('input[name="date"]');if(photoDateInput&&!photoDateInput.value)photoDateInput.value=new Date().toISOString().slice(0,10);
  let selectedPhoto=null;
  document.getElementById('journey-photo-camera')?.addEventListener('click',()=>cameraInput?.click());
  document.getElementById('journey-photo-choose')?.addEventListener('click',()=>galleryInput?.click());
  const selectPhoto=file=>{if(!file)return;selectedPhoto=file;if(selectedText)selectedText.textContent='Foto pronta para envio: '+file.name;};
  cameraInput?.addEventListener('change',()=>selectPhoto(cameraInput.files?.[0]));
  galleryInput?.addEventListener('change',()=>selectPhoto(galleryInput.files?.[0]));
  const compressPhoto=async file=>{
    if(!file||!file.type.startsWith('image/'))throw new Error('Selecione uma imagem válida.');
    let bitmap;
    try{bitmap=await createImageBitmap(file);}catch(error){throw new Error('Não foi possível abrir esta imagem neste aparelho. Tente selecionar outra foto.');}
    let width=bitmap.width,height=bitmap.height;
    const maxSide=1600;
    if(Math.max(width,height)>maxSide){const scale=maxSide/Math.max(width,height);width=Math.round(width*scale);height=Math.round(height*scale);}
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
    if(!context){bitmap.close?.();throw new Error('Não foi possível preparar a foto neste aparelho.');}
    const encode=(quality)=>new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
    let blob=null;
    try{
      for(let attempt=0;attempt<9;attempt++){
        canvas.width=width;canvas.height=height;
        context.clearRect(0,0,width,height);context.drawImage(bitmap,0,0,width,height);
        const quality=[.82,.72,.62,.52,.45,.4,.36,.32,.28][attempt];
        blob=await encode(quality);
        if(blob&&blob.size<=716800)break;
        if(attempt===2||attempt===4||attempt===6){width=Math.max(1,Math.round(width*.82));height=Math.max(1,Math.round(height*.82));}
      }
    }finally{bitmap.close?.();}
    if(!blob||blob.size>716800)throw new Error('Não foi possível processar esta imagem. Tente novamente.');
    return blob;
  };
  if(photoForm)photoForm.addEventListener('submit',async event=>{
    event.preventDefault();const submit=photoForm.querySelector('button[type="submit"]'),file=selectedPhoto;submit.disabled=true;if(photoMessage)photoMessage.textContent='Comprimindo e enviando foto…';
    try{const blob=await compressPhoto(file),form=new FormData(photoForm),params=new URLSearchParams({type:String(form.get('type')||'progresso'),date:String(form.get('date')||''),note:String(form.get('note')||'')});
      const response=await fetch('/api/student/journey/photos?'+params.toString(),{method:'POST',credentials:'same-origin',headers:{'Content-Type':'image/jpeg'},body:blob});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'photo_upload_failed');photoForm.reset();if(cameraInput)cameraInput.value='';selectedPhoto=null;if(selectedText)selectedText.textContent='Nenhuma foto selecionada.';if(photoMessage)photoMessage.textContent='Foto salva com segurança no D1.';await loadPhotos();renderAchievements();
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

  // Calendário semanal: navegação entre semanas e marcação dos check-ins reais.
  const calendarNode=document.getElementById('journey-checkin-calendar');
  if(calendarNode){
    const activeDays=new Set(checkins.map(item=>String(item.checkin_date||item.week_start||item.created_at||'').slice(0,10)).filter(value=>/^\d{4}-\d{2}-\d{2}$/.test(value)));
    const today=new Date();today.setHours(0,0,0,0);
    const mondayOf=date=>{const d=new Date(date);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d;};
    let displayedMonday=mondayOf(today);
    const keyOf=date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
    const addDays=(date,n)=>{const d=new Date(date);d.setDate(d.getDate()+n);return d;};
    const renderWeek=()=>{
      calendarNode.replaceChildren();let completed=0;
      const sunday=addDays(displayedMonday,6);
      const label=document.getElementById('journey-week-label');
      if(label)label.textContent=displayedMonday.getMonth()===sunday.getMonth()?displayedMonday.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'})+' – '+sunday.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'}):displayedMonday.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})+' – '+sunday.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
      for(let offset=0;offset<7;offset++){
        const day=addDays(displayedMonday,offset),key=keyOf(day),checked=activeDays.has(key),isToday=key===keyOf(today);
        if(checked)completed++;
        const cell=document.createElement('div');cell.className='journey-week-day'+(checked?' is-checked':'')+(isToday?' is-today':'');
        const name=document.createElement('span');name.className='journey-week-day-name';name.textContent=['SEG','TER','QUA','QUI','SEX','SÁB','DOM'][offset];
        const number=document.createElement('strong');number.className='journey-week-day-number';number.textContent=String(day.getDate());
        const status=document.createElement('span');status.className='journey-week-day-status';status.textContent=checked?'✓':'·';
        cell.title=day.toLocaleDateString('pt-BR')+(checked?' · Check-in realizado':' · Sem check-in');
        cell.append(name,number,status);calendarNode.append(cell);
      }
      const summary=document.getElementById('journey-week-summary');
      if(summary)summary.textContent=completed+' de 7 dias com check-in nesta semana'+(displayedMonday>mondayOf(today)?'.':' · Cada registro conta!');
      const next=document.getElementById('journey-week-next');if(next)next.disabled=displayedMonday>=mondayOf(today);
    };
    document.getElementById('journey-week-prev')?.addEventListener('click',()=>{displayedMonday=addDays(displayedMonday,-7);renderWeek();});
    document.getElementById('journey-week-next')?.addEventListener('click',()=>{if(displayedMonday<mondayOf(today)){displayedMonday=addDays(displayedMonday,7);renderWeek();}});
    document.getElementById('journey-week-today')?.addEventListener('click',()=>{displayedMonday=mondayOf(today);renderWeek();});
    renderWeek();
  }
  // Comparação lado a lado com as imagens privadas já salvas no D1.
  const beforeSelect=document.getElementById('journey-photo-before'),afterSelect=document.getElementById('journey-photo-after'),compareButton=document.getElementById('journey-photo-compare-button'),compareResult=document.getElementById('journey-photo-compare-result');
  const refreshPhotoComparison=()=>{
    if(!beforeSelect||!afterSelect)return;
    const ordered=[...journeyPhotos].sort((a,b)=>new Date(a.taken_at)-new Date(b.taken_at));
    [beforeSelect,afterSelect].forEach(select=>{const old=select.value;select.replaceChildren();const prompt=document.createElement('option');prompt.value='';prompt.textContent='Selecione uma foto';select.append(prompt);ordered.forEach(photo=>{const option=document.createElement('option');option.value=photo.id;option.textContent=dateText(photo.taken_at)+' · '+(({frente:'Frente',lado:'Lado',costas:'Costas',progresso:'Progresso geral'})[photo.photo_type]||'Foto');select.append(option);});if(ordered.some(photo=>photo.id===old))select.value=old;});
    if(ordered.length>=2){
      if(!beforeSelect.value||!afterSelect.value){
        const byType=new Map();ordered.forEach(photo=>{const key=photo.photo_type||'progresso';if(!byType.has(key))byType.set(key,[]);byType.get(key).push(photo);});
        const sameAngle=[...byType.values()].filter(group=>group.length>=2).sort((a,b)=>b.length-a.length)[0];
        const pair=sameAngle||ordered;
        if(!beforeSelect.value)beforeSelect.value=pair[0].id;
        if(!afterSelect.value)afterSelect.value=pair[pair.length-1].id;
      }
    }
  };
  refreshPhotoComparison();
  compareButton?.addEventListener('click',()=>{
    const pair=[{id:beforeSelect?.value,label:'Antes'},{id:afterSelect?.value,label:'Depois'}];
    if(!pair[0].id||!pair[1].id||pair[0].id===pair[1].id){if(photoMessage)photoMessage.textContent='Escolha duas fotos diferentes para comparar.';return;}
    compareResult.replaceChildren();pair.forEach(item=>{const photo=journeyPhotos.find(row=>row.id===item.id);if(!photo)return;const figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');image.loading='lazy';image.alt='Foto '+item.label;image.src='/api/student/journey/photos/'+encodeURIComponent(photo.id)+'/image';caption.textContent=item.label+' · '+dateText(photo.taken_at);figure.append(image,caption);compareResult.append(figure);});compareResult.hidden=false;
  });
  // Resumo do mês atual, calculado sem criar ou alterar registros.
  const monthNow=new Date();
  const localMonthKey=date=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).formatToParts(date);return parts.find(part=>part.type==='year').value+'-'+parts.find(part=>part.type==='month').value;};
  const monthKey=localMonthKey(monthNow);
  const inMonth=value=>{if(!value)return false;const parsed=new Date(value);return Number.isNaN(parsed.getTime())?String(value).slice(0,7)===monthKey:localMonthKey(parsed)===monthKey;};
  const monthCheckins=checkins.filter(item=>inMonth(item.created_at||item.checkin_date)).length;
  const monthMeasurements=measurements.filter(item=>inMonth(item.measured_at||item.created_at)).length;
  const monthPhotos=journeyPhotos.filter(item=>inMonth(item.taken_at||item.created_at)).length;
  const monthCompleted=currentGoals.filter(item=>item.status==='completed'&&inMonth(item.completed_at)).length;
  set('journey-month-label',new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).format(monthNow));
  set('journey-month-checkins',String(monthCheckins));set('journey-month-measurements',String(monthMeasurements));set('journey-month-photos',String(monthPhotos));set('journey-month-goals',String(monthCompleted));
  const highlight=document.getElementById('journey-month-highlight');
  if(highlight){const total=monthCheckins+monthMeasurements+monthPhotos;highlight.textContent=total>0?'Neste mês: '+monthCheckins+' check-ins · '+monthMeasurements+' avaliações · '+monthPhotos+' fotos ('+total+' registros no total).':'Seu mês está começando. O próximo registro será o primeiro deste período.';}
  document.getElementById('journey-month-print')?.addEventListener('click',()=>{
    const reportWindow=window.open('','_blank');if(!reportWindow){window.print();return;}
    const escapeHtml=value=>String(value??'—').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const rows=[['Check-ins registrados',monthCheckins],['Avaliações físicas',monthMeasurements],['Fotos de evolução',monthPhotos],['Metas concluídas',monthCompleted],['Dias com check-in diário',monthDailyDays],['Adesão média aos treinos',trainingAverage===null?'Sem dados':trainingAverage+'%'],['Adesão média à alimentação',foodAverage===null?'Sem dados':foodAverage+'%'],['Sequência atual de dias',streak]];
    const reportMetrics=[['Peso',baseline.weight_kg,currentValues.weight_kg,'kg'],['Abdômen',baseline.waist_cm,currentValues.waist_cm,'cm'],['IMC',baseline.bmi,currentValues.bmi,''],['Calorias basais',baseline.basal_kcal,currentValues.basal_kcal,'kcal']];
    const formatValue=(value,unit)=>value===null||value===undefined||!Number.isFinite(Number(value))?'—':Number(value).toLocaleString('pt-BR',{maximumFractionDigits:1})+(unit?' '+unit:'');
    const reportMonth=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).format(monthNow);
    reportWindow.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relatório de evolução R-Fit</title><style>*{box-sizing:border-box}body{font:14px Arial,sans-serif;color:#202b3a;padding:28px;max-width:850px;margin:auto}header{border-bottom:3px solid #ed304b;padding-bottom:14px;margin-bottom:20px}.brand{font-weight:900;letter-spacing:.15em;color:#ed304b;font-size:12px}h1{font-size:26px;margin:8px 0 4px}h2{font-size:17px;margin:24px 0 10px}.muted{color:#718096}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.item{border:1px solid #dce2eb;border-radius:9px;padding:12px}.item b{display:block;font-size:23px;margin-bottom:5px}.item span{font-size:11px;color:#657286}.table{width:100%;border-collapse:collapse}.table th,.table td{text-align:left;padding:10px;border-bottom:1px solid #e5e9ef}.table th{font-size:11px;color:#697586;text-transform:uppercase}.note{padding:13px;background:#fff1f3;border-radius:8px;margin-top:18px}.foot{margin-top:26px;font-size:11px;color:#8a94a3}@media(max-width:600px){body{padding:16px}.grid{grid-template-columns:repeat(2,1fr)}}@media print{body{padding:0}.item,.note{print-color-adjust:exact;-webkit-print-color-adjust:exact}button{display:none}}</style></head><body><header><div class="brand">R-FIT · SUA EVOLUÇÃO</div><h1>Relatório de acompanhamento</h1><p class="muted">'+escapeHtml(reportMonth)+'</p></header><h2>Resumo do mês</h2><div class="grid">'+rows.map(row=>'<div class="item"><b>'+escapeHtml(row[1])+'</b><span>'+escapeHtml(row[0])+'</span></div>').join('')+'</div><h2>Evolução corporal</h2><p class="muted">Comparação entre a referência inicial disponível e a avaliação mais recente registrada pelo professor.</p><table class="table"><thead><tr><th>Indicador</th><th>Referência inicial</th><th>Atual</th></tr></thead><tbody>'+reportMetrics.map(row=>'<tr><td>'+escapeHtml(row[0])+'</td><td>'+escapeHtml(formatValue(row[1],row[3]))+'</td><td>'+escapeHtml(formatValue(row[2],row[3]))+'</td></tr>').join('')+'</tbody></table><p class="note">'+escapeHtml(highlight?.textContent||'Cada registro conta.')+'</p><p class="foot">Relatório gerado a partir dos registros disponíveis na sua conta R-Fit. Check-ins são autorrelatos; medidas corporais são provenientes das avaliações profissionais.</p><script>window.onload=()=>window.print()<\/script></body></html>');
    reportWindow.document.close();
  });
  // Orientações registradas pelo profissional para este aluno.
  const notesList=document.getElementById('journey-professional-notes-list');let journeyNotes=[];
  try{
    const response=await fetch('/api/student/journey/notes',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('notes_unavailable');
    const result=await response.json();journeyNotes=Array.isArray(result.notes)?result.notes:[];const notes=journeyNotes;
    if(notesList){notesList.replaceChildren();if(!notes.length){const empty=document.createElement('p');empty.className='journey-muted';empty.textContent='Seu personal ainda não deixou orientações por aqui.';notesList.append(empty);}else{notes.forEach(note=>{const card=document.createElement('article');card.className='journey-professional-note';const author=document.createElement('strong'),body=document.createElement('p'),time=document.createElement('time');author.textContent=note.author_name||'Seu personal';body.textContent=note.note;time.textContent=dateText(note.created_at);card.append(author,body,time);notesList.append(card);});}}
  }catch(error){if(notesList){notesList.replaceChildren();const empty=document.createElement('p');empty.className='journey-muted';empty.textContent='As orientações profissionais não estão disponíveis no momento.';notesList.append(empty);}}

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
  const pushEvent=(title,description,date,mark,kind)=>{if(!date)return;const parsed=new Date(date);if(Number.isNaN(parsed.getTime()))return;items.push({title,description:description||'Registro adicionado ao seu acompanhamento.',date:parsed.toISOString(),stamp:parsed.getTime(),mark,kind});};
  if(data.anamnesis_completed||anamnesis?.completed)pushEvent('Anamnese concluída','Seus dados iniciais foram registrados para orientar seu acompanhamento.',anamnesis?.completed_at||data.anamnesis_completed_at,'✓','profile');
  measurements.forEach(row=>{const parts=[];if(row.weight_kg!=null)parts.push('Peso '+fmt(row.weight_kg,' kg'));const abdomen=row.waist_cm??row.abdomen_cm??row.abdominal_cm;if(abdomen!=null)parts.push('Abdômen '+fmt(abdomen,' cm'));if(row.bmi!=null)parts.push('IMC '+fmt(row.bmi));if(row.basal_kcal!=null)parts.push(Math.round(Number(row.basal_kcal)).toLocaleString('pt-BR')+' kcal');pushEvent('Avaliação física registrada',parts.join(' · ')||'Nova avaliação adicionada pelo professor.',row.measured_at||row.created_at,'⚖','assessment');});
  [...checkins].forEach(item=>{const answers=item.answers&&typeof item.answers==='object'?item.answers:{};const labels={sleep_quality:'Sono',energy:'Energia',appetite:'Apetite',training_adherence:'Treinos',nutrition_adherence:'Alimentação',discomfort:'Desconforto'};const details=Object.entries(answers).filter(([key,value])=>value!=null&&value!=='').map(([key,value])=>(labels[key]||key)+': '+(key==='discomfort'?(Number(value)?'Sim':'Não'):['sleep_quality','energy','appetite'].includes(key)?value+'/5':key.endsWith('_adherence')?value+'%':String(value)));if(item.weight_kg)details.unshift('Peso: '+fmt(item.weight_kg,' kg'));if(item.notes)details.push(item.notes);pushEvent(item.kind==='daily'?'Check-in diário realizado':'Check-in semanal realizado',details.join(' · ')||'Você registrou como está sua rotina.',item.created_at||item.checkin_date||item.week_start,'✓','checkin');});
  journeyPhotos.forEach(photo=>pushEvent('Foto de evolução adicionada',photo.note||'Registro visual · '+(photo.photo_type||'progresso'),photo.taken_at||photo.created_at,'📸','photo'));
  currentGoals.forEach(goal=>{pushEvent('Meta criada: '+goal.title,'Objetivo: '+fmt(goal.target_value,goal.unit?' '+goal.unit:''),goal.created_at,'🎯','goal');if(goal.completed_at||goal.status==='completed')pushEvent('Meta concluída: '+goal.title,'Parabéns por alcançar este objetivo!',goal.completed_at||goal.updated_at,'🏆','goal-done');});
  journeyNotes.forEach(note=>pushEvent('Orientação do personal',note.note,note.created_at,'✎','note'));
  items.sort((a,b)=>b.stamp-a.stamp);
  const list=document.getElementById('journey-timeline-list'),more=document.getElementById('journey-timeline-more'),timelineCount=document.getElementById('journey-timeline-count');
  let timelineLimit=8;
  const renderTimeline=()=>{list.replaceChildren();const visible=items.slice(0,timelineLimit);if(timelineCount)timelineCount.textContent=items.length?items.length+' acontecimentos':'Nenhum acontecimento registrado ainda';if(!visible.length){const empty=document.createElement('li');empty.className='journey-timeline-empty';const copy=document.createElement('p');copy.textContent='Quando você fizer um check-in, receber uma avaliação, adicionar fotos ou receber orientações, tudo aparecerá aqui em ordem cronológica.';empty.append(copy);list.append(empty);}visible.forEach(item=>{const li=document.createElement('li');li.className='journey-timeline-event journey-timeline-'+item.kind;const dot=document.createElement('span');dot.className='journey-timeline-dot';dot.textContent=item.mark;const wrap=document.createElement('div');wrap.className='journey-timeline-copy';const head=document.createElement('div');head.className='journey-timeline-event-head';const title=document.createElement('strong');title.textContent=item.title;const time=document.createElement('time');time.textContent=new Date(item.date).toLocaleString('pt-BR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});time.dateTime=item.date;const desc=document.createElement('p');desc.textContent=item.description;head.append(title,time);wrap.append(head,desc);li.append(dot,wrap);list.append(li);});if(more){more.hidden=items.length<=8;more.textContent=timelineLimit>=items.length?'Mostrar menos':'Ver mais acontecimentos ('+(items.length-timelineLimit)+')';}};
  renderTimeline();more?.addEventListener('click',()=>{timelineLimit=timelineLimit>=items.length?8:Math.min(items.length,timelineLimit+8);renderTimeline();});
  // Avaliações avançadas registradas pelo professor: histórico liberado ao aluno.
  try{
    const response=await fetch('/api/student/advanced-assessments',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('advanced_assessments_unavailable');
    const result=await response.json(),status=document.getElementById('student-advanced-status'),list=document.getElementById('student-advanced-list'),records=Array.isArray(result.assessments)?result.assessments:[];
    if(records.length){
      if(!result.is_premium){status.classList.add('is-courtesy');status.textContent='Você foi contemplado pelo professor! Esta avaliação foi oferecida como cortesia. Para realizar novas avaliações avançadas, faça upgrade do seu plano.';const link=document.createElement('a');link.href='../plan/index.html';link.textContent='Conhecer planos e fazer upgrade →';status.append(link);}
      else status.textContent='Seu plano Premium está ativo. Aqui ficam suas avaliações avançadas e seu histórico.';
      const latest=records[0],metrics=[['Gordura corporal',latest.body_fat_pct, '%'],['Massa magra',latest.lean_mass_kg,' kg'],['Massa de gordura',latest.fat_mass_kg,' kg'],['IMC',latest.bmi,''],['Cintura/estatura',latest.waist_height_ratio,''],['Densidade corporal',latest.body_density,'']];
      const cards=document.createElement('div');cards.className='student-advanced-results';metrics.forEach(([label,value,unit])=>{if(value===null||value===undefined)return;const card=document.createElement('div');card.className='student-advanced-result';const strong=document.createElement('strong');strong.textContent=Number(value).toLocaleString('pt-BR',{maximumFractionDigits:2})+unit;const caption=document.createElement('span');caption.textContent=label;card.append(strong,caption);cards.append(card)});list.append(cards);
      const visuals=document.createElement('div');visuals.className='student-advanced-visuals';const map=document.createElement('section');map.className='student-body-map';map.innerHTML='<h3>Mapa corporal</h3><svg viewBox="0 0 180 190" role="img" aria-label="Silhuetas corporais frontal e posterior"><g transform="translate(12 4)"><circle cx="38" cy="15" r="11" fill="#e8b7c0"/><path d="M25 30Q38 24 51 30L57 74 50 83 54 125 48 178 37 178 35 126 32 178 21 178 25 125 28 83 19 74Z" fill="#f4d4da" stroke="#c96b7d" stroke-width="1.6"/><path d="M23 38 7 91M53 38 69 91" stroke="#c96b7d" stroke-width="8" stroke-linecap="round"/></g><g transform="translate(98 4)"><circle cx="28" cy="15" r="11" fill="#d9c6e9"/><path d="M15 30Q28 24 41 30L47 74 40 83 44 125 38 178 27 178 25 126 22 178 11 178 15 125 18 83 9 74Z" fill="#e8def1" stroke="#9875ad" stroke-width="1.6"/><path d="M13 38-3 91M43 38 59 91" stroke="#9875ad" stroke-width="8" stroke-linecap="round"/></g></svg>';const chart=document.createElement('section');chart.className='student-advanced-chart';chart.innerHTML='<h3>Composição corporal ao longo das avaliações</h3>';const points=records.slice().reverse().filter(r=>r.body_fat_pct!==null&&r.body_fat_pct!==undefined);if(points.length>=1){const values=points.map(r=>Number(r.body_fat_pct)),min=Math.min(...values),max=Math.max(...values),range=max-min||Math.max(1,values[0]*.08),x=i=>points.length===1?200:24+i*352/(points.length-1),y=v=>128-(v-(min-range*.15))/(range*1.3)*92,coords=values.map((v,i)=>x(i)+','+y(v)).join(' ');chart.insertAdjacentHTML('beforeend','<svg viewBox="0 0 400 150" role="img" aria-label="Gráfico de percentual de gordura corporal"><line x1="20" y1="128" x2="380" y2="128" stroke="#e8edf3"/>'+(points.length>1?'<polyline points="'+coords+'" fill="none" stroke="#e32e43" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>':'<line x1="24" y1="128" x2="376" y2="128" stroke="#e8edf3" stroke-width="2"/>')+values.map((v,i)=>'<circle cx="'+x(i)+'" cy="'+y(v)+'" r="5.5" fill="#e32e43"/>').join('')+'</svg>');const caption=document.createElement('p');caption.textContent=points.length===1?'Primeiro registro: '+values[0].toLocaleString('pt-BR',{maximumFractionDigits:1})+'%. As próximas avaliações formarão a linha de evolução.':points.length+' avaliações com percentual de gordura calculado.';chart.append(caption)}else{const note=document.createElement('p');note.textContent='Ainda não há percentual de gordura calculado para montar este gráfico.';chart.append(note)}visuals.append(map,chart);list.append(visuals);
      const history=document.createElement('div');history.className='student-advanced-history';records.forEach(record=>{const row=document.createElement('article');row.className='student-advanced-row';const title=document.createElement('strong'),detail=document.createElement('span');title.textContent='Avaliação de '+dateText(record.measured_at);detail.textContent=['Peso: '+fmt(record.weight_kg,' kg'),'Altura: '+fmt(record.height_cm,' cm'),'Cintura: '+fmt(record.waist_cm,' cm'),'Abdômen: '+fmt(record.abdomen_cm,' cm'),record.body_fat_pct!=null?'Gordura corporal: '+Number(record.body_fat_pct).toFixed(1).replace('.',',')+'%':'',record.notes||''].filter(Boolean).join(' · ');row.append(title,detail);history.append(row)});list.append(history);
    }else if(result.is_premium){status.textContent='Seu plano Premium está ativo. Assim que seu professor registrar uma avaliação avançada, ela aparecerá aqui.';}
    else{status.classList.add('is-upgrade');status.textContent='As avaliações avançadas fazem parte do R-Fit Premium. Faça upgrade do plano para liberar esse recurso.';const link=document.createElement('a');link.href='../plan/index.html';link.textContent='Fazer upgrade do plano →';status.append(link);}
  }catch(error){const status=document.getElementById('student-advanced-status');if(status)status.textContent='Não foi possível carregar suas avaliações agora.';}
  const message=document.getElementById('page-message');if(message)message.textContent='';
 }catch(error){const message=document.getElementById('page-message');if(message)message.textContent='Não foi possível carregar sua jornada agora. Atualize a página para tentar novamente.';console.error('student_journey_load_failed',error)}
 document.getElementById('logout')?.addEventListener('click',async function(){this.disabled=true;try{await logout()}finally{location.replace('/student/pages/login.html')}});
});