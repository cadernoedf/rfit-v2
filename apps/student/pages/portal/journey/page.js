import {getCurrentUser,logout} from '../../../../shared/js/api-client.js';
document.addEventListener('DOMContentLoaded',async()=>{
 const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
 const fmt=(value,unit='')=>value===null||value===undefined||value===''||!Number.isFinite(Number(value))?'—':String(value).replace('.',',')+unit;
 const dateText=value=>{if(!value)return '';const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})};
 const addTimeline=(items,title,description,date,mark='•')=>items.push({title,description,date,mark});
 try{
  const auth=await getCurrentUser();if(auth.user.role!=='student'){location.replace('/professor/');return}
  set('student-welcome','Olá, '+(auth.user.name||auth.user.email)+'.');
  const responses=await Promise.all([fetch('/api/student/dashboard',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}}),fetch('/api/student/anamnesis/status',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}})]);
  if(!responses[0].ok)throw new Error('dashboard_unavailable');
  const data=await responses[0].json(),anamnesis=responses[1].ok?await responses[1].json():null;
  const body=data.body||{},sub=data.subscription;
  set('journey-goal',data.goal||'Construindo sua melhor versão.');
  set('journey-subtitle',data.anamnesis_completed?'Seus dados e registros ajudam você e seu personal a acompanhar sua evolução.':'Sua jornada fica mais personalizada quando você conclui a anamnese.');
  set('journey-plan',sub?.plan_name||'Nenhum plano ativo');
  set('journey-days',sub?(Number(sub.lifetime)?'Acesso vitalício':sub.days_remaining===null||sub.days_remaining===undefined?'Plano ativo':'Restam '+sub.days_remaining+' '+(sub.days_remaining===1?'dia':'dias')):'Escolha seu plano');
  set('journey-weight',fmt(body.weight_kg,' kg'));set('journey-bmi',fmt(body.bmi));set('journey-waist',fmt(body.waist_cm,' cm'));
  set('journey-weight-note',body.measured_at?'Atualizado em '+dateText(body.measured_at):'Dado da anamnese ou última avaliação');
  set('journey-measure-date',body.measured_at?dateText(body.measured_at):'Sem medida registrada');
  set('journey-days-count',!sub?'—':Number(sub.lifetime)?'∞':sub.days_remaining===null||sub.days_remaining===undefined?'—':String(sub.days_remaining));
  set('journey-expiry-note',!sub?'Nenhum plano ativo':Number(sub.lifetime)?'Acesso vitalício':sub.expires_at?'Vence em '+dateText(sub.expires_at):'Validade não informada');
  set('journey-weight-compare',fmt(body.weight_kg,' kg'));set('journey-waist-compare',fmt(body.waist_cm,' cm'));set('journey-bmi-compare',fmt(body.bmi));
  set('journey-record-count',body.measured_at?'1 registro recente':'0 registros');
  const healthCard=document.getElementById('journey-health-card'),healthItems=document.getElementById('journey-health-items'),healthInfo=data.health_info||{};
  const healthRows=[['Condições / lesões',healthInfo.health_conditions,['Nenhuma','Nenhum','']],['Medicamentos',healthInfo.medications,['Nenhum','Nenhuma','']],['Alergias',healthInfo.allergies,['Nenhuma','Nenhum','']],['Restrições alimentares',healthInfo.restrictions,['Nenhuma','Nenhum','']]];
  if(healthCard&&healthItems){healthItems.replaceChildren();healthRows.forEach(([label,value,ignored])=>{if(!value)return;const clean=String(value).trim();if(!clean||['Nenhuma','Nenhum','Não','Não informado'].includes(clean))return;const chip=document.createElement('span');chip.className='journey-health-item';const strong=document.createElement('strong');strong.textContent=label+': ';chip.append(strong,document.createTextNode(clean));healthItems.append(chip)});healthCard.hidden=healthItems.childElementCount===0;}
  const reminder=document.getElementById('journey-anamnesis');
  if(reminder&&anamnesis?.has_active_plan&&!anamnesis.completed)reminder.hidden=false;
  const updateCard=document.getElementById('journey-anamnesis-update'),updateNote=document.getElementById('journey-anamnesis-update-note');
  if(updateCard&&anamnesis?.completed){updateCard.hidden=false;if(updateNote)updateNote.textContent='Última atualização: '+(dateText(anamnesis.completed_at)||'data não disponível')+'. Atualize se seu estado de saúde, rotina, objetivos ou restrições mudarem.';}
  const items=[];
  if(data.anamnesis_completed||anamnesis?.completed)addTimeline(items,'Anamnese concluída','Dados iniciais registrados para orientar seu acompanhamento.',anamnesis?.completed_at,'✓');
  else addTimeline(items,'Complete sua anamnese','Preencha os dados iniciais para personalizar o acompanhamento.','','!');
  if(sub)addTimeline(items,'Plano ativo: '+(sub.plan_name||'R-Fit'),Number(sub.lifetime)?'Seu acesso é vitalício.':(sub.days_remaining===null?'Plano em andamento.':'Restam '+sub.days_remaining+' dias de acesso.'),sub.expires_at,'R');
  if(body.weight_kg!==null||body.waist_cm!==null)addTimeline(items,'Medidas corporais disponíveis','Peso: '+fmt(body.weight_kg,' kg')+' · Abdômen: '+fmt(body.waist_cm,' cm')+' · IMC: '+fmt(body.bmi),body.measured_at,'↗');
  if(data.workout_available)addTimeline(items,'Treino disponível',data.workout_title||'Confira a prescrição de treino.','','↗');
  if(data.diet_available)addTimeline(items,'Plano alimentar disponível',data.diet_title||'Confira seu plano alimentar.','','↗');
  if(!items.length)addTimeline(items,'Sua jornada começa agora','Seu personal poderá adicionar medidas, treino e dieta conforme o acompanhamento evoluir.','','•');
  const list=document.getElementById('journey-timeline-list');list.replaceChildren();
  items.forEach(item=>{const li=document.createElement('li'),dot=document.createElement('span'),wrap=document.createElement('div'),title=document.createElement('strong'),desc=document.createElement('p'),time=document.createElement('time');dot.className='journey-timeline-dot';dot.textContent=item.mark;title.textContent=item.title;desc.textContent=item.description;if(item.date){time.textContent=dateText(item.date);time.dateTime=item.date}wrap.append(title,desc);if(item.date)wrap.append(time);li.append(dot,wrap);list.append(li)});
  const message=document.getElementById('page-message');if(message)message.textContent='';
 }catch(error){const message=document.getElementById('page-message');if(message)message.textContent='Não foi possível carregar sua jornada agora. Atualize a página para tentar novamente.';console.error('student_journey_load_failed',error)}
 document.getElementById('logout')?.addEventListener('click',async function(){this.disabled=true;try{await logout()}finally{location.replace('/student/pages/login.html')}});
});