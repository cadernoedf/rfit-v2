const form=document.querySelector('#anamnesis-form');
const msg=document.querySelector('#anam-message');
const submitButton=document.querySelector('#anam-submit');
const statusNote=document.querySelector('#anam-status-note');
const setMsg=(s,err=false)=>{msg.textContent=s;msg.className=err?'anam-error':''};
const profileName=document.querySelector('#anam-name'),phoneField=document.querySelector('#anam-phone');
let isEditing=false;
function showStatus(completed){
 if(!statusNote)return;
 statusNote.hidden=false;
 const emoji=statusNote.querySelector('.status-emoji'),copy=statusNote.querySelector('.status-copy');
 if(emoji)emoji.textContent=completed?'✅':'ℹ️';
 if(copy)copy.textContent=completed?'Você já respondeu à anamnese. Suas respostas foram carregadas abaixo; revise e salve somente se algo mudou.':'Sua anamnese ainda está pendente. Preencha as perguntas para iniciar seu acompanhamento.';
 if(submitButton)submitButton.textContent=completed?'Salvar alterações da anamnese':'Enviar anamnese';
}
function restoreForm(saved){
 if(!saved||typeof saved!=='object')return;
 for(const el of form.elements){
  if(!el.name||!(el.name in saved))continue;
  const value=saved[el.name];
  if(el.type==='checkbox')el.checked=Array.isArray(value)?value.map(String).includes(el.value):String(value)===el.value;
  else if(el.type==='radio')el.checked=String(value)===el.value;
  else if(!['submit','button'].includes(el.type)&&!Array.isArray(value)&&value!==null&&value!==undefined)el.value=String(value);
 }
}
Promise.all([
 fetch('/api/student/dashboard',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}}).then(async r=>r.ok?await r.json():null).catch(()=>null),
 fetch('/api/student/settings',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}}).then(async r=>r.ok?await r.json():null).catch(()=>null),
 fetch('/api/student/anamnesis/status',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}}).then(async r=>r.ok?await r.json():null).catch(()=>null)
]).then(([dashboard,settings,status])=>{
 const profile=settings?.profile||{};
 if(profileName)profileName.value=dashboard?.student?.name||profile.name||'Nome não cadastrado';
 const phone=String(profile.phone||dashboard?.student?.phone||'').trim();
 if(phoneField)phoneField.value=phone||'Telefone não retornado pela API';
 const answers=dashboard?.anamnesis_answers||null;
 let saved=answers?.form_answers||null;
 if(!saved&&answers?.additional_notes){try{const parsed=JSON.parse(answers.additional_notes);saved=parsed.form_answers||parsed}catch{}}
 isEditing=Boolean(status?.completed||dashboard?.anamnesis_completed);
 if(saved)restoreForm(saved);
 // Also restore the stable fields for older records whose full original answers were not stored.
 if(answers){
  const stable={birth_date:answers.birth_date,height_cm:answers.height_cm,weight_kg:answers.weight_kg,training_frequency:answers.training_frequency};
  for(const [name,value] of Object.entries(stable)){const el=form.elements.namedItem(name);if(el&&value!==undefined&&value!==null&&!el.value)el.value=String(value)}
 }
 showStatus(isEditing);
}).catch(()=>{
 if(profileName)profileName.value='Não foi possível carregar';
 if(phoneField)phoneField.value='Não foi possível carregar';
 showStatus(false);
});
const selected=name=>[...form.querySelectorAll('[name="'+name+'"]:checked')].map(x=>x.value);
form?.addEventListener('change',e=>{const x=e.target;if(x.matches('input[type="checkbox"]')){const group=x.name,vals=selected(group);if(x.checked&&vals.includes('Nenhum'))form.querySelectorAll('[name="'+group+'"]').forEach(y=>{if(y!==x)y.checked=false});else if(x.checked&&['Nenhuma','Não'].includes(x.value))form.querySelectorAll('[name="'+group+'"]').forEach(y=>{if(y!==x&&['Nenhum','Nenhuma','Não'].includes(y.value))y.checked=false})}});
form?.addEventListener('submit',async e=>{
 e.preventDefault();
 const requiredGroups=['goal_options','work_activities','surgeries','diagnoses','symptoms','exercise_sensations','alcohol_frequency','supplements','planned_supplements'];
 for(const name of requiredGroups){if(!selected(name).length){setMsg('Responda à pergunta: '+({goal_options:'objetivo do treinamento',work_activities:'atividades no trabalho',surgeries:'intervenções cirúrgicas',diagnoses:'problemas diagnosticados',symptoms:'sintomas',exercise_sensations:'sensações durante exercício',alcohol_frequency:'ingestão de bebidas alcoólicas',supplements:'suplementos atuais',planned_supplements:'suplementos que pretende tomar'}[name])+'.',true);form.querySelector('[name="'+name+'"]')?.scrollIntoView({behavior:'smooth',block:'center'});return}}
 const btn=submitButton||form.querySelector('button');btn.disabled=true;setMsg('Salvando suas respostas…');
 const raw=Object.fromEntries(new FormData(form).entries());
 const arrNames=['goal_options','work_activities','surgeries','diagnoses','symptoms','exercise_sensations','alcohol_frequency','supplements','planned_supplements'];
 const answers={...raw};for(const name of arrNames)answers[name]=selected(name);
 const goals=answers.goal_options.join(' | ');
 const diagnoses=[...answers.surgeries.map(x=>'Cirurgia: '+x),...answers.diagnoses,...answers.symptoms.map(x=>'Sintoma: '+x),...answers.exercise_sensations.map(x=>'Sensação no exercício: '+x)].filter(x=>!/^Nenhum$|^Nenhuma$/.test(x));
 const meds=raw.medication_status==='Não'?'Nenhum':raw.medications_detail||raw.medication_status||'';
 const allergies=raw.food_restriction_status==='Sim'?(raw.food_restriction_detail||'Restrição alimentar informada'):'';
 const body={form_answers:answers,birth_date:raw.birth_date,sex:'',height_cm:raw.height_cm,weight_kg:raw.weight_kg,goal:goals||'Não informado',training_frequency:raw.training_frequency,experience_level:raw.experience_level||'',health_conditions:diagnoses.join(' — '),medications:meds,allergies,restrictions:raw.food_restriction_detail||'',additional_notes:raw.observations||''};
 try{
  const r=await fetch('/api/student/anamnesis',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json();if(!r.ok)throw new Error(d.error||'save_failed');
  if(d.unchanged){setMsg('Nenhuma alteração detectada. Sua anamnese continua salva; não foi criada uma nova atualização.');btn.disabled=false;return}
  setMsg(isEditing?'Anamnese atualizada! Abrindo sua área do aluno…':'Anamnese concluída! Abrindo sua área do aluno…');
  location.assign('/student/pages/portal/journey/index.html');
 }catch(err){setMsg(err.message==='active_plan_required'?'É necessário ter um plano ativo para responder à anamnese.':'Não foi possível salvar. Confira os campos obrigatórios e tente novamente.',true);btn.disabled=false}
});
