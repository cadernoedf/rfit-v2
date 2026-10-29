const form=document.querySelector('#anamnesis-form');const msg=document.querySelector('#anam-message');const setMsg=(s,err=false)=>{msg.textContent=s;msg.className=err?'anam-error':''};
const updateDetails=()=>{
 const health=[...form.querySelectorAll('input[name="health_conditions"]:checked')].map(x=>x.value);
 const healthDetail=form.querySelector('[data-detail-for="health_conditions"]');if(healthDetail)healthDetail.hidden=!health.some(x=>x!=='Nenhuma');
 const meds=form.querySelector('input[name="medications_status"]:checked')?.value;
 const medsDetail=form.querySelector('[data-detail-for="medications_status"]');if(medsDetail)medsDetail.hidden=meds!=='Sim';
 const allergy=form.querySelector('input[name="allergies_status"]:checked')?.value;
 const allergyDetail=form.querySelector('[data-detail-for="allergies_status"]');if(allergyDetail)allergyDetail.hidden=allergy!=='Sim';
};
form?.addEventListener('change',e=>{
 const input=e.target;if(input.matches('input[type="checkbox"][data-exclusive]')&&input.checked){form.querySelectorAll('input[name="'+input.name+'"]').forEach(other=>{if(other!==input&&other.value==='Nenhuma')other.checked=false})}
 if(input.matches('input[type="checkbox"]')&&input.value==='Nenhuma'&&input.checked)form.querySelectorAll('input[name="'+input.name+'"]').forEach(other=>{if(other!==input)other.checked=false});
 updateDetails();
});
updateDetails();
form?.addEventListener('submit',async e=>{
 e.preventDefault();const btn=form.querySelector('button');btn.disabled=true;setMsg('Salvando suas respostas…');
 const body=Object.fromEntries(new FormData(form).entries());
 const selected=name=>[...form.querySelectorAll('input[name="'+name+'"]:checked')].map(x=>x.value);
 const health=selected('health_conditions');
 if(!health.length){setMsg('Selecione pelo menos uma opção em condições de saúde.',true);btn.disabled=false;return}
 const healthDetails=body.health_conditions_details?.trim();
 body.health_conditions=[...health,...(healthDetails?[healthDetails]:[])].join(' — ');
 body.medications=body.medications_status==='Sim'?(body.medications?.trim()||'Sim, detalhes não informados'):'Nenhum';
 body.allergies=body.allergies_status==='Sim'?(body.allergies?.trim()||'Sim, detalhes não informados'):'Nenhuma';
 body.restrictions=[...selected('restrictions'),body.restrictions_details?.trim()].filter(Boolean).join(' — ');
 ['health_conditions_details','medications_status','allergies_status','restrictions_details'].forEach(k=>delete body[k]);
 try{
  const r=await fetch('/api/student/anamnesis',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json();if(!r.ok)throw new Error(d.error||'save_failed');
  setMsg('Anamnese concluída! Abrindo sua área do aluno…');location.assign('/student/pages/portal/home/index.html');
 }catch(err){setMsg(err.message==='active_plan_required'?'É necessário ter um plano ativo para responder à anamnese.':'Não foi possível salvar. Confira os campos obrigatórios e tente novamente.',true);btn.disabled=false}
});
