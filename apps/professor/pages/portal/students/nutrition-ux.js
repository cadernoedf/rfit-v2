/* R-Fit Nutrition Studio — UX layer (progressive enhancement) */
(() => {
  const css = `
  .diet-studio .diet-meal-editor{position:relative}
  .diet-studio .nutrition-meal-toolbar{display:flex;justify-content:flex-end;align-items:center;margin:0 0 8px;position:relative}
  .diet-studio .nutrition-meal-toolbar .nm-menu-trigger{width:auto!important;min-height:34px!important;padding:5px 10px!important;border:1px solid #dbe3ef!important;background:#f8faff!important;color:#53627a!important;border-radius:8px!important;font-size:13px!important}
  .diet-studio .nutrition-meal-toolbar .nm-menu{position:absolute;right:0;top:38px;z-index:20;display:none;min-width:180px;padding:6px;background:#fff;border:1px solid #dbe3ef;border-radius:10px;box-shadow:0 10px 30px #17203320}
  .diet-studio .nutrition-meal-toolbar.open .nm-menu{display:grid;gap:3px}
  .diet-studio .nutrition-meal-toolbar .nm-menu button{width:100%!important;min-height:34px!important;padding:7px 10px!important;text-align:left;border:0!important;background:#fff!important;color:#34435a!important;border-radius:7px!important;font-size:13px!important}
  .diet-studio .nutrition-meal-toolbar .nm-menu button:hover{background:#fff1f3!important;color:#c51d3b!important}
  .diet-studio .nutrition-meal-toolbar .nm-menu .nm-fav.saved{color:#bd1738!important;background:#fff1f3!important}
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
    const trigger=document.createElement('button');trigger.type='button';trigger.className='nm-menu-trigger';trigger.textContent='⋯ Opções';
    const menu=document.createElement('div');menu.className='nm-menu';
    const action=(label)=>{const x=document.createElement('button');x.type='button';x.textContent=label;menu.append(x);return x;};
    const up=action('↑ Mover para cima'),down=action('↓ Mover para baixo'),copy=action('⧉ Duplicar refeição'),loadFav=action('＋ Inserir favorita'),fav=action('☆ Salvar como favorita');fav.className='nm-fav';
    trigger.onclick=()=>toolbar.classList.toggle('open');toolbar.append(trigger,menu);card.prepend(toolbar);
    document.addEventListener('click',e=>{if(!toolbar.contains(e.target))toolbar.classList.remove('open');});
    up.onclick=()=>{const p=card.previousElementSibling;if(p?.classList.contains('diet-meal-editor'))p.before(card);toolbar.classList.remove('open');};
    down.onclick=()=>{const n=card.nextElementSibling;if(n?.classList.contains('diet-meal-editor'))n.after(card);toolbar.classList.remove('open');};
    copy.onclick=()=>{toolbar.classList.remove('open');const add=document.querySelector('#add-diet-meal');if(!add)return;add.click();const clone=document.querySelector('#diet-meals .diet-meal-editor:last-child');if(!clone||clone===card)return;const src=card.querySelector('[data-field=name]'),dst=clone.querySelector('[data-field=name]');if(src&&dst)dst.value=(src.value||'Refeição')+' (cópia)';const rows=[...card.querySelectorAll('.diet-food-row')];rows.forEach((r,i)=>{if(i)clone.querySelector('.diet-add-food')?.click();const d=clone.querySelectorAll('.diet-food-row')[i];if(!d)return;['name','qty','unit'].forEach(k=>{const a=r.querySelector('[data-food='+k+']'),b=d.querySelector('[data-food='+k+']');if(a&&b)b.value=a.value;});});clone.scrollIntoView({behavior:'smooth',block:'center'});clone.querySelector('[data-field=name]')?.focus();};
    loadFav.onclick=()=>{toolbar.classList.remove('open');let all=[];try{all=JSON.parse(localStorage.getItem('rfit-favorite-meals')||'[]')}catch{}if(!all.length){alert('Você ainda não salvou refeições favoritas.');return;}const choice=prompt('Digite o número da refeição favorita:\\n'+all.map((x,i)=>(i+1)+'. '+x.name).join('\\n'));const item=all[Number(choice)-1];if(!item)return;card.querySelector('[data-field=name]').value=item.name;const addBtn=card.querySelector('.diet-add-food');item.items.forEach((food,i)=>{if(i)addBtn?.click();const row=card.querySelectorAll('.diet-food-row')[i];if(!row)return;row.querySelector('[data-food=name]').value=food.name;row.querySelector('[data-food=qty]').value=food.qty;const unit=row.querySelector('[data-food=unit]');if([...unit.options].some(o=>o.value===food.unit))unit.value=food.unit;});};
    fav.onclick=()=>{toolbar.classList.remove('open');const name=card.querySelector('[data-field=name]')?.value.trim()||'Refeição favorita';const items=[...card.querySelectorAll('.diet-food-row')].map(r=>({name:r.querySelector('[data-food=name]')?.value||'',qty:r.querySelector('[data-food=qty]')?.value||'100',unit:r.querySelector('[data-food=unit]')?.value||'g'})).filter(x=>x.name.trim());if(!items.length){alert('Adicione alimentos antes de favoritar.');return;}let all=[];try{all=JSON.parse(localStorage.getItem('rfit-favorite-meals')||'[]')}catch{}all.unshift({id:Date.now(),name,items});localStorage.setItem('rfit-favorite-meals',JSON.stringify(all.slice(0,100)));fav.textContent='★ Favorita salva';fav.classList.add('saved');fav.disabled=true;};
  }
  const redesignCSS=`
  .diet-studio .diet-meal-editor{padding:14px!important;border:1px solid #e3e8f0!important;background:#fff!important;border-radius:13px!important;box-shadow:0 3px 12px #17203308!important}
  .diet-studio .diet-meal-editor:before{content:none!important}
  .diet-studio .nutrition-meal-toolbar{margin:0 0 5px!important}
  .diet-studio .nutrition-meal-toolbar .nm-menu-trigger{font-size:12px!important;min-height:30px!important;padding:4px 9px!important}
  .diet-studio .diet-meal-editor [data-field=name]{font-size:15px!important;min-height:40px!important;background:#f8fafc!important}
  .diet-studio .diet-food-row{gap:7px!important;margin:0!important;padding:8px!important;border:1px solid #edf0f5!important;border-radius:9px!important;background:#fbfcfe!important}
  .diet-studio .diet-food-row input,.diet-studio .diet-food-row select{min-height:36px!important;padding:7px!important;font-size:13px!important}
  .diet-studio .diet-studio-body{padding:16px!important;gap:11px!important}
  .diet-studio .diet-studio-import{padding:9px 12px!important;border-radius:10px!important}
  .diet-studio .diet-studio-actions{padding:9px 14px!important}
  .diet-studio .diet-studio-actions button{min-height:40px!important}
  .diet-studio .diet-meal-nav{display:flex;gap:6px;flex-wrap:wrap;padding:2px 0 9px}
  .diet-studio .diet-meal-nav button{border:1px solid #dce3ee;background:#fff;color:#536079;border-radius:8px;padding:7px 10px;font-size:12px;font-weight:700;cursor:pointer}
  .diet-studio .diet-meal-nav button.active{background:#e51f42;color:#fff;border-color:#e51f42}
  @media(max-width:760px){.diet-studio .diet-meal-editor{padding:10px!important}.diet-studio .diet-meal-nav button{flex:1}}
  `;const rs=document.createElement('style');rs.textContent=redesignCSS;document.head.append(rs);
  function boot(){
    const meals=document.querySelector('#diet-meals');if(!meals||meals.dataset.nutritionUx)return;meals.dataset.nutritionUx='1';
    const scan=()=>meals.querySelectorAll('.diet-meal-editor').forEach(enhanceMeal);
    scan();
    const form=meals.closest('.detail-form');
    if(form&&!form.querySelector('.diet-meal-nav')){
      const nav=document.createElement('nav');nav.className='diet-meal-nav';meals.before(nav);
      const refresh=()=>{const cards=[...meals.querySelectorAll('.diet-meal-editor')];nav.replaceChildren();const all=document.createElement('button');all.textContent='Todas';all.classList.add('active');nav.append(all);all.onclick=()=>{nav.querySelectorAll('button').forEach(b=>b.classList.remove('active'));all.classList.add('active');cards.forEach(card=>card.hidden=false);};cards.forEach((card,i)=>{const b=document.createElement('button');b.textContent=card.querySelector('[data-field=name]')?.value||'Refeição '+(i+1);b.onclick=()=>{nav.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');cards.forEach(x=>x.hidden=x!==card);card.hidden=false;};nav.append(b);});};
      refresh();new MutationObserver(refresh).observe(meals,{childList:true,subtree:true});
    }
    new MutationObserver(scan).observe(meals,{childList:true});
  }
  new MutationObserver(()=>{if(document.querySelector('.diet-studio.is-open,#diet-form'))boot();}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',boot);setTimeout(boot,400);
})();