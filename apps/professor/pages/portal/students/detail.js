/* ==========================================================================
   R-FIT | PORTAL DO PROFESSOR
   Módulo: Perfil individual, treinos e dietas.
   ========================================================================== */
import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';

/* ===== IDENTIFICAÇÃO ===== */
const $=(selector)=>document.querySelector(selector);
const studentId=new URLSearchParams(location.search).get('id');
let currentStudentSex='';
let workoutStudentContext={student:null,anamnesis:null};
const message=(text,state='')=>{const el=$('#page-message');el.textContent=text;el.dataset.state=state;};
async function api(url,options={}){const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers:{Accept:'application/json','Content-Type':'application/json',...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok){const error=new Error(data.error||'request_failed');error.stage=data.stage||null;throw error;}return data;}
const money=(cents)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(cents||0)/100);
function makeListItem(title,detail,status){const item=document.createElement('div');item.className='detail-record';const name=document.createElement('strong');name.textContent=title;const note=document.createElement('small');note.textContent=detail;const state=document.createElement('span');state.className='detail-record-status';state.textContent=status;item.append(name,note,state);return item;}

/* ===== RENDERIZAÇÃO DO PERFIL ===== */
function render(data){
 const s=data.student,sub=data.subscription;workoutStudentContext={student:s,anamnesis:data.anamnesis||null};
 currentStudentSex=String(s.sex||'').toLowerCase();
 if(!['m','f','male','female','masculino','feminino'].includes(currentStudentSex)&&data.anamnesis?.answers_json){
  try{
   const answers=JSON.parse(data.anamnesis.answers_json);
   const normalizeSex=value=>{const v=String(value??'').trim().toLowerCase();if(['m','male','masculino','homem'].includes(v))return 'm';if(['f','female','feminino','mulher'].includes(v))return 'f';return '';};
   const findSex=(obj)=>{if(typeof obj==='string'){try{return findSex(JSON.parse(obj));}catch{return '';}}if(!obj||typeof obj!=='object')return '';const entries=Object.entries(obj);const question=String(obj.question||obj.label||obj.title||obj.pergunta||obj.field_label||'');if(/sexo|sex|g[eê]nero|gender/i.test(question)){for(const key of ['answer','value','response','resposta','selected']){const found=normalizeSex(obj[key]);if(found)return found;}}for(const [key,value] of entries){if(/sexo|sex|g[eê]nero|gender/i.test(key)){const direct=normalizeSex(value);if(direct)return direct;if(value&&typeof value==='object'){const nested=findSex(value);if(nested)return nested;}}if(value&&typeof value==='object'){const nested=findSex(value);if(nested)return nested;}else if(typeof value==='string'&&/^(m|f|male|female|masculino|feminino|homem|mulher)$/i.test(value.trim())){const parentLabel=String(obj.question||obj.label||obj.title||obj.pergunta||'');if(/sexo|sex|g[eê]nero|gender/i.test(parentLabel))return normalizeSex(value);}}return '';};
   currentStudentSex=findSex(answers)||currentStudentSex;
  }catch{}
 }
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
 const actions=document.createElement('div');actions.className='student-profile-contact';
 const phone=document.createElement('span');phone.textContent=s.phone||'Telefone não informado';
 const goal=document.createElement('span');goal.textContent=s.goal||'Objetivo não informado';
 actions.append(phone,goal);
 const quick=document.createElement('div');quick.className='student-profile-quick-actions';
 const digits=String(s.phone||'').replace(/\\D/g,'');
 if(digits.length>=10){const wa=document.createElement('a');wa.className='student-quick-button is-whatsapp';wa.href='https://wa.me/'+(digits.startsWith('55')?digits:'55'+digits);wa.target='_blank';wa.rel='noopener noreferrer';wa.textContent='Conversar no WhatsApp';quick.append(wa);}
 const assessment=document.createElement('button');assessment.type='button';assessment.className='student-quick-button is-primary';assessment.textContent='＋ Registrar avaliação';assessment.addEventListener('click',()=>{document.querySelector('[data-student-tab="evolution"]')?.click();document.querySelector('#open-assessment')?.click();});quick.append(assessment);
 const workout=document.createElement('button');workout.type='button';workout.className='student-quick-button';workout.textContent='＋ Novo treino';workout.addEventListener('click',()=>{document.querySelector('[data-student-tab="workouts"]')?.click();$('#open-workout-builder')?.click();});quick.append(workout);
 hero.append(avatar,info,actions,quick);const settingsWrap=$('#student-settings-button')?.parentElement;if(settingsWrap){hero.append(settingsWrap);hero.style.position='relative';settingsWrap.style.position='absolute';settingsWrap.style.right='24px';settingsWrap.style.top='20px';settingsWrap.style.left='auto';settingsWrap.style.bottom='auto';}
 const measurements=data.measurements||[];
 const latest=measurements[0]||{};
 const weight=latest.weight_kg??s.weight_kg;
 const height=latest.height_cm??s.height_cm;
 const bmi=weight&&height?Number(weight)/(Number(height)/100)**2:null;
 const age=s.birth_date?(()=>{const birth=new Date(String(s.birth_date)+'T12:00:00');if(Number.isNaN(birth.getTime()))return null;const now=new Date();return now.getFullYear()-birth.getFullYear()-((now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate()))?1:0);})():null;
 const bmiClassification=bmi===null?'IMC indisponível':age!==null&&age<20?'Classificação por idade não adulta':bmi<18.5?'Abaixo do peso':bmi<25?'Peso adequado':bmi<30?'Sobrepeso':bmi<35?'Obesidade grau I':bmi<40?'Obesidade grau II':'Obesidade grau III';
 const lastCheckin=(data.checkins||[])[0]?.checkin_date||latest.measured_at;
 const previous=[...measurements].slice(1).find(m=>m.weight_kg!==null&&m.weight_kg!==undefined);
 const weightDelta=previous&&latest.weight_kg!=null?Number(latest.weight_kg)-Number(previous.weight_kg):null;
 const metricCards=[['Peso atual',weight?Number(weight).toLocaleString('pt-BR')+' kg':'—',weightDelta===null?'':(weightDelta>0?'+':'')+weightDelta.toFixed(1).replace('.',',')+' kg desde a avaliação anterior'],['Cintura',latest.waist_cm?Number(latest.waist_cm).toLocaleString('pt-BR')+' cm':'—','Última medida registrada'],['IMC',bmi?bmi.toFixed(1).replace('.',','):'—',bmiClassification+(age!==null&&age<20?' · usar curva por idade e sexo':' · referência para adultos')],['Último acompanhamento',lastCheckin?new Date(lastCheckin+'T12:00:00').toLocaleDateString('pt-BR'):'—','Data do registro mais recente'],['Nível R-Fit',(()=>{const xp=Number(data.gamification?.total_xp||0),levels=[{min:0,name:'Iniciante'},{min:300,name:'Em Evolução'},{min:800,name:'Determinado'},{min:1500,name:'Consistente'},{min:2500,name:'Disciplinado'},{min:4000,name:'Elite'},{min:6000,name:'Referência'},{min:8500,name:'Lenda R-Fit'}];return (levels.filter(level=>xp>=level.min).pop()||levels[0]).name})(),Number(data.gamification?.total_xp||0).toLocaleString('pt-BR')+' XP acumulados'],['Conquistas',String(data.gamification?.unlocked_count||0),'Medalhas desbloqueadas']];
 const metrics=$('#student-360-metrics');metrics.replaceChildren();
 metricCards.forEach(([label,value,hint])=>{const card=document.createElement('article');card.className='student-360-card';const l=document.createElement('span');l.textContent=label;const v=document.createElement('strong');v.textContent=value;card.append(l,v);if(hint){const small=document.createElement('small');small.textContent=hint;card.append(small);}metrics.append(card);});
 const evolution=$('#student-evolution');evolution.replaceChildren();
 const buildEvolutionChart=(title,key,unit,compact=false)=>{
  const valueOf=(m)=>key==='bmr_kcal'?(m.bmr_kcal??m.basal_kcal):m[key];
  const records=[...measurements].filter(m=>valueOf(m)!==null&&valueOf(m)!==undefined&&Number.isFinite(Number(valueOf(m)))).sort((a,b)=>new Date(a.measured_at)-new Date(b.measured_at));
  const card=document.createElement('article');card.className='rfit-evolution-chart'+(compact?' is-compact':'');
  const head=document.createElement('div');head.className='rfit-chart-heading';
  const heading=document.createElement('h3');heading.textContent=title;
  const count=document.createElement('span');count.textContent=records.length+' registro(s)';head.append(heading,count);card.append(head);
  if(records.length<2){const empty=document.createElement('p');empty.className='rfit-chart-empty';empty.textContent=records.length?'Registre mais uma avaliação para visualizar a evolução.':'Ainda não há avaliações suficientes para este gráfico.';card.append(empty);return card;}
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 640 260');svg.setAttribute('role','img');svg.setAttribute('aria-label',title+' por data');svg.classList.add('rfit-line-chart');
  const vals=records.map(m=>Number(valueOf(m))),min=Math.min(...vals),max=Math.max(...vals),padding=Math.max((max-min)*.18,unit==='kg'?1:unit==='cm'?2:50),low=min-padding,high=max+padding,range=high-low||1;
  const x=i=>76+i*(530/(records.length-1)),y=v=>208-((v-low)/range)*160;
  for(let i=0;i<5;i++){const yy=48+i*40,line=document.createElementNS(ns,'line');line.setAttribute('x1','70');line.setAttribute('x2','615');line.setAttribute('y1',yy);line.setAttribute('y2',yy);line.setAttribute('class','rfit-chart-grid');svg.append(line);const label=document.createElementNS(ns,'text');label.setAttribute('x','60');label.setAttribute('y',yy+4);label.setAttribute('text-anchor','end');label.setAttribute('class','rfit-chart-label');label.textContent=(high-i*range/4).toLocaleString('pt-BR',{maximumFractionDigits:1});svg.append(label);}
  const line=document.createElementNS(ns,'polyline');line.setAttribute('points',vals.map((v,i)=>x(i)+','+y(v)).join(' '));line.setAttribute('class','rfit-chart-line '+(key==='waist_cm'?'is-orange':(key==='bmr_kcal'||key==='basal_kcal')?'is-blue':''));svg.append(line);
  records.forEach((m,i)=>{const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',x(i));dot.setAttribute('cy',y(Number(valueOf(m))));dot.setAttribute('r','5');dot.setAttribute('class','rfit-chart-dot '+(key==='waist_cm'?'is-orange':key==='bmr_kcal'?'is-blue':''));svg.append(dot);const value=document.createElementNS(ns,'text');value.setAttribute('x',x(i));value.setAttribute('y',y(Number(m[key]))-12);value.setAttribute('text-anchor','middle');value.setAttribute('class','rfit-chart-value');value.textContent=Number(m[key]).toLocaleString('pt-BR',{maximumFractionDigits:1})+' '+unit;svg.append(value);const date=document.createElementNS(ns,'text');date.setAttribute('x',x(i));date.setAttribute('y','238');date.setAttribute('text-anchor','middle');date.setAttribute('class','rfit-chart-label');date.textContent=new Date(m.measured_at+'T12:00:00').toLocaleDateString('pt-BR',{month:'2-digit',year:'2-digit'});svg.append(date);});
  card.append(svg);return card;
 };
 const summaryCharts=document.createElement('div');summaryCharts.className='rfit-summary-charts';
 summaryCharts.append(buildEvolutionChart('Evolução do peso','weight_kg','kg',true),buildEvolutionChart('Evolução do abdômen','waist_cm','cm',true));
 evolution.append(summaryCharts);
 const fullCharts=$('#student-evolution-full');if(fullCharts){fullCharts.replaceChildren();const grid=document.createElement('div');grid.className='rfit-full-charts';grid.append(buildEvolutionChart('Peso corporal','weight_kg','kg'),buildEvolutionChart('Circunferência abdominal','waist_cm','cm'),buildEvolutionChart('Gasto calórico basal','basal_kcal','kcal'));fullCharts.append(grid);}
 const anamnesis=$('#student-anamnesis');anamnesis.replaceChildren();const an=data.anamnesis;
 if(an){
  const wrap=document.createElement('div');wrap.className='student-anamnesis-list';
  const labels={birth_date:'Data de nascimento',sex:'Sexo',height_cm:'Altura',weight_kg:'Peso informado',goal:'Objetivo',training_frequency:'Frequência de treino',experience_level:'Experiência',health_conditions:'Condições de saúde',restrictions:'Restrições',medications:'Medicamentos',injuries:'Lesões ou cirurgias',allergies:'Alergias'};
  const niceValue=(key,value)=>{
   if(value===null||value===undefined||value==='')return '';
   if(Array.isArray(value))return value.map(v=>String(v).replace(/[_-]/g,' ')).join(' · ');
   if(typeof value==='object')return Object.entries(value).map(([k,v])=>{const label=labels[k]||k.replace(/[_-]/g,' ');const val=Array.isArray(v)?v.join(', '):typeof v==='object'?Object.values(v).filter(Boolean).join(', '):String(v??'');return val?label+': '+val:''}).filter(Boolean).join(' · ');
   if(key==='birth_date'){const d=new Date(String(value)+'T12:00:00');return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString('pt-BR');}
   if(key==='height_cm')return String(value)+' cm';
   if(key==='weight_kg')return String(value)+' kg';
   if(key==='training_frequency')return String(value)+' vezes por semana';
   if(key==='sex'){const s=String(value).toLowerCase();return s==='m'?'Masculino':s==='f'?'Feminino':String(value);}
   return String(value).replace(/[_-]/g,' ');
  };
  try{
   const answers=JSON.parse(an.answers_json||'{}');
   const extraLabels={goal_options:'Objetivo',work_activities:'Atividades profissionais',work_other:'Outras atividades',surgeries_other:'Outras cirurgias',diagnoses_other:'Outros diagnósticos',medication_status:'Uso de medicamentos',symptoms_other:'Outros sintomas',exercise_sensations_other:'Outras sensações no exercício',physical_activity:'Atividade física atual',trained_before:'Experiência anterior',training_location:'Local de treino',home_equipment_status:'Equipamentos em casa',home_equipment_detail:'Equipamentos disponíveis',training_duration:'Duração do treino',training_duration_other:'Outra duração',meals_per_day:'Refeições por dia',water_liters:'Consumo de água',alcohol_frequency:'Consumo de álcool',diet_supplement:'Uso de suplementos',food_restriction_status:'Restrições alimentares',food_restriction_detail:'Detalhes das restrições',planned_supplements:'Suplementos planejados',planned_supplements_other:'Outros suplementos',additional_notes:'Observações adicionais',form_answers:'Respostas do formulário'};
   const entries=[];
   const flatten=(obj)=>{if(!obj||typeof obj!=='object')return;Object.entries(obj).forEach(([key,value])=>{if(value===null||value===undefined||value==='')return;if(value&&typeof value==='object'&&!Array.isArray(value)){flatten(value);return;}if(key==='form_answers')return;entries.push([key,value]);});};
   flatten(answers);
   const seen=new Set();
   entries.forEach(([key,value])=>{
    const labelText=labels[key]||extraLabels[key]||key.replace(/[_-]/g,' ').replace(/\\b\\w/g,ch=>ch.toUpperCase());
    const formatted=niceValue(key,value);if(!formatted||seen.has(labelText))return;seen.add(labelText);
    const item=document.createElement('div');item.className='student-anamnesis-item';if(/saúde|restriç|medic|alerg|sintoma|cirurg|diagnóst|observ|suplement/i.test(labelText))item.classList.add('anamnesis-wide');
    const label=document.createElement('span');label.textContent=labelText;
    const content=document.createElement('strong');content.textContent=formatted;item.append(label,content);wrap.append(item);
   });
  }catch{}
  const meta=document.createElement('div');meta.className='student-anamnesis-item';const metaLabel=document.createElement('span');metaLabel.textContent='Registro';const metaValue=document.createElement('strong');metaValue.textContent='Anamnese v'+an.version+' · '+new Date(an.completed_at).toLocaleDateString('pt-BR');meta.append(metaLabel,metaValue);wrap.prepend(meta);
  const groups=[['Dados pessoais',/nascimento|sexo|altura|peso informado|objetivo|registro/i],['Saúde e histórico clínico',/saúde|cirurgia|diagnóstico|sintoma|lesão/i],['Medicamentos e suplementos',/medicamento|suplement/i],['Alergias e restrições',/alergia|restriç/i],['Experiência e atividade física',/experiência|treino|atividade|duração|equipamento|local de treino/i],['Hábitos alimentares',/refeiç|água|álcool|aliment/i],['Observações adicionais',/observaç/i]];
  const categorized=document.createElement('div');categorized.className='student-anamnesis-groups';
  const available=Array.from(wrap.children).filter(item=>item!==meta);
  const assigned=new Set();
  groups.forEach(([title,pattern])=>{const items=available.filter(item=>{const label=item.querySelector('span')?.textContent||'';return !assigned.has(item)&&pattern.test(label);});if(!items.length)return;const details=document.createElement('details');details.className='student-anamnesis-group';const summary=document.createElement('summary');summary.textContent=title;const content=document.createElement('div');content.className='student-anamnesis-group-content';items.forEach(item=>{assigned.add(item);content.append(item);});details.append(summary,content);categorized.append(details);});
  const remaining=available.filter(item=>!assigned.has(item));
  if(remaining.length){const details=document.createElement('details');details.className='student-anamnesis-group';details.open=true;const summary=document.createElement('summary');summary.textContent='Outras informações';const content=document.createElement('div');content.className='student-anamnesis-group-content';remaining.forEach(item=>content.append(item));details.append(summary,content);categorized.append(details);}
  anamnesis.append(meta,categorized);
 }else anamnesis.textContent='Anamnese ainda não preenchida.';
 const notes=$('#student-journey-notes');notes.replaceChildren();(data.journey_notes||[]).forEach(item=>{const row=document.createElement('div');row.className='student-journey-note';const when=document.createElement('small');when.textContent=new Date(item.created_at).toLocaleString('pt-BR');const body=document.createElement('div');body.textContent=item.note;row.append(when,body);notes.append(row);});if(!(data.journey_notes||[]).length)notes.textContent='Nenhuma observação registrada.';
 const workoutBox=$('#student-workouts');workoutBox.replaceChildren();
 (data.workouts||[]).forEach(w=>workoutBox.append(makeListItem(w.title,(w.goal||'Sem objetivo')+' · '+w.weekly_frequency+'x por semana',w.status)));
 if(!(data.workouts||[]).length)workoutBox.textContent='Nenhum treino cadastrado.';
 const dietBox=$('#student-diets');dietBox.replaceChildren();
 (data.diets||[]).forEach(d=>dietBox.append(makeListItem(d.title,(d.goal||'Sem objetivo')+(d.calories_target?' · '+d.calories_target+' kcal':''),d.status)));
 if(!(data.diets||[]).length)dietBox.textContent='Nenhuma dieta cadastrada.';
 const measureBox=$('#student-measurements');measureBox.replaceChildren();
 (data.measurements||[]).forEach(m=>{const detail=[m.weight_kg?m.weight_kg+' kg':null,m.waist_cm?'Abdômen '+m.waist_cm+' cm':null,m.body_fat_pct?'Gordura '+m.body_fat_pct+'%':null,m.basal_kcal?'Basal '+m.basal_kcal+' kcal':null,m.notes||null].filter(Boolean).join(' · ')||'Medidas registradas';measureBox.append(makeListItem(new Date(m.measured_at+'T12:00:00').toLocaleDateString('pt-BR'),detail,''));});
 
 if(!(data.measurements||[]).length)measureBox.textContent='Nenhuma avaliação registrada.';
 const attention=$('#student-attention');if(attention){attention.replaceChildren();const care=[['Objetivo',s.goal],['Condições de saúde',s.health_conditions],['Alergias',s.allergies],['Restrições',s.restrictions],['Medicamentos',s.medications]].filter(([,value])=>value);if(care.length){care.forEach(([label,value])=>{const item=document.createElement('div');item.className='student-attention-item';const title=document.createElement('strong');title.textContent=label;const detail=document.createElement('span');detail.textContent=value;item.append(title,detail);attention.append(item);});}else attention.textContent='Nenhum ponto de atenção específico registrado.';}
 const followup=$('#student-followup-status');if(followup){followup.replaceChildren();const latestDate=latest.measured_at?new Date(latest.measured_at+'T12:00:00'):null;const days=latestDate&&!Number.isNaN(latestDate.getTime())?Math.floor((Date.now()-latestDate.getTime())/86400000):null;const status=!latestDate?'Avaliação pendente':days>30?'Acompanhamento atrasado': 'Acompanhamento em dia';const detail=!latestDate?'Registre a primeira avaliação física.':days>30?'Última avaliação há '+days+' dias. Recomenda-se agendar uma reavaliação.':'Última avaliação há '+Math.max(0,days)+' dia(s).';const pill=document.createElement('span');pill.className='student-followup-pill '+(!latestDate||days>30?'is-warning':'is-ok');pill.textContent=status;const text=document.createElement('p');text.textContent=detail;const access=document.createElement('small');access.textContent='Acesso: '+(s.status==='active'?'ativo':s.status==='suspended'?'suspenso':'pendente')+' · Assinatura: '+(sub?.status||'não informada');followup.append(pill,text,access);}
 const activity=$('#student-recent-activity');if(activity){activity.replaceChildren();const events=[];(data.measurements||[]).forEach(m=>events.push({date:m.measured_at,title:'Avaliação registrada',detail:[m.weight_kg?m.weight_kg+' kg':null,m.waist_cm?m.waist_cm+' cm':null].filter(Boolean).join(' · ')}));(data.checkins||[]).forEach(item=>{const details=[];if(item.water_liters!==null&&item.water_liters!==undefined)details.push('Água: '+Number(item.water_liters).toLocaleString('pt-BR')+' L');if(item.weight_kg)details.push('Peso: '+Number(item.weight_kg).toLocaleString('pt-BR')+' kg');if(item.energy)details.push('Energia: '+item.energy+'/5');if(item.sleep_quality)details.push('Sono: '+item.sleep_quality+'/5');events.push({date:item.checkin_date||item.created_at,title:'Check-in recebido',detail:details.join(' · ')||'Acompanhamento registrado'});});(data.journey_notes||[]).forEach(item=>events.push({date:item.created_at,title:'Observação do professor',detail:item.note}));events.filter(item=>item.date).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6).forEach(event=>{const row=document.createElement('div');row.className='student-journey-note';const date=document.createElement('small');const parsed=new Date(event.date);date.textContent=Number.isNaN(parsed.getTime())?'':parsed.toLocaleDateString('pt-BR');const title=document.createElement('strong');title.textContent=event.title;const detail=document.createElement('div');detail.textContent=event.detail;row.append(date,title,detail);activity.append(row);});if(!activity.children.length)activity.textContent='As atividades recentes aparecerão aqui conforme novos registros forem realizados.';}
 const finance=$('#student-finance-summary');if(finance){finance.replaceChildren();const sub=data.subscription||{};const facts=[['Situação',sub.status||'Não informada'],['Vencimento',sub.expires_at?new Date(sub.expires_at+'T12:00:00').toLocaleDateString('pt-BR'):'Não informado'],['Valor',sub.price_cents!=null?money(sub.price_cents):'Não informado']];const grid=document.createElement('div');grid.className='student-finance-facts';facts.forEach(([label,value])=>{const card=document.createElement('div');card.className='student-finance-fact';const l=document.createElement('span');l.textContent=label;const v=document.createElement('strong');v.textContent=value;card.append(l,v);card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click();}};grid.append(card);});finance.append(grid);}

}

