import { getCurrentUser, logout } from '../../../../shared/js/api-client.js';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data=null,day=0;
const css=`<style>
.diet-dashboard{display:grid;gap:18px}.diet-hero{padding:26px;border:1px solid #f3d5dd;border-radius:20px;background:linear-gradient(135deg,#fff,#fff5f7);box-shadow:0 8px 28px #1b2b4508}.diet-head{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}.diet-kicker{font-size:10px;letter-spacing:2px;font-weight:900;color:#ff304f}.diet-hero h3{font-size:24px!important;margin:8px 0;color:#172033}.diet-hero p{margin:0;color:#66758b;font-size:14px}.diet-open{border:0;background:linear-gradient(135deg,#ff304f,#df1838);color:white;padding:14px 20px;border-radius:12px;font-weight:800;cursor:pointer;box-shadow:0 6px 16px #ff304f30}.diet-micro{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;margin-top:18px}.diet-micro article{background:#fff;border:1px solid #e7eaf2;border-radius:10px;padding:9px 10px;min-width:0;display:flex;flex-direction:column;justify-content:center;min-height:88px}.diet-micro .micro-icon{font-size:15px}.diet-micro strong{display:block;font-size:16px;color:#151b29;margin:4px 0 2px;overflow-wrap:anywhere;white-space:nowrap}.diet-micro small{color:#778397;font-size:11px}.diet-note{margin-top:14px;color:#788397;font-size:12px;line-height:1.5}.diet-history{padding:22px;border:1px solid #e5eaf2;border-radius:18px;background:white}.diet-history h3{margin:0 0 15px}.diet-history details{border:1px solid #e8edf4;border-radius:12px;padding:13px;margin:8px 0}.diet-history summary{font-weight:750;cursor:pointer}.food-modal{position:fixed;inset:0;background:#080d19c9;backdrop-filter:blur(8px);z-index:9999;display:grid;place-items:center;padding:18px}.food-dialog{width:min(1120px,100%);max-height:92vh;background:#f7f8fc;border:1px solid #ffffff35;border-radius:22px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 100px #0007}.food-head{padding:24px 28px;background:linear-gradient(120deg,#10131b,#252b38);color:white;display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #ff304f}.food-head small{color:#ff536c;letter-spacing:2px;font-weight:800}.food-head h2{margin:7px 0;font-size:24px;color:white}.food-close{background:#ffffff1b;border:1px solid #ffffff30;color:white;border-radius:10px;padding:10px 14px;cursor:pointer}.food-body{padding:24px;overflow:auto;background:#f7f8fc}.menu-tabs{display:flex;gap:9px;margin:0 0 18px;flex-wrap:wrap}.menu-tab{border:1px solid #dce2ec;background:white;color:#1f2937;border-radius:10px;padding:10px 16px;font-weight:800;cursor:pointer}.menu-tab.active{background:#ff304f;color:white;border-color:#ff304f}.meal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.meal-card{background:white;border:1px solid #e3e8f2;border-radius:16px;padding:19px;box-shadow:0 5px 18px #1b2b4508}.meal-title{display:flex;align-items:center;gap:10px;margin:0 0 12px;color:#111827}.meal-title i{font-style:normal;background:#fff0f3;color:#ff304f;border-radius:10px;padding:8px}.meal-card table{width:100%;border-collapse:collapse;font-size:12px;color:#334155}.meal-card th{font-size:9px;letter-spacing:.5px;text-transform:uppercase;color:#718096;background:#f8fafc;text-align:left;padding:8px 6px}.meal-card td{padding:9px 6px;border-top:1px solid #e8edf4;vertical-align:top}.meal-card td:nth-child(2){font-weight:750;white-space:nowrap}.meal-card td:nth-child(3){color:#64748b}.meal-tag{display:inline-block;background:#f1f5f9;color:#64748b;padding:5px 8px;border-radius:7px;font-size:10px;font-weight:800;margin-bottom:10px}.meal-card .meal-note{color:#7c8799;font-size:12px;margin-top:10px}.meal-sub-btn{margin-top:12px;border:1px solid #ffd1da;background:#fff5f7;color:#d91e42;padding:8px 11px;border-radius:9px;font-size:12px;font-weight:800;cursor:pointer}.meal-subs{margin-top:9px;background:#fff8fa;border:1px solid #ffe0e7;border-radius:10px;padding:11px;color:#475569;font-size:12px;line-height:1.6}.meal-subs small{display:block;color:#8b96a8;margin-top:5px}.food-tip{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:12px;padding:13px;font-size:13px;line-height:1.6;margin-top:15px}.food-empty{padding:22px;background:white;border-radius:14px;color:#64748b}.food-foot{padding:14px 22px;border-top:1px solid #e5eaf2;background:white;display:flex;justify-content:flex-end}.food-print{border:1px solid #d8deea;background:white;padding:10px 15px;border-radius:10px;font-weight:700;cursor:pointer}
@media(max-width:1100px){.diet-micro{grid-template-columns:repeat(4,minmax(0,1fr))}}\n@media(max-width:700px){.diet-micro{grid-template-columns:repeat(2,minmax(0,1fr))}.diet-hero{padding:18px}.food-modal{padding:8px}.food-dialog{max-height:96vh;border-radius:16px}.food-head,.food-body{padding:16px}.meal-grid{grid-template-columns:1fr}}
@media print{.food-modal{position:static;background:white;padding:0}.food-dialog{max-height:none;box-shadow:none}.food-head{background:white;color:#111}.food-close,.food-foot{display:none}}
</style>`;
function mealEmoji(name){const n=String(name||'').toLowerCase();return /café|manha/.test(n)?'☕':/lanche/.test(n)?'🍎':/almoço/.test(n)?'🍛':/jantar/.test(n)?'🍽️':/ceia/.test(n)?'🌙':'🥗'}
function foodRow(x){
 let obj=x&&typeof x==='object'?x:{};
 let food=String(obj.name||obj.food||obj.item||obj.description||x||'').trim();
 let qty=String(obj.quantity||obj.qty||obj.amount||obj.grams||obj.weight||'').trim();
 let unit=String(obj.unit||obj.measure||obj.measurement||obj.household_measure||'').trim();
 if(typeof x==='string'&&x.includes('—')){const parts=x.split(/\s*—\s*/);food=(parts[0]||'').trim();if(!qty)qty=(parts[1]||'').trim();if(!unit)unit=(parts.slice(2).join(' — ')||'').trim();}
 const match=food.match(/^(.*?)\s*\(([^()]*)\)\s*$/);if(match){food=match[1].trim();if(!qty)qty=match[2].trim();}
 if(!qty){const q=food.match(/\b(\d+(?:[,.]\d+)?\s*(?:g|kg|ml|l|un(?:idade)?s?|ovos?|fatias?|colheres?|conchas?|potes?|copos?))\b/i);if(q){qty=q[1];food=food.replace(q[0],'').trim();}}
 if(unit){const normalized=unit.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');food=food.replace(new RegExp('\\s*[—–-]?\\s*'+normalized+'\\s*$','i'),'').trim();}
 food=food.replace(/\s*[—–-]\s*$/,'').trim();
 return {food:food||'Alimento',qty:qty||'Porção não informada',unit:unit||'—'}
}
function mealSubs(meal){
 const explicit=meal.substitutions||meal.alternatives||meal.swaps;
 if(Array.isArray(explicit)&&explicit.length)return explicit.map(v=>typeof v==='string'?v:(v.text||v.name||JSON.stringify(v))).join(' · ');
 if(typeof explicit==='string'&&explicit.trim())return explicit;
 const perItem=(meal.items||[]).map(raw=>raw&&typeof raw==='object'?(raw.substitutions||raw.alternatives||raw.swaps||''):'').filter(Boolean);
 return perItem.length?perItem.join(' · '):'';
}
function mealsHTML(){
 const meals=(data.current?.meals||[]).filter(m=>{const n=String(m.meal_name||'').trim();const prefix=n.match(/^Dia\s*(\d+)\s*[·–—-]/i);const suffix=n.match(/[·–—-]\s*Dia\s*(\d+)\s*$/i);return prefix?Number(prefix[1])===day+1:suffix?Number(suffix[1])===day+1:day===0;});
 if(!meals.length)return '<div class="food-empty">Não há refeições cadastradas para este dia.</div>';
 return '<div class="meal-grid">'+meals.map((m,i)=>{
  const items=(m.items||[]).map(foodRow),subs=mealSubs(m);
  const key='subs-'+day+'-'+i;
  return '<article class="meal-card"><span class="meal-tag">'+mealEmoji(m.meal_name)+' REFEIÇÃO '+(i+1)+'</span><h3 class="meal-title"><i>'+mealEmoji(m.meal_name)+'</i>'+esc(String(m.meal_name||'Refeição '+(i+1)).replace(/^Dia \d+\s*[·-]\s*/,'') )+'</h3><table><thead><tr><th>Alimento</th><th>Quantidade</th><th>Medida prática</th></tr></thead><tbody>'+items.map(x=>'<tr><td>'+esc(x.food)+'</td><td>'+esc(x.qty)+'</td><td>'+esc(x.unit)+'</td></tr>').join('')+'</tbody></table>'+(m.notes?'<p class="meal-note">'+esc(m.notes)+'</p>':'')+(subs?'<button class="meal-sub-btn" data-subs="'+key+'">🔄 Substituições</button><div class="meal-subs" id="'+key+'" hidden>'+esc(subs)+'<small>Confira equivalência de porções antes de substituir.</small></div>':'')+'</article>';
 }).join('')+'</div>';
}
function openDiet(){const m=document.createElement('div');m.className='food-modal';const g=data.current;const title=String(g.goal||'').split('|')[0];m.innerHTML='<section class="food-dialog" role="dialog" aria-modal="true"><header class="food-head"><div><small>R-FIT · PLANO ALIMENTAR</small><h2>'+esc(g.title)+'</h2><span>'+esc(title)+'</span></div><button class="food-close" aria-label="Fechar">✕</button></header><div class="food-body"><div class="menu-tabs"><button class="menu-tab active" data-day="0">Dia 1</button><button class="menu-tab" data-day="1">Dia 2</button><button class="menu-tab" data-day="2">Dia 3</button><button class="menu-tab" data-menu="orient">Orientações</button></div><div id="menu-content">'+mealsHTML()+'</div></div><footer class="food-foot"><button class="food-print">🖨 Imprimir plano</button></footer></section>';document.body.append(m);const close=()=>m.remove();m.querySelector('.food-close').onclick=close;m.onclick=e=>{if(e.target===m)close()};m.querySelector('.food-print').onclick=()=>window.print();m.querySelector('#menu-content').addEventListener('click',e=>{const b=e.target.closest('[data-subs]');if(!b)return;const panel=m.querySelector('#'+b.dataset.subs);panel.hidden=!panel.hidden;b.textContent=panel.hidden?'🔄 Substituições':'✕ Fechar substituições'});m.querySelectorAll('[data-day]').forEach(btn=>btn.onclick=()=>{day=Number(btn.dataset.day);m.querySelectorAll('[data-day],[data-menu]').forEach(x=>x.classList.toggle('active',x===btn));m.querySelector('#menu-content').innerHTML=mealsHTML()});m.querySelector('[data-menu="orient"]').onclick=()=>{const btn=m.querySelector('[data-menu="orient"]');m.querySelectorAll('[data-day],[data-menu]').forEach(x=>x.classList.toggle('active',x===btn));m.querySelector('#menu-content').innerHTML='<div class="food-tip">'+esc(g.goal||'Priorize variedade, hidratação e acompanhamento profissional. Não substitua orientação individual por estimativas automáticas.')+'</div>'};}
async function load(){
  const box=$('#diet-content');
  const response=await fetch('/api/student/diets',{credentials:'same-origin',cache:'no-store'});
  data=await response.json();
  if(!response.ok||!data.ok) throw Error('Não foi possível carregar suas fichas.');
  if(data.locked){
    const reason=data.reason==='anamnesis_required'?'Complete sua anamnese':data.reason==='expired'?'Plano vencido':'Recurso não incluído no plano';
    const message=data.reason==='anamnesis_required'?'Preencha sua anamnese no Meu painel para liberar sua dieta.':data.reason==='expired'?'Renove seu plano para voltar a acessar sua dieta.':'Faça upgrade para liberar a nutrição.';
    box.innerHTML='<h3>🔒 '+esc(reason)+'</h3><p>'+esc(message)+'</p><a class="primary-button" href="/student/pages/portal/plan/index.html">Ver meu plano</a>';
    return;
  }
  const g=data.current;
  if(!g){box.innerHTML='<div class="food-empty">Seu professor ainda não publicou uma dieta.</div>';return;}

let latestWeight = 0;
try {
  const response = await fetch('/api/student/measurements', { credentials: 'same-origin', cache: 'no-store' });
  if (response.ok) {
    const payload = await response.json();
    const records = (payload.measurements || payload.data || []).filter(item => Number(item.weight_kg || item.weight) > 0);
    records.sort((a, b) => new Date(b.measured_at || b.created_at || 0) - new Date(a.measured_at || a.created_at || 0));
    latestWeight = Number(records[0]?.weight_kg || records[0]?.weight || 0);
  }
} catch (error) { console.warn('Peso não carregado:', error); }
// Estimativa dos macros a partir dos alimentos e porções cadastrados.
const foodBase={
 'arroz branco cozido':[2.5,28,0.3,130],'arroz integral':[2.6,25,1,123],'batata-doce':[1.3,20,0.1,86],'batata inglesa':[1.9,17,0.1, 77],
 'macarrão cozido':[5,25,1.1,131],'aveia':[13,66,7,389],'pão francês':[8,57,3,300],'pão integral':[10,43,4,250],'tapioca':[0,25,0,100],
 'banana':[1.1,23,0.3,89],'maçã':[0.3,14,0.2,52],'mamão':[0.5,11,0.1,43],'morango':[0.7,8,0.3,32],'laranja':[0.9,12,0.1,47],'abacate':[2,9,15,160],
 'frango grelhado':[31,0,3.6,165],'patinho magro':[27,0,7,170],'carne moída magra':[26,0,8,180],'tilápia':[26,0,2.7,128],'atum em água':[25,0,1,116],'ovo':[13,1,10,143],'clara de ovo':[11,0.7,0.2,52],
 'iogurte natural':[4,5,3,60],'whey protein':[80,8,5,390],'cottage':[12,3,4,98],'leite desnatado':[3.4,5,0.1,34],'feijão':[5,14,0.5,76],'lentilha':[6.3,16,0.4,93],'grão-de-bico':[8.9,27,2.6,164],
 'brócolis':[2.8,7,0.4,34],'cenoura':[0.9,10,0.2,41],'alface':[1.4,2.9,0.2,15],'tomate':[0.9,3.9,0.2,18],'pepino':[0.7,3.6,0.1,15],'abobrinha':[1.2,3.1,0.3,17],
 'azeite':[0,0,100,884],'pasta de amendoim':[25,20,50,588],'castanhas':[20,20,55,607]
};
const sums={p:0,c:0,f:0,k:0};
(g.meals||[]).forEach(meal=>(meal.items||[]).forEach(raw=>{
 const line=typeof raw==='string'?raw:String(raw?.name||raw?.food||'');
 const name=line.split(/\\s*[—–-]\\s*/)[0].trim().toLowerCase();
 const key=Object.keys(foodBase).find(k=>name.includes(k));if(!key)return;
 const qtyPart=line.split(/\\s*[—–-]\\s*/)[1]||String(raw?.qty||raw?.quantity||'100');
 const n=Number((qtyPart.match(/[0-9]+(?:[,.][0-9]+)?/)||[])[0]?.replace(',','.'))||100;
 const unit=qtyPart.toLowerCase();let grams=n;
 if(/unidade|\\bun\\b|ovo|fatia|lata/.test(unit)){if(/banana/.test(key)||/maçã|laranja/.test(key))grams=n*100;else if(/ovo/.test(key))grams=n*50;else if(/fatia/.test(unit))grams=n*25;else if(/lata/.test(unit))grams=n*120;else grams=n*50;}
 if(/ml|\\bl\\b/.test(unit))grams=n*(unit.includes('l')&&!unit.includes('ml')?1000:1);
 const v=foodBase[key],factor=grams/100;sums.p+=v[0]*factor;sums.c+=v[1]*factor;sums.f+=v[2]*factor;sums.k+=v[3]*factor;
}));
const protein=Number(g.protein)||Math.round(sums.p);
const carbs=Number(g.carbs)||Math.round(sums.c);
const fats=Number(g.fats)||Math.round(sums.f);
const kcal=Number(g.calories_target||g.kcal||g.calories)||Math.round(sums.k)||Math.round(protein*4+carbs*4+fats*9);
const fiber = kcal ? Math.round(kcal * 14 / 1000) : '—';
const weight = Number(latestWeight || g.weight || data.student?.weight || data.profile?.weight || data.student?.weight_kg) || 0;
const water = weight ? (weight * 35 / 1000).toFixed(1).replace('.', ',') + ' L' : '—';
const creatine = weight ? (weight * .03).toFixed(1).replace('.', ',') + ' g' : '—';
box.innerHTML='<div class="diet-dashboard"><section class="diet-hero"><div class="diet-head"><div><span class="diet-kicker">PRESCRIÇÃO NUTRICIONAL</span><h3>'+esc(g.title||'Plano alimentar R-Fit')+'</h3><p>'+esc(String(g.goal||'Plano individual').split('|')[0])+'</p></div><button class="diet-open">🍽️ Ver refeições e porções <span>→</span></button></div><div class="diet-micro"><article><span class="micro-icon">🔥</span><strong>'+esc(kcal||'—')+'</strong><small>kcal / dia</small></article><article><span class="micro-icon">🥩</span><strong>'+esc(protein||'—')+' g</strong><small>Proteínas</small></article><article><span class="micro-icon">🍚</span><strong>'+esc(carbs||'—')+' g</strong><small>Carboidratos</small></article><article><span class="micro-icon">🥑</span><strong>'+esc(fats||'—')+' g</strong><small>Gorduras</small></article><article><span class="micro-icon">🌾</span><strong>'+esc(fiber)+' g</strong><small>Fibra estimada</small></article><article><span class="micro-icon">💧</span><strong>'+esc(water)+'</strong><small>Água · '+(weight?esc(weight)+' kg':'peso ausente')+'</small></article><article><span class="micro-icon">🧂</span><strong>1,5–2,3 g</strong><small>Sódio/dia · referência</small></article><article><span class="micro-icon">💪</span><strong>'+esc(creatine)+'</strong><small>Creatina estimada* </small></article></div><p class="diet-note">*Fibra calculada por 14 g/1.000 kcal; água estimada em 35 ml/kg e creatina em 0,03 g/kg somente se o peso estiver disponível. São referências gerais, não prescrição. Sódio exibido como faixa de referência; individualização com nutricionista.</p></section>'+((data.history||[]).length?'<section class="diet-history"><h3>📚 Histórico de dietas <small>('+data.history.length+')</small></h3>'+(data.history||[]).map(x=>'<details><summary>'+esc(x.title||'Plano anterior')+' · '+esc(x.created_at?new Date(x.created_at).toLocaleDateString('pt-BR'):'')+'</summary><p>'+esc(x.goal||'')+'</p></details>').join('')+'</section>':'')+'</div>';box.querySelector('.diet-open')?.addEventListener('click',openDiet);}
document.addEventListener('DOMContentLoaded',async()=>{document.head.insertAdjacentHTML('beforeend',css);try{const u=await getCurrentUser();if(u.user.role!=='student'){location.replace('/professor/');return;}$('#student-welcome').textContent='Olá, '+(u.user.name||u.user.email)+'.';await load();}catch(e){$('#page-message').textContent=e.message;}$('#logout')?.addEventListener('click',async function(){this.disabled=true;try{await logout()}finally{location.replace('/student/pages/login.html')}});});
