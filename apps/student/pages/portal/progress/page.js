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
    try{
      const response=await fetch('/api/student/dashboard',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
      if(response.ok){
        const data=await response.json(),body=data.body||{};
        const weight=Number(body.weight_kg),height=Number(body.height_cm);
        let bmi=Number(body.bmi);
        if((!Number.isFinite(bmi)||bmi<=0)&&Number.isFinite(weight)&&Number.isFinite(height)&&height>0)bmi=weight/Math.pow(height/100,2);
        const card=document.getElementById('bmi-gauge-card');
        if(card&&Number.isFinite(bmi)&&bmi>0&&Number.isFinite(weight)){
          const value=document.getElementById('bmi-gauge-value'),category=document.getElementById('bmi-gauge-category'),description=document.getElementById('bmi-gauge-description'),needle=document.getElementById('bmi-gauge-needle'),svg=document.getElementById('bmi-gauge-svg');
          let label,color,detail;
          if(bmi<18.5){label='Abaixo do peso';color='#199ed0';detail='O resultado está abaixo da faixa de referência para adultos. Avalie junto a outros indicadores.'}
          else if(bmi<25){label='Faixa adequada';color='#159b50';detail='O resultado está na faixa de referência de IMC para adultos. Isso não substitui a avaliação individual.'}
          else if(bmi<30){label='Sobrepeso';color='#c28a00';detail='O resultado está na faixa de sobrepeso pelo IMC. Considere outros indicadores e contexto individual.'}
          else if(bmi<35){label='Obesidade grau I';color='#ed7417';detail='O resultado está na faixa de obesidade grau I pelo IMC. A classificação não é um diagnóstico isolado.'}
          else if(bmi<40){label='Obesidade grau II';color='#df4b27';detail='O resultado está na faixa de obesidade grau II pelo IMC. A classificação não é um diagnóstico isolado.'}
          else{label='Obesidade grau III';color='#c92736';detail='O resultado está na faixa de obesidade grau III pelo IMC. A classificação não é um diagnóstico isolado.'}
          if(value)value.textContent=bmi.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
          if(category){category.textContent=label;category.style.background=color+'18';category.style.color=color}
          if(description)description.textContent=detail;
          // Semicircle maps the adult range 16–40+ to -90°…90°.
          const clamped=Math.max(16,Math.min(45,bmi));
          const angle=-90+((clamped-16)/(45-16))*180;
          if(needle)needle.setAttribute('transform','rotate('+angle+' 180 174)');
          if(svg)svg.setAttribute('aria-label','IMC '+bmi.toLocaleString('pt-BR',{maximumFractionDigits:1})+', classificação '+label);
          card.hidden=false;
        }
      }
    }catch(error){console.warn('bmi_gauge_load_failed')}

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
