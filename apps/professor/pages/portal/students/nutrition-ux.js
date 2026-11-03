/* R-Fit Nutrition Studio — UX layer (progressive enhancement) */
(() => {
  const css = `
  .diet-studio .diet-meal-editor{position:relative}
  .diet-studio .nutrition-meal-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 4px}
  .diet-studio .nutrition-meal-toolbar button{border:1px solid #dbe3ef;background:#f8faff;color:#34435a;border-radius:9px;padding:8px 11px;font-weight:700;cursor:pointer}
  .diet-studio .nutrition-meal-toolbar button:hover{border-color:#e11d48;color:#c51d3b}
  .diet-studio .nutrition-meal-toolbar .nm-fav{margin-left:auto}
  .diet-studio .nutrition-meal-toolbar .nm-fav.saved{background:#fff1f3;color:#bd1738;border-color:#f4c3ce}
  .diet-studio .diet-meal-editor .diet-meal-macro{display:flex;gap:8px;flex-wrap:wrap;padding:10px 12px;background:#f1f6ff;border:1px solid #e0e9f7;border-radius:10px;color:#53627a;font-size:12px}
  .diet-studio .diet-meal-editor .diet-meal-macro b{color:#c51d3b}
  .diet-studio .diet-library-panel .diet-library-card{box-shadow:0 4px 14px #17203308}
  .diet-studio .diet-library-panel .diet-library-card button{min-height:38px}
  .diet-studio .diet-food-option:has(input:checked){background:#fff0f3;border-color:#e11d48}
  .diet-studio .diet-food-option input{accent-color:#d7193f}
  .diet-studio .diet-studio-tools{position:sticky;top:0;z-index:1;background:#f4f6fb;padding:8px 0}
  @media(max-width:650px){.diet-studio .nutrition-meal-toolbar .nm-fav{margin-left:0}.diet-studio .nutrition-meal-toolbar button{flex:1}}
  `;
  const style=document.createElement('style');style.textContent=css;document.head.append(style);
  const num=v=>Number(String(v||'0').replace(',','.'))||0;
  const escapeHTML=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function enhanceMeal(card){
    if(card.dataset.nutritionEnhanced)return;card.dataset.nutritionEnhanced='1';
    const toolbar=document.createElement('div');toolbar.className='nutrition-meal-toolbar';
    const up=document.createElement('button');up.type='button';up.textContent='↑ Subir';up.title='Mover refeição para cima';
    const down=document.createElement('button');down.type='button';down.textContent='↓ Descer';down.title='Mover refeição para baixo';
    const copy=document.createElement('button');copy.type='button';copy.textContent='⧉ Duplicar';
    const fav=document.createElement('button');fav.type='button';fav.className='nm-fav';fav.textContent='☆ Favoritar';
    toolbar.append(up,down,copy,fav);card.prepend(toolbar);
    up.onclick=()=>{const p=card.previousElementSibling;if(p?.classList.contains('diet-meal-editor'))p.before(card);};
    down.onclick=()=>{const n=card.nextElementSibling;if(n?.classList.contains('diet-meal-editor'))n.after(card);};
    copy.onclick=()=>{const add=document.querySelector('#add-diet-meal');if(!add)return;add.click();const clone=document.querySelector('#diet-meals .diet-meal-editor:last-child');if(!clone||clone===card)return;const src=card.querySelector('[data-field=name]'),dst=clone.querySelector('[data-field=name]');if(src&&dst)dst.value=(src.value||'Refeição')+' (cópia)';const rows=[...card.querySelectorAll('.diet-food-row')];rows.forEach((r,i)=>{if(i)clone.querySelector('.diet-add-food')?.click();const d=clone.querySelectorAll('.diet-food-row')[i];if(!d)return;['name','qty','unit'].forEach(k=>{const a=r.querySelector('[data-food='+k+']'),b=d.querySelector('[data-food='+k+']');if(a&&b)b.value=a.value;});});clone.scrollIntoView({behavior:'smooth',block:'center'});clone.querySelector('[data-field=name]')?.focus();};
    fav.onclick=()=>{const name=card.querySelector('[data-field=name]')?.value.trim()||'Refeição favorita';const items=[...card.querySelectorAll('.diet-food-row')].map(r=>({name:r.querySelector('[data-food=name]')?.value||'',qty:r.querySelector('[data-food=qty]')?.value||'100',unit:r.querySelector('[data-food=unit]')?.value||'g'})).filter(x=>x.name.trim());if(!items.length){alert('Adicione alimentos antes de favoritar.');return;}let all=[];try{all=JSON.parse(localStorage.getItem('rfit-favorite-meals')||'[]')}catch{}all.unshift({id:Date.now(),name,items});localStorage.setItem('rfit-favorite-meals',JSON.stringify(all.slice(0,100)));fav.textContent='★ Favorita salva';fav.classList.add('saved');fav.disabled=true;};
  }
  function boot(){
    const meals=document.querySelector('#diet-meals');if(!meals||meals.dataset.nutritionUx)return;meals.dataset.nutritionUx='1';
    const scan=()=>meals.querySelectorAll('.diet-meal-editor').forEach(enhanceMeal);
    scan();new MutationObserver(scan).observe(meals,{childList:true});
  }
  new MutationObserver(()=>{if(document.querySelector('.diet-studio.is-open,#diet-form'))boot();}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',boot);setTimeout(boot,400);
})();