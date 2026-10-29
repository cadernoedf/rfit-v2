/* R-Fit — módulo independente: progress. */
import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';
document.addEventListener('DOMContentLoaded', async function () {
  const welcome=document.querySelector('#student-welcome');
  const message=document.querySelector('#page-message');
  try {
    const result=await getCurrentUser();
    if(result.user.role!=='student'){window.location.replace('/professor/');return;}
    welcome.textContent='Olá, '+(result.user.name||result.user.email)+'.';
    if(message) message.textContent='Sessão validada.';
    try {
      const response=await fetch('/api/student/dashboard',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
      if(response.ok){
        const data=await response.json();
        let formAnswers=data.anamnesis_answers?.form_answers||null;
        if(!formAnswers){
          const oldNotes=data.anamnesis_answers?.additional_notes||data.health_info?.additional_notes;
          if(oldNotes){try{const parsed=JSON.parse(oldNotes);formAnswers=parsed.form_answers||parsed}catch{}}
        }
        const alerts=[];
        const list=(key)=>Array.isArray(formAnswers?.[key])?formAnswers[key].map(String):[];
        const diagnoses=list('diagnoses'), surgeries=list('surgeries'), symptoms=list('symptoms'), sensations=list('exercise_sensations');
        const otherDiagnosis=String(formAnswers?.diagnoses_other||'').trim();
        const allHealth=[...diagnoses,...surgeries,...symptoms,...sensations,otherDiagnosis].join(' ').toLowerCase();
        if(/artrite|artrose|articula|joelho|quadril|coluna|hérnia|hernia/.test(allHealth)) alerts.push(['Condição articular ou musculoesquelética','Adaptar exercícios, amplitude, volume e impacto conforme avaliação individual.']);
        if(/tontura|mal-estar|mal estar|enjoo|falta de ar|dor no peito|palpitação|palpitacao|tosse com sangue|sentir-se fraco/.test(allHealth)) alerts.push(['Sintomas relatados','Observar a resposta ao esforço. Se houver sintomas durante o exercício, interromper a atividade e buscar orientação profissional; sintomas intensos ou súbitos exigem atendimento médico.']);
        if(surgeries.some(x=>!/^nenhuma$/i.test(x))) alerts.push(['Histórico de cirurgia','Confirmar restrições, liberação e orientações médicas antes de definir os exercícios.']);
        const meds=String(formAnswers?.medications_detail||'').trim();
        if(formAnswers?.medication_status==='Sim'&&meds) alerts.push(['Uso de medicamento','Considerar a informação na avaliação e conferir possíveis orientações ou limitações com o profissional de saúde responsável.']);
        const panel=document.getElementById('progress-attention'),items=document.getElementById('progress-attention-items');
        if(panel&&items&&alerts.length){
          items.replaceChildren();
          alerts.forEach(([title,description],index)=>{
            const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:38px minmax(0,1fr);gap:12px;padding:14px 2px;border-bottom:'+(index===alerts.length-1?'0':'1px solid #ececf1');
            const icon=document.createElement('span');icon.style.cssText='display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:'+(index===0?'#fff2cc':'#ffebe2')+';color:'+(index===0?'#986600':'#b54a1e')+';font-weight:900';icon.textContent=index===0?'•':'⌁';
            const copy=document.createElement('div'),heading=document.createElement('strong'),desc=document.createElement('p');heading.textContent=title;heading.style.cssText='display:block;font-size:.9rem;color:#252630';desc.textContent=description;desc.style.cssText='margin:4px 0 0;color:#687080;font-size:.8rem;line-height:1.5';copy.append(heading,desc);row.append(icon,copy);items.append(row);
          });panel.hidden=false;
        }
      }
    } catch (error) { console.warn('progress_attention_load_failed'); }
  } catch(error) { window.location.replace('/student/pages/login.html'); return; }
  document.querySelector('#logout')?.addEventListener('click',async function(){this.disabled=true;try{await logout();}finally{window.location.replace('/student/pages/login.html');}});
});
