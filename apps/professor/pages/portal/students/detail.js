/* ==========================================================================
   R-FIT | PORTAL DO PROFESSOR
   Módulo: Perfil individual, treinos e dietas.
   ========================================================================== */
import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';

/* ===== IDENTIFICAÇÃO ===== */
const $=(selector)=>document.querySelector(selector);
const studentId=new URLSearchParams(location.search).get('id');
const message=(text,state='')=>{const el=$('#page-message');el.textContent=text;el.dataset.state=state;};
async function api(url,options={}){const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers:{Accept:'application/json','Content-Type':'application/json',...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok){const error=new Error(data.error||'request_failed');error.stage=data.stage||null;throw error;}return data;}
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
 const actions=document.createElement('div');actions.className='student-profile-contact';
 const phone=document.createElement('span');phone.textContent=s.phone||'Telefone não informado';
 const goal=document.createElement('span');goal.textContent=s.goal||'Objetivo não informado';
 actions.append(phone,goal);
 const quick=document.createElement('div');quick.className='student-profile-quick-actions';
 const digits=String(s.phone||'').replace(/\\D/g,'');
 if(digits.length>=10){const wa=document.createElement('a');wa.className='student-quick-button is-whatsapp';wa.href='https://wa.me/'+(digits.startsWith('55')?digits:'55'+digits);wa.target='_blank';wa.rel='noopener noreferrer';wa.textContent='Conversar no WhatsApp';quick.append(wa);}
 const assessment=document.createElement('button');assessment.type='button';assessment.className='student-quick-button is-primary';assessment.textContent='＋ Registrar avaliação';assessment.addEventListener('click',()=>{document.querySelector('[data-student-tab="evolution"]')?.click();document.querySelector('#open-assessment')?.click();});quick.append(assessment);
 const workout=document.createElement('button');workout.type='button';workout.className='student-quick-button';workout.textContent='＋ Novo treino';workout.addEventListener('click',()=>{document.querySelector('[data-student-tab="workouts"]')?.click();document.querySelector('#workout-form')?.scrollIntoView({behavior:'smooth',block:'start'});});quick.append(workout);
 hero.append(avatar,info,actions,quick);
 const measurements=data.measurements||[];
 const latest=measurements[0]||{};
 const weight=latest.weight_kg??s.weight_kg;
 const height=latest.height_cm??s.height_cm;
 const bmi=weight&&height?Number(weight)/(Number(height)/100)**2:null;
 const lastCheckin=(data.checkins||[])[0]?.checkin_date||latest.measured_at;
 const previous=[...measurements].slice(1).find(m=>m.weight_kg!==null&&m.weight_kg!==undefined);
 const weightDelta=previous&&latest.weight_kg!=null?Number(latest.weight_kg)-Number(previous.weight_kg):null;
 const metricCards=[['Peso atual',weight?Number(weight).toLocaleString('pt-BR')+' kg':'—',weightDelta===null?'':(weightDelta>0?'+':'')+weightDelta.toFixed(1).replace('.',',')+' kg desde a avaliação anterior'],['Cintura',latest.waist_cm?Number(latest.waist_cm).toLocaleString('pt-BR')+' cm':'—','Última medida registrada'],['IMC',bmi?bmi.toFixed(1).replace('.',','):'—',height?'Calculado com a altura cadastrada':'Altura não cadastrada'],['Último acompanhamento',lastCheckin?new Date(lastCheckin+'T12:00:00').toLocaleDateString('pt-BR'):'—','Data do registro mais recente']];
 const metrics=$('#student-360-metrics');metrics.replaceChildren();
 metricCards.forEach(([label,value,hint])=>{const card=document.createElement('article');card.className='student-360-card';const l=document.createElement('span');l.textContent=label;const v=document.createElement('strong');v.textContent=value;card.append(l,v);if(hint){const small=document.createElement('small');small.textContent=hint;card.append(small);}metrics.append(card);});
 const evolution=$('#student-evolution');evolution.replaceChildren();
 const points=[...measurements].filter(m=>m.weight_kg!==null&&m.weight_kg!==undefined).reverse();
 if(points.length){const max=Math.max(...points.map(m=>Number(m.weight_kg))),min=Math.min(...points.map(m=>Number(m.weight_kg))),range=Math.max(1,max-min);const bars=document.createElement('div');bars.className='student-evolution-bars';const heading=document.createElement('div');heading.className='student-evolution-caption';heading.textContent='Evolução do peso · '+points.length+' avaliação(ões)';bars.append(heading);points.forEach(m=>{const row=document.createElement('div');row.className='student-evolution-row';const date=document.createElement('span');date.textContent=new Date(m.measured_at+'T12:00:00').toLocaleDateString('pt-BR');const track=document.createElement('div');track.className='student-evolution-track';const fill=document.createElement('i');fill.style.width=(35+(Number(m.weight_kg)-min)/range*65)+'%';track.append(fill);const value=document.createElement('strong');value.textContent=Number(m.weight_kg).toLocaleString('pt-BR')+' kg';row.append(date,track,value);bars.append(row);});const waistPoints=[...measurements].filter(m=>m.waist_cm!==null&&m.waist_cm!==undefined);if(waistPoints.length>1){const first=Number(waistPoints[waistPoints.length-1].waist_cm),last=Number(waistPoints[0].waist_cm),delta=last-first;const note=document.createElement('p');note.className='student-evolution-insight';note.textContent='Cintura: '+(delta>0?'+':'')+delta.toFixed(1).replace('.',',')+' cm no período ('+first.toLocaleString('pt-BR')+' → '+last.toLocaleString('pt-BR')+' cm).';bars.append(note);}evolution.append(bars);}else evolution.textContent='Ainda não há avaliações com peso para mostrar a evolução.';
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
 const activity=$('#student-recent-activity');if(activity){activity.replaceChildren();const events=[];(data.measurements||[]).forEach(m=>events.push({date:m.measured_at,title:'Avaliação registrada',detail:[m.weight_kg?m.weight_kg+' kg':null,m.waist_cm?m.waist_cm+' cm':null].filter(Boolean).join(' · ')}));(data.checkins||[]).forEach(item=>events.push({date:item.checkin_date||item.created_at,title:'Check-in recebido',detail:'Acompanhamento registrado'}));(data.journey_notes||[]).forEach(item=>events.push({date:item.created_at,title:'Observação do professor',detail:item.note}));events.filter(item=>item.date).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6).forEach(event=>{const row=document.createElement('div');row.className='student-journey-note';const date=document.createElement('small');const parsed=new Date(event.date);date.textContent=Number.isNaN(parsed.getTime())?'':parsed.toLocaleDateString('pt-BR');const title=document.createElement('strong');title.textContent=event.title;const detail=document.createElement('div');detail.textContent=event.detail;row.append(date,title,detail);activity.append(row);});if(!activity.children.length)activity.textContent='As atividades recentes aparecerão aqui conforme novos registros forem realizados.';}
 const finance=$('#student-finance-summary');if(finance){finance.replaceChildren();const sub=data.subscription||{};const facts=[['Situação',sub.status||'Não informada'],['Vencimento',sub.expires_at?new Date(sub.expires_at+'T12:00:00').toLocaleDateString('pt-BR'):'Não informado'],['Valor',sub.price_cents!=null?money(sub.price_cents):'Não informado']];const grid=document.createElement('div');grid.className='student-finance-facts';facts.forEach(([label,value])=>{const card=document.createElement('div');card.className='student-finance-fact';const l=document.createElement('span');l.textContent=label;const v=document.createElement('strong');v.textContent=value;card.append(l,v);grid.append(card);});finance.append(grid);}

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