/* ===== EDITOR VISUAL DE TREINO COM GIFS ===== */
let workoutDays=[];
let selectedWorkoutDay=0;
let exerciseCatalog=[];
let exerciseCatalogLoaded=false;
let exerciseFavorites=new Set(JSON.parse(localStorage.getItem('rfit-exercise-favorites')||'[]'));
let showExerciseFavorites=false;
let draggedWorkoutExercise=null;
const EXERCISE_BASE='https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0';
const workoutModal=$('#workout-builder-modal');
const workoutForm=$('#workout-form');
const closeWorkoutBuilder=()=>{workoutModal?.classList.remove('is-open');workoutModal?.setAttribute('aria-hidden','true');};
const EXERCISE_PT={"Barbell Bench Press":"Supino reto com barra","Bench Press":"Supino reto","Incline Bench Press":"Supino inclinado","Decline Bench Press":"Supino declinado","Lat Pulldown":"Puxada frontal","Pull Up":"Barra fixa","Pull-Up":"Barra fixa","Romanian Deadlift":"Levantamento terra romeno","Deadlift":"Levantamento terra","Hip Thrust":"Elevação pélvica","Squat":"Agachamento","Leg Press":"Leg press","Leg Extension":"Cadeira extensora","Leg Curl":"Mesa flexora","Biceps Curl":"Rosca de bíceps","Barbell Curl":"Rosca direta","Dumbbell Curl":"Rosca com halteres","Triceps Pushdown":"Tríceps na polia","Lateral Raise":"Elevação lateral","Shoulder Press":"Desenvolvimento de ombros","Plank":"Prancha","Crunch":"Abdominal"};
function exercisePt(name){
 let n=String(name||'').trim();if(EXERCISE_PT[n])return EXERCISE_PT[n];
 const rules=[
 [/\bpress de banca\b/gi,'supino'],[/\bpress\b/gi,'press'],[/\bcon barra\b/gi,'com barra'],[/\bcon agarre invertido\b/gi,'com pegada invertida'],[/\bagarre invertido\b/gi,'pegada invertida'],[/\ben banco\b/gi,'no banco'],[/\bbanco inclinado\b/gi,'banco inclinado'],[/\bancho\b/gi,'aberto'],[/\bestiramiento\b/gi,'alongamento'],[/\btras la nuca\b/gi,'atrás da nuca'],[/\bpecho\b/gi,'peitoral'],[/\bespalda\b/gi,'costas'],[/\bpiernas?\b/gi,'pernas'],[/\bgluteos?\b/gi,'glúteos'],[/\bbiceps\b/gi,'bíceps'],[/\btriceps\b/gi,'tríceps'],[/\babdominales?\b/gi,'abdominal'],[/\bremo\b/gi,'remada'],[/\baperturas?\b/gi,'crucifixo'],[/\belevaciones?\b/gi,'elevação'],[/\bcurl\b/gi,'rosca'],[/\bextensiones?\b/gi,'extensão'],[/\bflexiones?\b/gi,'flexão'],[/\bjalon\b/gi,'puxada'],[/\bdominadas?\b/gi,'barra fixa'],[/\bsentado\b/gi,'sentado'],[/\bacostado\b/gi,'deitado'],[/\bde pie\b/gi,'em pé'],[/\bcon mancuernas\b/gi,'com halteres'],[/\bmancuernas?\b/gi,'halteres'],[/\bmaquina\b/gi,'máquina'],[/\bpolea\b/gi,'polia'],[/\bcon\b/gi,'com'],[/\by\b/gi,'e'],[/\bdel\b/gi,'do'],[/\bpara\b/gi,'para']
 ];
 rules.forEach(([rx,to])=>n=n.replace(rx,to));
 n=n.replace(/\s+/g,' ').trim();return n.charAt(0).toUpperCase()+n.slice(1);
}
function ensureWorkoutDay(index=workoutDays.length){
 if(!workoutDays[index])workoutDays[index]={title:'Treino '+String.fromCharCode(65+index),exercises:[]};
 return workoutDays[index];
}
function renderWorkoutDays(){
 const nav=$('#workout-day-tabs'),list=$('#workout-selected-list');nav.replaceChildren();list.replaceChildren();
 workoutDays.forEach((day,i)=>{const b=document.createElement('button');b.type='button';b.className='workout-day-tab'+(i===selectedWorkoutDay?' is-active':'');b.textContent=String.fromCharCode(65+i);b.title=day.title;b.addEventListener('click',()=>{selectedWorkoutDay=i;renderWorkoutDays();});nav.append(b);});
 const day=ensureWorkoutDay(selectedWorkoutDay);
 const title=$('#workout-day-title');title.value=day.title;title.oninput=()=>day.title=title.value;
 day.exercises.forEach((ex,i)=>{
  const row=document.createElement('article');row.className='workout-selected-card';row.draggable=true;row.title='Arraste para reorganizar este exercício';
  row.addEventListener('dragstart',e=>{draggedWorkoutExercise=i;row.classList.add('is-dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(i));});
  row.addEventListener('dragend',()=>{draggedWorkoutExercise=null;row.classList.remove('is-dragging');list.querySelectorAll('.is-drop-target').forEach(el=>el.classList.remove('is-drop-target'));});
  row.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';row.classList.add('is-drop-target');});
  row.addEventListener('dragleave',e=>{if(!row.contains(e.relatedTarget))row.classList.remove('is-drop-target');});
  row.addEventListener('drop',e=>{e.preventDefault();row.classList.remove('is-drop-target');const from=draggedWorkoutExercise??Number(e.dataTransfer.getData('text/plain'));const to=i;if(!Number.isInteger(from)||from<0||from>=day.exercises.length||from===to)return;const moved=day.exercises.splice(from,1)[0];day.exercises.splice(to,0,moved);renderWorkoutDays();});
  const img=document.createElement('img');img.src=ex.gifUrl||'';img.alt=ex.name;img.loading='lazy';
  const info=document.createElement('div');info.className='workout-selected-info';
  const name=document.createElement('input');name.type='text';name.className='workout-exercise-custom-name';name.setAttribute('aria-label','Nome personalizado do exercício');name.value=ex.displayName||exercisePt(ex.name);name.oninput=()=>ex.displayName=name.value;name.style.cssText='width:100%;font-weight:700;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;margin-bottom:6px';
  const meta=document.createElement('small');meta.textContent=(ex.muscle||'Exercício')+' · '+(ex.equipment||'');
  const fields=document.createElement('div');fields.className='workout-prescription-fields';
  [['sets','Séries',1,20],['reps','Reps',1,100],['load','Carga (kg)',0,1000],['rest','Descanso (s)',0,600]].forEach(([key,label,min,max])=>{const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.placeholder=label;input.setAttribute('aria-label',label);input.value=ex[key]??(key==='sets'?3:key==='reps'?12:key==='rest'?60:'');input.onchange=()=>ex[key]=input.value;fields.append(input);});
  info.append(name,meta,fields);
  const actions=document.createElement('div');actions.className='workout-exercise-actions';
  const duplicate=document.createElement('button');duplicate.type='button';duplicate.textContent='⧉ Duplicar';duplicate.title='Duplicar exercício neste dia';duplicate.onclick=()=>{day.exercises.splice(i+1,0,JSON.parse(JSON.stringify(ex)));renderWorkoutDays();};
  const copy=document.createElement('button');copy.type='button';copy.textContent='⇢ Copiar para dia';copy.title='Copiar exercício para outro treino';copy.onclick=()=>{if(workoutDays.length<2){alert('Crie outro dia de treino primeiro.');return;}const choices=workoutDays.map((d,k)=>k===selectedWorkoutDay?null:(String.fromCharCode(65+k)+' — '+d.title)).filter(Boolean);const choice=prompt('Copiar para qual dia?\\n'+choices.join('\\n')+'\\nDigite a letra do treino:');if(!choice)return;const target=workoutDays.findIndex((d,k)=>k!==selectedWorkoutDay&&String.fromCharCode(65+k).toLowerCase()===choice.trim().toLowerCase());if(target<0){alert('Dia não encontrado.');return;}workoutDays[target].exercises.push(JSON.parse(JSON.stringify(ex)));alert('Exercício copiado para '+workoutDays[target].title+'!');};
  actions.append(duplicate,copy);info.append(actions);
  const remove=document.createElement('button');remove.type='button';remove.className='workout-remove-exercise';remove.textContent='×';remove.title='Remover exercício';remove.onclick=()=>{day.exercises.splice(i,1);renderWorkoutDays();};row.append(img,info,remove);list.append(row);
 });
 if(!day.exercises.length){const empty=document.createElement('p');empty.className='workout-library-empty';empty.textContent='Escolha exercícios na biblioteca para montar este dia.';list.append(empty);}
}
async function loadExerciseCatalog(){
 if(exerciseCatalogLoaded)return;
 const status=$('#exercise-library-status');status.textContent='Carregando biblioteca de exercícios…';
 try{const response=await fetch(EXERCISE_BASE+'/api/es/exercises.json',{cache:'force-cache'});if(!response.ok)throw new Error('Biblioteca indisponível');const data=await response.json();exerciseCatalog=data.exercises||data;exerciseCatalog=Array.isArray(exerciseCatalog)?exerciseCatalog:[];exerciseCatalogLoaded=true;status.textContent=exerciseCatalog.length+' exercícios disponíveis';renderExerciseLibrary();}
 catch(e){status.textContent='Não foi possível carregar a biblioteca. Tente novamente.';console.error(e);}
}
function renderExerciseLibrary(){
 const grid=$('#exercise-library-grid'),search=$('#exercise-library-search').value.trim().toLowerCase(),muscle=$('#exercise-library-muscle').value,equipment=$('#exercise-library-equipment')?.value||'';
 grid.replaceChildren();
 const filtered=exerciseCatalog.filter(ex=>(!showExerciseFavorites||exerciseFavorites.has(ex.slug||ex.name))&&(!muscle||ex.muscle===muscle)&&(!equipment||String(ex.equipment||'').toLowerCase().includes(equipment))&&(!search||String(ex.name+' '+ex.slug+' '+ex.muscle+' '+ex.equipment).toLowerCase().includes(search))).slice(0,120);
 filtered.forEach(ex=>{const card=document.createElement('div');card.className='exercise-library-card';card.setAttribute('role','button');card.tabIndex=0;card.title='Adicionar '+ex.name;const favKey=ex.slug||ex.name;if(exerciseFavorites.has(favKey))card.classList.add('is-favorite');
 const img=document.createElement('img');img.src=ex.gifUrl||EXERCISE_BASE+'/'+ex.file;img.alt=ex.name;img.loading='lazy';
 const name=document.createElement('strong');name.textContent=exercisePt(ex.name);const tag=document.createElement('small');tag.textContent=(ex.muscle||'')+' · '+(ex.equipment||'');
 const star=document.createElement('button');star.type='button';star.className='exercise-favorite-mark';star.textContent=exerciseFavorites.has(favKey)?'⭐':'☆';star.title=exerciseFavorites.has(favKey)?'Remover dos favoritos':'Favoritar exercício';star.onclick=e=>{e.stopPropagation();if(exerciseFavorites.has(favKey))exerciseFavorites.delete(favKey);else exerciseFavorites.add(favKey);localStorage.setItem('rfit-exercise-favorites',JSON.stringify([...exerciseFavorites]));renderExerciseLibrary();updateExerciseFavoriteCount();};card.append(img,name,tag,star);card.onclick=e=>{if(e.target.closest('.exercise-favorite-mark'))return;const day=ensureWorkoutDay(selectedWorkoutDay);day.exercises.push({name:ex.name,displayName:exercisePt(ex.name),gifUrl:ex.gifUrl||EXERCISE_BASE+'/'+ex.file,muscle:ex.muscle,equipment:ex.equipment,slug:ex.slug,sets:3,reps:12,load:'',rest:60});renderWorkoutDays();};grid.append(card);});
 if(!filtered.length){const empty=document.createElement('p');empty.className='workout-library-empty';empty.textContent='Nenhum exercício encontrado com esses filtros.';grid.append(empty);}
}
function updateExerciseFavoriteCount(){const count=$('#exercise-favorites-count');if(count)count.textContent=exerciseFavorites.size;}
const WORKOUT_TEMPLATE_KEY='rfit-workout-templates';
function readWorkoutTemplates(){try{return JSON.parse(localStorage.getItem(WORKOUT_TEMPLATE_KEY)||'[]');}catch{return [];}}
$('#save-workout-template')?.addEventListener('click',()=>{if(!workoutDays.some(d=>d.exercises.length)){alert('Adicione exercícios antes de salvar um modelo.');return;}const name=prompt('Nome do modelo de treino:',workoutDays[0]?.title||'Treino modelo');if(!name?.trim())return;const templates=readWorkoutTemplates();templates.push({id:Date.now(),name:name.trim(),days:JSON.parse(JSON.stringify(workoutDays)),createdAt:new Date().toISOString()});localStorage.setItem(WORKOUT_TEMPLATE_KEY,JSON.stringify(templates));alert('Modelo "'+name.trim()+'" salvo neste navegador!');});
$('#load-workout-template')?.addEventListener('click',()=>{const templates=readWorkoutTemplates();if(!templates.length){alert('Nenhum modelo salvo neste navegador.');return;}const choice=prompt('Modelos salvos:\\n'+templates.map((t,i)=>(i+1)+'. '+t.name).join('\\n')+'\\nDigite o número do modelo:');if(!choice)return;const selected=templates[Number(choice)-1];if(!selected){alert('Modelo não encontrado.');return;}if(!confirm('Substituir o treino atual pelo modelo "'+selected.name+'"?'))return;workoutDays=JSON.parse(JSON.stringify(selected.days));selectedWorkoutDay=0;renderWorkoutDays();alert('Modelo carregado! Revise e salve o treino do aluno.');});
$('#toggle-exercise-favorites')?.addEventListener('click',()=>{showExerciseFavorites=!showExerciseFavorites;$('#toggle-exercise-favorites').classList.toggle('is-active',showExerciseFavorites);renderExerciseLibrary();});
function openWorkoutBuilder(){
 workoutDays=[{title:'Treino A',exercises:[]}];selectedWorkoutDay=0;showExerciseFavorites=false;updateExerciseFavoriteCount();renderWorkoutDays();workoutModal.classList.add('is-open');workoutModal.setAttribute('aria-hidden','false');loadExerciseCatalog();
}
$('#open-workout-builder')?.addEventListener('click',openWorkoutBuilder);
$('#duplicate-workout-day-modal')?.addEventListener('click',()=>{if(workoutDays.length>=7)return;const source=ensureWorkoutDay(selectedWorkoutDay);const copy=JSON.parse(JSON.stringify(source));copy.title=source.title+' (cópia)';workoutDays.splice(selectedWorkoutDay+1,0,copy);selectedWorkoutDay++;renderWorkoutDays();});
$('#add-workout-day-modal')?.addEventListener('click',()=>{if(workoutDays.length>=7)return;workoutDays.push({title:'Treino '+String.fromCharCode(65+workoutDays.length),exercises:[]});selectedWorkoutDay=workoutDays.length-1;renderWorkoutDays();});
$('#exercise-library-search')?.addEventListener('input',renderExerciseLibrary);
$('#exercise-library-muscle')?.addEventListener('change',renderExerciseLibrary);$('#exercise-library-equipment')?.addEventListener('change',renderExerciseLibrary);
workoutModal?.querySelectorAll('[data-close-workout]').forEach(el=>el.addEventListener('click',closeWorkoutBuilder));
/* ===== EDITOR DE DIETA ===== */
function addDietMeal(){
 const meal=document.createElement('fieldset');meal.className='diet-meal-editor';const title=document.createElement('input');title.placeholder='Nome da refeição (ex.: Café da manhã)';title.maxLength=100;title.dataset.field='name';
 const items=document.createElement('textarea');items.rows=3;items.placeholder='Um alimento por linha';items.dataset.field='items';
 meal.append(title,items);$('#diet-meals').append(meal);
}
function collectDietMeals(){return Array.from(document.querySelectorAll('.diet-meal-editor')).map(meal=>({name:meal.querySelector('[data-field=name]').value,items:meal.querySelector('[data-field=items]').value.split('\n').map(v=>v.trim()).filter(Boolean)})).filter(m=>m.name.trim());}

/* Navegação por abas da ficha 360 */
document.querySelectorAll('[data-student-tab]').forEach(button=>button.addEventListener('click',()=>{const target=button.dataset.studentTab;document.querySelectorAll('[data-student-tab]').forEach(tab=>{const active=tab===button;tab.classList.toggle('is-active',active);tab.setAttribute('aria-selected',String(active));});document.querySelectorAll('[data-student-panel]').forEach(panel=>{const active=panel.dataset.studentPanel===target;panel.classList.toggle('is-active',active);panel.hidden=!active;});}));
document.querySelectorAll('[data-go-tab]').forEach(button=>button.addEventListener('click',()=>document.querySelector('[data-student-tab="'+button.dataset.goTab+'"]')?.click()));
/* ===== INICIALIZAÇÃO E SALVAMENTO ===== */
document.addEventListener('DOMContentLoaded',async()=>{
 try{const auth=await getCurrentUser();if(!['professor','admin'].includes(auth.user.role)){location.replace('/student/dashboard.html');return;}$('#professor-welcome').textContent='Olá, '+(auth.user.name||auth.user.email)+'.';}
 catch{location.replace('/student/pages/login.html');return;}
 if(!studentId){message('Identificador do aluno não informado.');return;}
 try{render(await api('/api/professor/students/'+encodeURIComponent(studentId)));}catch(error){message('Não foi possível carregar o aluno: '+error.message);}

 /* ===== AVALIAÇÃO FÍSICA AVANÇADA PREMIUM ===== */
 const advancedUrl='/api/professor/students/'+encodeURIComponent(studentId)+'/advanced-assessments';
 const advancedModal=$('#advanced-assessment-modal'),advancedForm=$('#advanced-assessment-form'),advancedHistory=$('#advanced-assessment-history');
 const closeAdvanced=()=>{advancedModal?.classList.remove('is-open');advancedModal?.setAttribute('aria-hidden','true');};
 function renderAdvanced(rows){
   advancedHistory.replaceChildren();
   if(!rows.length){advancedHistory.textContent='Nenhuma avaliação avançada registrada ainda.';return;}
   const latest=rows[0],grid=document.createElement('div');grid.className='advanced-history-grid';
   const fmt=(value,digits=1,suffix='')=>value==null?'—':Number(value).toFixed(digits).replace('.',',')+suffix;
   const cards=[['Gordura corporal',fmt(latest.body_fat_pct,1,'%')],['Massa magra',fmt(latest.lean_mass_kg,1,' kg')],['IMC',fmt(latest.bmi,1)],['Massa de gordura',fmt(latest.fat_mass_kg,1,' kg')],['Cintura/estatura',fmt(latest.waist_height_ratio,2)],['Densidade corporal',fmt(latest.body_density,4)]];
   cards.forEach(([label,value])=>{const card=document.createElement('div');card.className='advanced-result';const strong=document.createElement('strong');strong.textContent=value;const span=document.createElement('span');span.textContent=label;card.append(strong,span);grid.append(card);});advancedHistory.append(grid);
   const visual=document.createElement('div');visual.className='advanced-visual-grid';
   const body=document.createElement('section');body.className='advanced-body-visual';body.innerHTML='<h3>Mapa corporal</h3><div class="advanced-figures"><div class="advanced-figure"><svg viewBox="0 0 80 170" aria-label="Silhueta corporal frontal"><circle cx="40" cy="13" r="10" fill="#e8aeb8"/><path d="M29 28 Q40 23 51 28 L57 70 L50 77 L54 112 L49 163 L39 163 L36 112 L33 163 L23 163 L27 112 L30 77 L23 70Z" fill="#f2cbd1" stroke="#c96b7d" stroke-width="1.5"/><path d="M25 34 L10 83 M55 34 L70 83" stroke="#c96b7d" stroke-width="8" stroke-linecap="round"/></svg>Frente</div><div class="advanced-figure"><svg viewBox="0 0 80 170" aria-label="Silhueta corporal posterior"><circle cx="40" cy="13" r="10" fill="#e8aeb8"/><path d="M29 28 Q40 23 51 28 L57 70 L50 77 L54 112 L49 163 L39 163 L36 112 L33 163 L23 163 L27 112 L30 77 L23 70Z" fill="#e8d9ef" stroke="#9875ad" stroke-width="1.5"/><path d="M25 34 L10 83 M55 34 L70 83" stroke="#9875ad" stroke-width="8" stroke-linecap="round"/></svg>Costas</div></div><p class="advanced-chart-caption">Referência visual para organizar as medidas corporais.</p>';
   const chart=document.createElement('section');chart.className='advanced-chart-card';const heading=document.createElement('h3');heading.textContent='Evolução da composição corporal';chart.append(heading);
   const metric=rows.filter(r=>r.body_fat_pct!=null).length>=2?'body_fat_pct':'weight_kg';const points=rows.slice().reverse().filter(r=>r[metric]!=null);
   if(points.length>=2){const w=620,h=190,pad=28,vals=points.map(r=>Number(r[metric])),min=Math.min(...vals),max=Math.max(...vals),range=max-min||1;const coords=vals.map((v,i)=>[pad+i*(w-2*pad)/(vals.length-1),h-pad-(v-min)/range*(h-2*pad)]);const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 '+w+' '+h);const line=document.createElementNS(svg.namespaceURI,'polyline');line.setAttribute('points',coords.map(p=>p.join(',')).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','#d93652');line.setAttribute('stroke-width','4');line.setAttribute('stroke-linecap','round');line.setAttribute('stroke-linejoin','round');svg.append(line);coords.forEach((p,i)=>{const c=document.createElementNS(svg.namespaceURI,'circle');c.setAttribute('cx',p[0]);c.setAttribute('cy',p[1]);c.setAttribute('r','5');c.setAttribute('fill','#d93652');svg.append(c);});chart.append(svg);const caption=document.createElement('p');caption.className='advanced-chart-caption';caption.textContent='Linha: '+(metric==='body_fat_pct'?'percentual de gordura corporal':'peso corporal')+'. '+points.length+' registros.';chart.append(caption);}else{const empty=document.createElement('div');empty.className='advanced-chart-empty';empty.textContent='O gráfico de evolução aparecerá quando houver pelo menos duas avaliações com dados comparáveis.';chart.append(empty);}
   visual.append(body,chart);advancedHistory.append(visual);
   const history=document.createElement('div');history.className='advanced-assessment-history-list';const label=document.createElement('h3');label.textContent='Histórico de avaliações';history.append(label);
   rows.forEach(row=>{const item=document.createElement('div');item.className='advanced-assessment-row';const date=document.createElement('strong');date.textContent=new Date(row.measured_at+'T12:00:00').toLocaleDateString('pt-BR');const detail=document.createElement('div');detail.textContent=['Peso '+(row.weight_kg??'—')+' kg','Cintura '+(row.waist_cm??'—')+' cm',row.body_fat_pct!=null?'Gordura '+Number(row.body_fat_pct).toFixed(1)+'%':'Dobras não calculadas'].join(' · ');item.append(date,detail);history.append(item);});advancedHistory.append(history);
 }
 async function loadAdvanced(){const panel=$('#advanced-assessment-panel');panel.hidden=false;$('#advanced-premium-lock').hidden=true;$('#advanced-premium-content').hidden=false;advancedHistory.hidden=false;$('#open-advanced-assessment').hidden=false;try{const d=await api(advancedUrl);renderAdvanced(d.assessments||[]);}catch(e){advancedHistory.textContent='Não foi possível carregar as avaliações avançadas: '+e.message;}}
 $('#open-advanced-assessment')?.addEventListener('click',()=>{const now=new Date();advancedForm.elements.measured_at.value=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');advancedModal.classList.add('is-open');advancedModal.setAttribute('aria-hidden','false');});
 advancedModal?.querySelectorAll('[data-close-advanced]').forEach(el=>el.addEventListener('click',closeAdvanced));
 $('#print-advanced-report')?.addEventListener('click',()=>window.print());
 advancedForm?.addEventListener('submit',async event=>{event.preventDefault();const button=advancedForm.querySelector('[type=submit]');button.disabled=true;try{const fd=new FormData(advancedForm),payload={measured_at:fd.get('measured_at'),sex:(['m','male','masculino'].includes(currentStudentSex)?'m':['f','female','feminino'].includes(currentStudentSex)?'f':String(fd.get('skinfold_sex')||'')),skinfold_protocol:'',notes:fd.get('notes')};['weight_kg','height_cm','neck_cm','shoulder_cm','chest_cm','waist_cm','abdomen_cm','hip_cm','right_arm_cm','left_arm_cm','right_forearm_cm','left_forearm_cm','right_thigh_cm','left_thigh_cm','right_calf_cm','left_calf_cm'].forEach(k=>payload[k]=fd.get(k));const skin={};['pectoral','midaxillary','triceps','subscapular','abdominal','suprailiac','thigh'].forEach(k=>{const v=fd.get('skinfold_'+k);if(v)skin[k]=v;});if(Object.keys(skin).length){if(Object.keys(skin).length!==7)throw new Error('Para calcular Pollock 7, preencha as sete dobras.');if(!['m','f'].includes(payload.sex))throw new Error('Selecione o sexo para o cálculo Pollock 7.');payload.skinfold_protocol='pollock7';payload.skinfolds=skin;}else payload.skinfold_protocol='';await api(advancedUrl,{method:'POST',body:JSON.stringify(payload)});advancedForm.reset();closeAdvanced();await loadAdvanced();message('Avaliação física avançada salva.','success');}catch(e){message('Não foi possível salvar: '+e.message,'error');}finally{button.disabled=false;}});
 loadAdvanced();

 const modal=$('#assessment-modal'),assessmentForm=$('#assessment-form');
 const closeAssessment=()=>{modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');};
 $('#open-assessment')?.addEventListener('click',()=>{const now=new Date();assessmentForm.elements.measured_at.value=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');assessmentForm.elements.weight_kg.focus();});
 modal.querySelectorAll('[data-close-assessment]').forEach(el=>el.addEventListener('click',closeAssessment));
 document.addEventListener('keydown',event=>{if(event.key==='Escape')closeAssessment();});
 assessmentForm?.addEventListener('submit',async event=>{event.preventDefault();const button=assessmentForm.querySelector('[type=submit]');button.disabled=true;try{const fd=new FormData(assessmentForm);await api('/api/professor/students/'+encodeURIComponent(studentId)+'/measurements',{method:'POST',body:JSON.stringify({measured_at:fd.get('measured_at'),weight_kg:fd.get('weight_kg'),waist_cm:fd.get('waist_cm'),bmr_kcal:fd.get('bmr_kcal'),notes:fd.get('notes')})});assessmentForm.reset();closeAssessment();render(await api('/api/professor/students/'+encodeURIComponent(studentId)));message('Avaliação registrada com sucesso.','success');}catch(error){message('Não foi possível salvar a avaliação: '+error.message+(error.stage?' · Etapa: '+error.stage:''),'error');}finally{button.disabled=false;}});
 $('#journey-note-form')?.addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,field=form.elements.note,button=form.querySelector('button');if(!field.value.trim())return;button.disabled=true;try{await api('/api/professor/students/'+encodeURIComponent(studentId)+'/journey-notes',{method:'POST',body:JSON.stringify({note:field.value.trim()})});field.value='';render(await api('/api/professor/students/'+encodeURIComponent(studentId)));message('Observação salva.','success');}catch(error){message('Não foi possível salvar a observação: '+error.message,'error');}finally{button.disabled=false;}});
 const gear=$('#student-settings-button'),menu=$('#student-settings-menu'),planModal=$('#student-plan-modal'),planForm=$('#student-plan-form');gear?.addEventListener('click',()=>menu.hidden=!menu.hidden);document.addEventListener('click',e=>{if(!e.target.closest('.student-settings-wrap'))menu.hidden=true;});const closePlan=()=>{planModal.classList.remove('is-open');planModal.setAttribute('aria-hidden','true');};document.querySelectorAll('[data-close-plan]').forEach(x=>x.addEventListener('click',closePlan));async function fillPlans(){const d=await api('/api/professor/plans');const s=planForm.elements.plan_id;s.replaceChildren(new Option('Selecione um plano',''));(d.plans||[]).filter(p=>p.is_active).forEach(p=>s.add(new Option(p.name,p.id)));}document.querySelectorAll('[data-student-setting]').forEach(b=>b.addEventListener('click',async()=>{menu.hidden=true;const a=b.dataset.studentSetting;if(a==='plan'){try{await fillPlans();planModal.classList.add('is-open');planModal.setAttribute('aria-hidden','false');}catch(e){message('Erro ao carregar planos: '+e.message,'error');}return;}if(a==='suspend'||a==='reactivate'){const status=a==='suspend'?'suspended':'active';if(!confirm(a==='suspend'?'Suspender o acesso deste aluno?':'Reativar o acesso deste aluno?'))return;try{await api('/api/professor/students/'+encodeURIComponent(studentId)+'/status',{method:'PATCH',body:JSON.stringify({status})});render(await api('/api/professor/students/'+encodeURIComponent(studentId)));message('Acesso atualizado.','success');}catch(e){message('Erro: '+e.message,'error');}return;}if(a==='delete')$('#delete-student')?.click();}));planForm?.addEventListener('submit',async e=>{e.preventDefault();const d=new FormData(planForm),btn=planForm.querySelector('button[type=submit]');btn.disabled=true;try{await api('/api/professor/students/'+encodeURIComponent(studentId)+'/subscription',{method:'PATCH',body:JSON.stringify({plan_id:d.get('plan_id'),lifetime:d.get('lifetime')==='on'})});closePlan();render(await api('/api/professor/students/'+encodeURIComponent(studentId)));message('Plano atualizado.','success');}catch(err){message('Erro ao alterar plano: '+err.message,'error');}finally{btn.disabled=false;}}); $('#delete-student')?.addEventListener('click',async()=>{const studentName=$('#student-title').textContent.replace(/\.$/,'');if(!confirm('ATENÇÃO: excluir '+studentName+'? A conta e os registros vinculados serão removidos permanentemente. Esta ação não pode ser desfeita.'))return;if(prompt('Para confirmar, digite EXCLUIR')!=='EXCLUIR')return;const button=$('#delete-student');button.disabled=true;button.textContent='Excluindo…';try{await api('/api/professor/students/'+encodeURIComponent(studentId),{method:'DELETE'});alert('Aluno excluído.');location.href='./index.html';}catch(error){button.disabled=false;button.textContent='Excluir aluno';message('Não foi possível excluir o aluno: '+error.message,'error');}});
 $('#workout-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type=submit]'),days=workoutDays.filter(d=>d.exercises.length).map(d=>({title:d.title,exercises:d.exercises.map(ex=>({name:ex.name,gifUrl:ex.gifUrl,muscle:ex.muscle,equipment:ex.equipment,sets:Number(ex.sets||3),reps:String(ex.reps||12),load:ex.load||'',rest:Number(ex.rest||60)}))}));if(!days.length){message('Selecione pelo menos um exercício para salvar o treino.','error');return;}button.disabled=true;try{const fd=new FormData(form);await api('/api/professor/students/'+encodeURIComponent(studentId)+'/workouts',{method:'POST',body:JSON.stringify({title:fd.get('title'),goal:fd.get('goal'),weekly_frequency:Number(fd.get('weekly_frequency')),sessions:days})});closeWorkoutBuilder();form.reset();render(await api('/api/professor/students/'+encodeURIComponent(studentId)));message('Treino cadastrado com exercícios e GIFs.','success');}catch(error){message('Não foi possível salvar o treino: '+error.message,'error');}finally{button.disabled=false;}});
 $('#add-diet-meal').addEventListener('click',addDietMeal);addDietMeal();
 $('#diet-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type=submit]'),meals=collectDietMeals();if(!meals.length){message('Adicione pelo menos uma refeição.','error');return;}button.disabled=true;try{const fd=new FormData(form);await api('/api/professor/students/'+encodeURIComponent(studentId)+'/diets',{method:'POST',body:JSON.stringify({title:fd.get('title'),goal:fd.get('goal'),calories_target:fd.get('calories_target')||null,meals})});form.reset();$('#diet-meals').replaceChildren();addDietMeal();render(await api('/api/professor/students/'+encodeURIComponent(studentId)));message('Dieta cadastrada e vinculada ao aluno.','success');}catch(error){message('Não foi possível salvar a dieta: '+error.message,'error');}finally{button.disabled=false;}});
 $('#logout')?.addEventListener('click',async()=>{try{await logout()}finally{location.replace('/student/pages/login.html')}});
});