/* Navegação por abas da ficha 360 */
document.querySelectorAll('[data-student-tab]').forEach(button=>button.addEventListener('click',()=>{const target=button.dataset.studentTab;document.querySelectorAll('[data-student-tab]').forEach(tab=>{const active=tab===button;tab.classList.toggle('is-active',active);tab.setAttribute('aria-selected',String(active));});document.querySelectorAll('[data-student-panel]').forEach(panel=>{const active=panel.dataset.studentPanel===target;panel.classList.toggle('is-active',active);panel.hidden=!active;});}));
document.querySelectorAll('[data-go-tab]').forEach(button=>button.addEventListener('click',()=>document.querySelector('[data-student-tab="'+button.dataset.goTab+'"]')?.click()));
/* ===== INICIALIZAÇÃO E SALVAMENTO ===== */
document.addEventListener('DOMContentLoaded',async()=>{
 try{const auth=await getCurrentUser();if(!['professor','admin'].includes(auth.user.role)){location.replace('/student/dashboard.html');return;}$('#professor-welcome').textContent='Olá, '+(auth.user.name||auth.user.email)+'.';}
 catch{location.replace('/student/pages/login.html');return;}
 if(!studentId){message('Identificador do aluno não informado.');return;}
 try{render(await api('/api/professor/students/'+encodeURIComponent(studentId)));}catch(error){message('Não foi possível carregar o aluno: '+error.message);}
 const modal=$('#assessment-modal'),assessmentForm=$('#assessment-form');
 const closeAssessment=()=>{modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');};
 $('#open-assessment')?.addEventListener('click',()=>{const now=new Date();assessmentForm.elements.measured_at.value=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');assessmentForm.elements.weight_kg.focus();});
 modal.querySelectorAll('[data-close-assessment]').forEach(el=>el.addEventListener('click',closeAssessment));
 document.addEventListener('keydown',event=>{if(event.key==='Escape')closeAssessment();});
 assessmentForm?.addEventListener('submit',async event=>{event.preventDefault();const button=assessmentForm.querySelector('[type=submit]');button.disabled=true;try{const fd=new FormData(assessmentForm);await api('/api/professor/students/'+encodeURIComponent(studentId)+'/measurements',{method:'POST',body:JSON.stringify({measured_at:fd.get('measured_at'),weight_kg:fd.get('weight_kg'),waist_cm:fd.get('waist_cm'),bmr_kcal:fd.get('bmr_kcal'),notes:fd.get('notes')})});assessmentForm.reset();closeAssessment();render(await api('/api/professor/students/'+encodeURIComponent(studentId)));message('Avaliação registrada com sucesso.','success');}catch(error){message('Não foi possível salvar a avaliação: '+error.message+(error.stage?' · Etapa: '+error.stage:''),'error');}finally{button.disabled=false;}});
 $('#journey-note-form')?.addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,field=form.elements.note,button=form.querySelector('button');if(!field.value.trim())return;button.disabled=true;try{await api('/api/professor/students/'+encodeURIComponent(studentId)+'/journey-notes',{method:'POST',body:JSON.stringify({note:field.value.trim()})});field.value='';render(await api('/api/professor/students/'+encodeURIComponent(studentId)));message('Observação salva.','success');}catch(error){message('Não foi possível salvar a observação: '+error.message,'error');}finally{button.disabled=false;}});
 $('#delete-student')?.addEventListener('click',async()=>{const studentName=$('#student-title').textContent.replace(/\.$/,'');if(!confirm('ATENÇÃO: excluir '+studentName+'? A conta e os registros vinculados serão removidos permanentemente. Esta ação não pode ser desfeita.'))return;if(prompt('Para confirmar, digite EXCLUIR')!=='EXCLUIR')return;const button=$('#delete-student');button.disabled=true;button.textContent='Excluindo…';try{await api('/api/professor/students/'+encodeURIComponent(studentId),{method:'DELETE'});alert('Aluno excluído.');location.href='./index.html';}catch(error){button.disabled=false;button.textContent='Excluir aluno';message('Não foi possível excluir o aluno: '+error.message,'error');}});
 $('#add-workout-day').addEventListener('click',addWorkoutDay);addWorkoutDay();
 $('#workout-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type=submit]'),days=collectWorkoutDays();if(!days.length){message('Adicione pelo menos um dia de treino.','error');return;}button.disabled=true;try{const fd=new FormData(form);await api('/api/professor/students/'+encodeURIComponent(studentId)+'/workouts',{method:'POST',body:JSON.stringify({title:fd.get('title'),goal:fd.get('goal'),weekly_frequency:Number(fd.get('weekly_frequency')),sessions:days})});form.reset();$('#workout-days').replaceChildren();workoutDayCount=0;addWorkoutDay();render(await api('/api/professor/students/'+encodeURIComponent(studentId)));message('Treino cadastrado e vinculado ao aluno.','success');}catch(error){message('Não foi possível salvar o treino: '+error.message,'error');}finally{button.disabled=false;}});
 $('#add-diet-meal').addEventListener('click',addDietMeal);addDietMeal();
 $('#diet-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type=submit]'),meals=collectDietMeals();if(!meals.length){message('Adicione pelo menos uma refeição.','error');return;}button.disabled=true;try{const fd=new FormData(form);await api('/api/professor/students/'+encodeURIComponent(studentId)+'/diets',{method:'POST',body:JSON.stringify({title:fd.get('title'),goal:fd.get('goal'),calories_target:fd.get('calories_target')||null,meals})});form.reset();$('#diet-meals').replaceChildren();addDietMeal();render(await api('/api/professor/students/'+encodeURIComponent(studentId)));message('Dieta cadastrada e vinculada ao aluno.','success');}catch(error){message('Não foi possível salvar a dieta: '+error.message,'error');}finally{button.disabled=false;}});
 $('#logout')?.addEventListener('click',async()=>{try{await logout()}finally{location.replace('/student/pages/login.html')}});
});
