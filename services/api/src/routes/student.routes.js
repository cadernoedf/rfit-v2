/* R-Fit V2 | catálogo de planos e anamnese do aluno. */
import { getSession } from './auth.routes.js';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const reply=(data,status=200)=>Response.json(data,{status,headers});

export async function studentRoutes(request, env, url) {
  /* ===== CENTRAL DE NOTIFICAÇÕES DO ALUNO ===== */
  if (url.pathname === '/api/student/notifications' || /^\/api\/student\/notifications\/[^/]+\/read$/.test(url.pathname) || url.pathname === '/api/student/notifications/read-all') {
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    try{
      if(url.pathname==='/api/student/notifications'&&request.method==='GET'){
        const sub=await env.RFIT_DB.prepare("SELECT id,expires_at,lifetime,status FROM subscriptions WHERE user_id=? ORDER BY created_at DESC LIMIT 1").bind(session.sub).first();
        if(sub&&sub.status==='active'&&!Number(sub.lifetime)&&sub.expires_at){
          const expiry=new Date(sub.expires_at),days=Math.ceil((expiry-new Date())/86400000);
          if(Number.isFinite(expiry.getTime())&&days>=0&&days<=7){
            const title='Seu plano está próximo do vencimento';
            const message=days===0?'Seu plano vence hoje. Fale com seu personal para renovar o acesso.':'Seu plano vence em '+days+' '+(days===1?'dia':'dias')+'. Fale com seu personal para renovar o acesso.';
            await env.RFIT_DB.prepare("INSERT OR IGNORE INTO notifications(id,user_id,channel,template_code,payload_json,status,sent_at,dedupe_key) VALUES(?,?,'in_app','plan_expiring',?,'sent',CURRENT_TIMESTAMP,?)").bind(crypto.randomUUID(),session.sub,JSON.stringify({title,message,url:'/student/pages/portal/settings/index.html'}),'plan-expiry:'+sub.id+':'+String(sub.expires_at).slice(0,10)).run();
          }
        }
        const rows=await env.RFIT_DB.prepare("SELECT id,template_code,payload_json,created_at,read_at FROM notifications WHERE user_id=? AND channel='in_app' AND status='sent' ORDER BY created_at DESC LIMIT 30").bind(session.sub).all();
        const notifications=(rows.results||[]).map(row=>{let payload={};try{payload=JSON.parse(row.payload_json||'{}')}catch{}return {id:row.id,type:row.template_code,title:payload.title||'Aviso do R-Fit',message:payload.message||'',url:payload.url||'',created_at:row.created_at,read_at:row.read_at,is_read:Boolean(row.read_at)}});
        return reply({ok:true,notifications,unread_count:notifications.filter(n=>!n.is_read).length});
      }
      if(url.pathname==='/api/student/notifications/read-all'&&request.method==='POST'){
        await env.RFIT_DB.prepare("UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE user_id=? AND channel='in_app' AND status='sent' AND read_at IS NULL").bind(session.sub).run();
        return reply({ok:true});
      }
      const match=url.pathname.match(/^\/api\/student\/notifications\/([^/]+)\/read$/);
      if(match&&request.method==='POST'){
        const result=await env.RFIT_DB.prepare("UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE id=? AND user_id=? AND channel='in_app' AND status='sent'").bind(decodeURIComponent(match[1]),session.sub).run();
        if(!result.meta?.changes)return reply({ok:false,error:'notification_not_found'},404);
        return reply({ok:true});
      }
      return reply({ok:false,error:'method_not_allowed'},405);
    }catch(error){console.error('student_notifications_failed',error?.message||'unknown');return reply({ok:false,error:'notifications_unavailable'},503);}
  }
  /* ===== CONFIGURAÇÃO PÚBLICA DA TELA DE LOGIN ===== */
  if (url.pathname === '/api/public/portal-config' && request.method === 'GET') {
    try {
      const rows=await env.RFIT_DB.prepare("SELECT setting_key,setting_value FROM portal_settings WHERE setting_key IN ('consultancy_name','login_title','login_message','login_top_students','registration_enabled')").all();
      const settings=Object.fromEntries((rows.results||[]).map(row=>[row.setting_key,row.setting_value]));
      let topStudents=[];
      try {
        const ids=JSON.parse(settings.login_top_students||'[]');
        if(Array.isArray(ids)&&ids.length){
          const valid=ids.filter(id=>typeof id==='string').slice(0,5);
          if(valid.length){const marks=valid.map(()=>'?').join(',');const result=await env.RFIT_DB.prepare(`SELECT id,full_name,avatar_url FROM users WHERE role='student' AND status='active' AND id IN (${marks})`).bind(...valid).all();const byId=new Map((result.results||[]).map(student=>[student.id,student]));topStudents=valid.map(id=>byId.get(id)).filter(Boolean);}
        }
      } catch {}
      return reply({ok:true,settings:{consultancy_name:settings.consultancy_name||'R-Fit',login_title:settings.login_title||'Seu próximo nível começa aqui.',login_message:settings.login_message||'Entre para acessar seu espaço no R-Fit.',registration_enabled:settings.registration_enabled!=='false'},top_students:topStudents});
    } catch(error){console.error('public_portal_config_failed',error?.message||'unknown');return reply({ok:false,error:'portal_config_unavailable'},503);}
  }

  /* ===== AVISOS PRIVADOS DO ALUNO ===== */
  if (url.pathname === '/api/student/announcements') {
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    try {
      if(request.method==='GET'){
        const rows=await env.RFIT_DB.prepare(`SELECT a.id,a.title,a.message,a.starts_at,a.ends_at,a.require_acknowledgement,a.created_at,
          r.read_at FROM portal_announcements a LEFT JOIN announcement_reads r ON r.announcement_id=a.id AND r.user_id=?
          WHERE a.is_active=1 AND (a.starts_at IS NULL OR datetime(a.starts_at)<=CURRENT_TIMESTAMP)
          AND (a.ends_at IS NULL OR datetime(a.ends_at)>=CURRENT_TIMESTAMP)
          ORDER BY a.created_at DESC LIMIT 100`).bind(session.sub).all();
        const announcements=(rows.results||[]).filter(item=>!item.read_at).filter(item=>{
          return true;
        });
        const details=await env.RFIT_DB.prepare("SELECT id,target_user_ids_json,audience FROM portal_announcements WHERE is_active=1 AND (starts_at IS NULL OR datetime(starts_at)<=CURRENT_TIMESTAMP) AND (ends_at IS NULL OR datetime(ends_at)>=CURRENT_TIMESTAMP)").all();
        const allowed=new Set((details.results||[]).filter(item=>item.audience==='all'||(()=>{try{return JSON.parse(item.target_user_ids_json||'[]').includes(session.sub)}catch{return false}})()).map(item=>item.id));
        return reply({ok:true,announcements:announcements.filter(item=>allowed.has(item.id))});
      }
      const match=url.pathname.match(/^\/api\/student\/announcements\/([^/]+)\/read$/);
      if(request.method==='POST'&&match){
        const id=decodeURIComponent(match[1]);
        const exists=await env.RFIT_DB.prepare("SELECT id,audience,target_user_ids_json FROM portal_announcements WHERE id=? AND is_active=1").bind(id).first();
        let allowed=exists?.audience==='all';
        if(exists?.audience==='selected'){try{allowed=JSON.parse(exists.target_user_ids_json||'[]').includes(session.sub)}catch{allowed=false}}
        if(!exists||!allowed)return reply({ok:false,error:'announcement_not_found'},404);
        await env.RFIT_DB.prepare('INSERT OR IGNORE INTO announcement_reads(announcement_id,user_id) VALUES(?,?)').bind(id,session.sub).run();
        return reply({ok:true});
      }
      return reply({ok:false,error:'method_not_allowed'},405);
    } catch(error){console.error('student_announcements_failed',error?.message||'unknown');return reply({ok:false,error:'announcements_unavailable'},503);}
  }

  if (url.pathname === '/api/student/support/messages') {
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    try {
      if(request.method==='GET'){
        await env.RFIT_DB.prepare("UPDATE support_messages SET read_at=CURRENT_TIMESTAMP WHERE student_user_id=? AND sender_role IN ('professor','admin') AND read_at IS NULL").bind(session.sub).run();
        const [rows,student,professor]=await Promise.all([
          env.RFIT_DB.prepare("SELECT id,sender_role,body,created_at,read_at FROM support_messages WHERE student_user_id=? ORDER BY created_at ASC,id ASC LIMIT 300").bind(session.sub).all(),
          env.RFIT_DB.prepare("SELECT full_name,avatar_url FROM users WHERE id=? AND role='student' LIMIT 1").bind(session.sub).first(),
          env.RFIT_DB.prepare("SELECT full_name,avatar_url FROM users WHERE role IN ('professor','admin') AND status='active' ORDER BY CASE role WHEN 'professor' THEN 0 ELSE 1 END LIMIT 1").first()
        ]);
        return reply({ok:true,student:student||{full_name:session.name||'Aluno',avatar_url:null},professor:professor||{full_name:'Professor R-Fit',avatar_url:null},messages:rows.results||[]});
      }
      if(request.method==='POST'){
        const body=await request.json(), message=String(body.message||'').trim();
        if(!message||message.length>3000)return reply({ok:false,error:'invalid_message'},400);
        const student=await env.RFIT_DB.prepare("SELECT id FROM users WHERE id=? AND role='student'").bind(session.sub).first();
        if(!student)return reply({ok:false,error:'student_not_found'},404);
        const id=crypto.randomUUID();
        await env.RFIT_DB.prepare("INSERT INTO support_messages(id,student_user_id,sender_user_id,sender_role,body) VALUES(?,?,?,'student',?)").bind(id,session.sub,session.sub,message).run();
        return reply({ok:true,id,created_at:new Date().toISOString()},201);
      }
      return reply({ok:false,error:'method_not_allowed'},405);
    } catch(error){console.error('student_support_messages_failed',error?.message||'unknown');return reply({ok:false,error:'support_unavailable'},503);}
  }
  /* ===== AVALIAÇÕES FÍSICAS AVANÇADAS VISÍVEIS AO ALUNO ===== */
  if (url.pathname === '/api/student/advanced-assessments') {
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    if(request.method!=='GET')return reply({ok:false,error:'method_not_allowed'},405);
    try{
      const [subscription,rows]=await Promise.all([
        env.RFIT_DB.prepare("SELECT p.code,p.name FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=? AND s.status='active' AND (s.lifetime=1 OR s.expires_at IS NULL OR s.expires_at>CURRENT_TIMESTAMP) ORDER BY s.created_at DESC LIMIT 1").bind(session.sub).first(),
        env.RFIT_DB.prepare("SELECT id,measured_at,weight_kg,height_cm,neck_cm,shoulder_cm,chest_cm,waist_cm,abdomen_cm,hip_cm,right_arm_cm,left_arm_cm,right_forearm_cm,left_forearm_cm,right_thigh_cm,left_thigh_cm,right_calf_cm,left_calf_cm,skinfold_protocol,skinfolds_json,body_density,body_fat_pct,fat_mass_kg,lean_mass_kg,bmi,waist_height_ratio,notes,created_at FROM advanced_assessments WHERE user_id=? ORDER BY measured_at DESC,created_at DESC LIMIT 100").bind(session.sub).all()
      ]);
      const premium=Boolean(subscription&&(String(subscription.code||'').toLowerCase().includes('premium')||String(subscription.name||'').toLowerCase().includes('premium')));
      return reply({ok:true,is_premium:premium,has_active_plan:Boolean(subscription),assessments:rows.results||[]});
    }catch(error){console.error('student_advanced_assessments_failed',error?.message||'unknown');return reply({ok:false,error:'advanced_assessments_unavailable'},503);}
  }

  if (url.pathname === '/api/student/workouts' || url.pathname === '/api/student/diets') {
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    if(request.method!=='GET')return reply({ok:false,error:'method_not_allowed'},405);
    try{
      const isWorkout=url.pathname.endsWith('/workouts');
      const sub=await env.RFIT_DB.prepare("SELECT s.id,s.status,s.expires_at,s.lifetime,p.name AS plan_name,p.includes_training,p.includes_nutrition FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=? ORDER BY s.created_at DESC LIMIT 1").bind(session.sub).first();
      const exp=sub?.expires_at?new Date(sub.expires_at).getTime():null;
      const expired=Boolean(!sub||sub.status!=='active'||(!Number(sub.lifetime)&&(!Number.isFinite(exp)||exp<=Date.now())));
      const included=Boolean(sub&&!expired&&(isWorkout?Number(sub.includes_training):Number(sub.includes_nutrition)));
      if(expired)return reply({ok:true,locked:true,reason:'expired',history:[],current:null});
      if(!included)return reply({ok:true,locked:true,reason:'upgrade',history:[],current:null});
      // Reconstrói fichas automáticas antigas incompletas; fichas do professor nunca são tocadas.
      const profile=await env.RFIT_DB.prepare("SELECT anamnesis_completed_at,height_cm,weight_kg FROM student_profiles WHERE user_id=?").bind(session.sub).first();
      if(!profile?.anamnesis_completed_at)return reply({ok:true,locked:true,reason:'anamnesis_required',history:[],current:null});
      const anam=await env.RFIT_DB.prepare("SELECT answers_json FROM anamneses WHERE user_id=? ORDER BY completed_at DESC LIMIT 1").bind(session.sub).first();
      let a={};try{a=JSON.parse(anam?.answers_json||'{}')}catch{}
      const freq=Math.max(1,Math.min(7,Number(a.training_frequency)||3)),goal=String(a.goal||'condicionamento').toLowerCase();
      const goalLabel=a.goal||'Condicionamento físico';
      if(isWorkout&&Number(sub.includes_training)){
        const current=await env.RFIT_DB.prepare("SELECT id,source FROM workouts WHERE user_id=? AND status='active' ORDER BY created_at DESC LIMIT 1").bind(session.sub).first();
        if(!current||current.source==='template'){
          if(current){await env.RFIT_DB.prepare("UPDATE workouts SET status='archived' WHERE id=?").bind(current.id).run();}
          const wid=crypto.randomUUID(),sessions=freq===1?['Full body']:freq===2?['Full body A','Full body B']:freq===3?['Push','Pull','Legs']:freq===4?['Upper A','Lower A','Upper B','Lower B']:freq===5?['Push','Pull','Legs','Upper','Lower']:freq===6?['Push A','Pull A','Legs A','Push B','Pull B','Legs B']:['Push','Pull','Legs','Upper','Lower','Core + cardio','Mobilidade + recuperação'];
          const catalog={
            push:[['Supino máquina',3,'8-12',90],['Supino inclinado halteres',3,'8-12',90],['Desenvolvimento máquina',3,'10-12',60],['Elevação lateral',3,'12-15',45],['Tríceps corda',3,'10-15',60]],
            pull:[['Puxada frente',3,'8-12',90],['Remada baixa',3,'8-12',90],['Remada unilateral',3,'10-12',60],['Face pull',3,'12-15',45],['Rosca direta',3,'10-12',60]],
            legs:[['Leg press',4,'10-12',90],['Agachamento guiado',3,'8-12',90],['Mesa flexora',3,'10-15',60],['Cadeira extensora',3,'10-15',60],['Panturrilha',4,'12-15',45]],
            full:[['Leg press ou cadeira',3,'10-12',75],['Supino máquina',3,'8-12',75],['Puxada frente',3,'8-12',75],['Elevação pélvica',3,'10-15',60],['Desenvolvimento máquina',2,'10-12',60],['Prancha',3,'20-40 s',45]],
            core:[['Prancha',3,'30-45 s',45],['Dead bug',3,'10/lado',45],['Caminhada/bike leve',1,'20-30 min',0],['Mobilidade geral',1,'8-10 min',0]],
            recovery:[['Caminhada leve',1,'20-30 min',0],['Mobilidade de quadril',2,'8-10',30],['Mobilidade torácica',2,'8-10',30],['Alongamento confortável',1,'5-8 min',0]]
          };
          await env.RFIT_DB.prepare("INSERT INTO workouts(id,user_id,subscription_id,title,goal,weekly_frequency,source,status,created_by) VALUES(?,?,?,'Treino automático R-Fit',?,?, 'template','active',NULL)").bind(wid,session.sub,sub.id,goalLabel,freq).run();
          for(let d=0;d<sessions.length;d++){const title=sessions[d],kind=/push/i.test(title)?'push':/pull/i.test(title)?'pull':/leg/i.test(title)?'legs':/core|upper|lower/i.test(title)?(d%3===0?'push':d%3===1?'pull':'legs'):/mobilidade/i.test(title)?'recovery':'full',items=catalog[kind]||catalog.full,sid=crypto.randomUUID();
            await env.RFIT_DB.prepare("INSERT INTO workout_sessions(id,workout_id,day_number,title,notes) VALUES(?,?,?,?,?)").bind(sid,wid,d+1,title,'Aquecimento 5–10 min; escolha carga que permita técnica correta; pare se houver dor. Progressão gradual e recuperação conforme orientação profissional.').run();
            for(let j=0;j<items.length;j++){const e=items[j];await env.RFIT_DB.prepare("INSERT INTO workout_exercises(id,session_id,exercise_name,sets,reps,rest_seconds,order_index,notes) VALUES(?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),sid,e[0],e[1],e[2],e[3],j,'Movimento controlado, amplitude confortável.').run();}
          }
        }
      }
      if(!isWorkout&&Number(sub.includes_nutrition)){
        const current=await env.RFIT_DB.prepare("SELECT id,source FROM diets WHERE user_id=? AND status='active' ORDER BY created_at DESC LIMIT 1").bind(session.sub).first();
        if(!current||current.source==='template'){
          if(current)await env.RFIT_DB.prepare("UPDATE diets SET status='archived' WHERE id=?").bind(current.id).run();
          const did=crypto.randomUUID(),kg=Number(a.weight_kg||profile.weight_kg)||70,cm=Number(a.height_cm||profile.height_cm)||170,age=Math.max(18,Math.min(90,Number(a.age)||30)),sex=String(a.sex||a.gender||'').toLowerCase();
          const bmr=10*kg+6.25*cm-5*age+(sex.includes('masc')||sex==='m'?5:sex.includes('fem')||sex==='f'?-161:-78),activity=freq<=1?1.25:freq<=3?1.45:freq<=5?1.6:1.7;
          let kcal=Math.round(bmr*activity);if(/emag|perda|redu/.test(goal))kcal=Math.round(kcal*.90);else if(/hipert|massa|ganh/.test(goal))kcal=Math.round(kcal*1.05);
          kcal=Math.max(sex.includes('fem')?1200:1500,kcal);const protein=Math.round(kg*1.6),fat=Math.round(kcal*.25/9),carb=Math.max(0,Math.round((kcal-protein*4-fat*9)/4)),water=Math.round(kg*35/250)*250,mealsN=Math.max(3,Math.min(6,Number(a.meals_per_day||a.meal_count||a.meals)||4));
          const mealNames=['Café da manhã','Lanche da manhã','Almoço','Lanche da tarde','Jantar','Ceia'].slice(0,mealsN),foods=[['2 ovos (100 g)','Pão integral (2 fatias/50 g)','Banana (1 un./80 g)'],['Iogurte natural (170 g)','Aveia (20 g)','Morango (100 g)'],['Frango grelhado (150 g)','Arroz cozido (120 g)','Feijão (100 g)','Salada variada + azeite (5 g)'],['Iogurte (170 g)','Maçã (1 un.)','Castanhas (10 g)'],['Patinho ou peixe (150 g)','Batata cozida (180 g)','Legumes (150 g)','Azeite (5 g)'],['Leite (200 ml)','Cacau sem açúcar (5 g)']];
          const days=[['Ovos mexidos (2 un./100 g)','Pão integral (2 fatias/50 g)','Banana (1 un./80 g)'],['Iogurte natural (170 g)','Aveia (30 g)','Mamão (150 g)'],['Omelete (2 ovos/100 g)','Tapioca (50 g)','Fruta (100 g)']];
          await env.RFIT_DB.prepare("INSERT INTO diets(id,user_id,subscription_id,title,goal,calories_target,source,status,created_by) VALUES(?,?,?,'Plano alimentar automático R-Fit',?,?, 'template','active',NULL)").bind(did,session.sub,sub.id,goalLabel,kcal).run();
          for(let day=1;day<=3;day++)for(let i=0;i<mealNames.length;i++){const alternatives=day===1?foods[i]||foods[4]:day===2?[['Pão integral (50 g)','Queijo minas (30 g)','Ovo (1 un.)'],['Pera (1 un.)','Castanhas (10 g)'],['Carne magra (150 g)','Mandioca cozida (150 g)','Legumes (150 g)'],['Iogurte (170 g)','Banana (80 g)','Aveia (20 g)'],['Peixe (150 g)','Arroz (120 g)','Vegetais (150 g)'],['Iogurte (170 g)','Morango (100 g)']][i]:[['Crepioca: ovo (1 un.) + tapioca (40 g)','Queijo (30 g)'],['Fruta (100 g)','Cottage (80 g)'],['Frango (150 g)','Macarrão cozido (130 g)','Salada (150 g)'],['Pão integral (2 fatias)','Atum drenado (100 g)','Tomate/alface'],['Carne magra (150 g)','Batata (180 g)','Legumes (150 g)'],['Leite (200 ml)','Aveia (15 g)']][i];await env.RFIT_DB.prepare("INSERT INTO diet_meals(id,diet_id,meal_order,meal_name,items_json,notes) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(),did,(day-1)*mealNames.length+i+1,'Dia '+day+' · '+mealNames[i],JSON.stringify(alternatives||foods[i]||foods[4]),'Opção ilustrativa; ajustar por preferências, porções e restrições da anamnese.').run();}
          await env.RFIT_DB.prepare("UPDATE diets SET goal=? WHERE id=?").bind(goalLabel+' | Proteínas: '+protein+' g/dia; Carboidratos: '+carb+' g/dia; Gorduras: '+fat+' g/dia; Fibras: '+Math.round(kcal/1000*14)+' g/dia; Água estimada: '+(water/1000).toFixed(2)+' L/dia. Cálculos estimativos.',did).run();
        }
      }
      const table=isWorkout?'workouts':'diets',detail=isWorkout?'weekly_frequency':'calories_target';
      const rows=await env.RFIT_DB.prepare(`SELECT id,title,goal,${detail} AS detail,status,created_at,updated_at FROM ${table} WHERE user_id=? ORDER BY created_at DESC LIMIT 50`).bind(session.sub).all();
      const records=rows.results||[],ids=records.map(x=>x.id),children={};
      if(ids.length){const marks=ids.map(()=>'?').join(',');
        if(isWorkout){
          const ss=await env.RFIT_DB.prepare(`SELECT id,workout_id,day_number,title,notes FROM workout_sessions WHERE workout_id IN (${marks}) ORDER BY day_number`).bind(...ids).all();
          const ee=await env.RFIT_DB.prepare(`SELECT e.session_id,e.exercise_name,e.sets,e.reps,e.rest_seconds,e.notes,e.order_index FROM workout_exercises e JOIN workout_sessions s ON s.id=e.session_id WHERE s.workout_id IN (${marks}) ORDER BY e.order_index`).bind(...ids).all();
          for(const day of ss.results||[])(children[day.workout_id]??=[]).push({...day,exercises:(ee.results||[]).filter(e=>e.session_id===day.id)});
        }else{
          const mm=await env.RFIT_DB.prepare(`SELECT id,diet_id,meal_order,meal_name,items_json,notes FROM diet_meals WHERE diet_id IN (${marks}) ORDER BY meal_order`).bind(...ids).all();
          for(const meal of mm.results||[]){let foods=[];try{foods=JSON.parse(meal.items_json||'[]')}catch{};(children[meal.diet_id]??=[]).push({...meal,items:foods});}
        }
      }
      const all=records.map(x=>{const raw=String(x.goal||''),get=(label)=>{const m=raw.match(new RegExp(label+'\\s*[:~]?\\s*(\\d+)\\s*g','i'));return m?Number(m[1]):null};return {...x,protein:get('Proteínas?'),carbs:get('Carboidratos'),fats:get('Gorduras'),[isWorkout?'sessions':'meals']:children[x.id]||[]};});
      return reply({ok:true,locked:false,current:all.find(x=>x.status==='active')||null,history:all.filter(x=>x.status==='archived')});
    }catch(error){console.error('student_sheet_read_failed',error?.message||'unknown');return reply({ok:false,error:'sheet_unavailable'},503);}
  }

  if (url.pathname === '/api/student/dashboard') {
    if (request.method !== 'GET') return reply({ok:false,error:'method_not_allowed'},405);
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    try {
      const user=await env.RFIT_DB.prepare("SELECT full_name,email,phone,avatar_url FROM users WHERE id=? AND role='student' LIMIT 1").bind(session.sub).first();
      const profile=await env.RFIT_DB.prepare("SELECT height_cm,weight_kg,goal,restrictions_json,anamnesis_completed_at FROM student_profiles WHERE user_id=? LIMIT 1").bind(session.sub).first();
      const sub=await env.RFIT_DB.prepare("SELECT s.id,s.status,s.expires_at,s.lifetime,s.created_at,s.payment_provider,p.code AS plan_code,p.name AS plan_name,p.includes_training,p.includes_nutrition FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=? ORDER BY s.created_at DESC LIMIT 1").bind(session.sub).first();
      const measurement=await env.RFIT_DB.prepare("SELECT weight_kg,height_cm,waist_cm,basal_kcal,measured_at FROM student_measurements WHERE user_id=? ORDER BY measured_at DESC LIMIT 1").bind(session.sub).first();
      const latestCheckin=await env.RFIT_DB.prepare("SELECT week_start,answers_json,created_at FROM weekly_checkins WHERE user_id=? ORDER BY week_start DESC,created_at DESC LIMIT 1").bind(session.sub).first();
      const latestAnamnesis=await env.RFIT_DB.prepare('SELECT answers_json,completed_at FROM anamneses WHERE user_id=? ORDER BY completed_at DESC LIMIT 1').bind(session.sub).first();
      let anamnesisAnswers=null;try{anamnesisAnswers=latestAnamnesis?.answers_json?JSON.parse(latestAnamnesis.answers_json):null}catch{}
      const workout=await env.RFIT_DB.prepare("SELECT id,title,created_at FROM workouts WHERE user_id=? AND status='active' ORDER BY created_at DESC LIMIT 1").bind(session.sub).first();
      const diet=await env.RFIT_DB.prepare("SELECT id,title,created_at FROM diets WHERE user_id=? AND status='active' ORDER BY created_at DESC LIMIT 1").bind(session.sub).first();
      const measurementDate=measurement?.measured_at?new Date(measurement.measured_at).getTime():0;
      const checkinDate=latestCheckin?.created_at||latestCheckin?.week_start;
      const checkinTime=checkinDate?new Date(checkinDate).getTime():0;
      const checkinIsLatest=false;
      const currentWeight=measurement?.weight_kg??profile?.weight_kg??null;
      const height=Number(measurement?.height_cm||profile?.height_cm||0)/100;
      const weight=Number(currentWeight||0);
      const bmi=height>0&&weight>0?Math.round(weight/(height*height)*10)/10:null;
      const validExpiry=sub?.expires_at?new Date(sub.expires_at).getTime():null;
      const isExpired=Boolean(!sub||sub.status!=='active'||(!Number(sub.lifetime)&&(!Number.isFinite(validExpiry)||validExpiry<=Date.now())));
      const days=sub&&!Number(sub.lifetime)&&validExpiry!==null&&Number.isFinite(validExpiry)?Math.max(0,Math.ceil((validExpiry-Date.now())/86400000)):null;
      let healthInfo={};try{healthInfo=JSON.parse(profile?.restrictions_json||'{}')}catch{}; return reply({ok:true,student:{name:user?.full_name||session.name||'',email:user?.email||session.email||'',phone:user?.phone||'',avatar_url:user?.avatar_url||''},subscription:sub?{plan_name:sub.plan_name||'Plano R-Fit',plan_code:sub.plan_code,status:sub.status,lifetime:Number(sub.lifetime),expires_at:sub.expires_at,days_remaining:days,is_expired:isExpired,access_type:sub.lifetime?'lifetime':(/courtesy|cortesia|manual/i.test(String(sub.payment_provider||''))?'courtesy':'standard'),includes_training:Number(sub.includes_training),includes_nutrition:Number(sub.includes_nutrition)}:null,anamnesis_completed:Boolean(profile?.anamnesis_completed_at),anamnesis_answers:anamnesisAnswers,health_info:healthInfo,body:{weight_kg:currentWeight,height_cm:measurement?.height_cm??profile?.height_cm??null,bmi,waist_cm:measurement?.waist_cm??null,measured_at:checkinIsLatest?checkinDate:(measurement?.measured_at||profile?.anamnesis_completed_at||null),basal_kcal:measurement?.basal_kcal??anamnesisAnswers?.basal_kcal??anamnesisAnswers?.basal_kcal??anamnesisAnswers?.form_answers?.basal_kcal??anamnesisAnswers?.form_answers?.basal_kcal??null,weight_source:checkinIsLatest?'checkin':measurement?.weight_kg!==null&&measurement?.weight_kg!==undefined?'evaluation':'anamnesis'},workout_available:Boolean(workout)&&!isExpired&&Number(sub?.includes_training)===1,workout_title:workout?.title||'',diet_available:Boolean(diet)&&!isExpired&&Number(sub?.includes_nutrition)===1,diet_title:diet?.title||''});
    } catch(error) { console.error('student_dashboard_failed',error?.message||'unknown'); return reply({ok:false,error:'dashboard_unavailable'},503); }
  }
  if (url.pathname === '/api/student/measurements') {
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    if(request.method!=='GET')return reply({ok:false,error:'method_not_allowed'},405);
    try{
      // Evolução corporal: avaliações profissionais básicas e avançadas.
      // Check-ins diários permanecem separados e nunca entram nos gráficos.
      const result=await env.RFIT_DB.prepare(`SELECT id,weight_kg,height_cm,waist_cm,basal_kcal,body_fat_pct,measured_at,created_at,bmi,fat_mass_kg,lean_mass_kg,source FROM (
        SELECT id,weight_kg,height_cm,waist_cm,basal_kcal,body_fat_pct,measured_at,measured_at AS created_at,NULL AS bmi,NULL AS fat_mass_kg,NULL AS lean_mass_kg,'professor_assessment' AS source
        FROM student_measurements WHERE user_id=?
        UNION ALL
        SELECT id,weight_kg,height_cm,COALESCE(waist_cm,abdomen_cm) AS waist_cm,NULL AS basal_kcal,body_fat_pct,measured_at,created_at,bmi,fat_mass_kg,lean_mass_kg,'professor_advanced' AS source
        FROM advanced_assessments WHERE user_id=?
      ) ORDER BY measured_at ASC,created_at ASC`).bind(session.sub,session.sub).all();
      const measurements=(result.results||[]).map(row=>{const height=Number(row.height_cm||0)/100,weight=Number(row.weight_kg||0);return {...row,bmi:row.bmi??(height>0&&weight>0?Math.round(weight/(height*height)*10)/10:null)};});
      return reply({ok:true,measurements});
    }catch(error){console.error('student_measurement_history_failed',error?.message||'unknown');return reply({ok:false,error:'measurement_history_unavailable'},503);}
  }
  if (url.pathname === '/api/student/checkins') {
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    if(request.method!=='GET')return reply({ok:false,error:'method_not_allowed'},405);
    try{
      const [weeklyResult,dailyResult]=await Promise.all([
        env.RFIT_DB.prepare("SELECT id,week_start,answers_json,notes,created_at FROM weekly_checkins WHERE user_id=? ORDER BY week_start DESC,created_at DESC LIMIT 90").bind(session.sub).all(),
        env.RFIT_DB.prepare("SELECT id,checkin_date,weight_kg,water_liters,sleep_quality,energy,appetite,training_adherence,nutrition_adherence,discomfort,notes,created_at,updated_at FROM daily_checkins WHERE user_id=? ORDER BY checkin_date DESC,created_at DESC LIMIT 90").bind(session.sub).all()
      ]);
      const weekly=(weeklyResult.results||[]).map(row=>{let answers={};try{answers=JSON.parse(row.answers_json||'{}')}catch{}return {...row,kind:'weekly',checkin_date:row.week_start,answers};});
      const daily=(dailyResult.results||[]).map(row=>({ ...row,kind:'daily',answers:{sleep_quality:row.sleep_quality,energy:row.energy,appetite:row.appetite,training_adherence:row.training_adherence,nutrition_adherence:row.nutrition_adherence,discomfort:row.discomfort},checkin_date:row.checkin_date }));
      const checkins=[...weekly,...daily].sort((a,b)=>new Date(b.created_at||b.checkin_date)-new Date(a.created_at||a.checkin_date)).slice(0,90);
      return reply({ok:true,checkins,total:checkins.length,daily_total:daily.length,weekly_total:weekly.length});
    }catch(error){console.error('student_checkins_list_failed',error?.message||'unknown');return reply({ok:false,error:'checkins_unavailable'},503);}
  }
  if (url.pathname === '/api/student/checkin') {
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    if(request.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405);
    try{
      const body=await request.json();
      const number=(value,min,max)=>Number.isInteger(Number(value))&&Number(value)>=min&&Number(value)<=max;
      if(!number(body.sleep_quality,1,5)||!number(body.energy,1,5)||!number(body.appetite,1,5)||!number(body.training_adherence,0,100)||!number(body.nutrition_adherence,0,100))return reply({ok:false,error:'invalid_checkin_fields'},400);
      const weight=body.weight_kg===null||body.weight_kg===''||body.weight_kg===undefined?null:Number(String(body.weight_kg).replace(',','.'));
      const water=body.water_liters===null||body.water_liters===''||body.water_liters===undefined?null:Number(String(body.water_liters).replace(',','.'));
      if(water!==null&&(!Number.isFinite(water)||water<0||water>10))return reply({ok:false,error:'invalid_water_intake'},400);
      if(weight!==null&&(!Number.isFinite(weight)||weight<20||weight>400))return reply({ok:false,error:'invalid_weight'},400);
      const notes=String(body.notes||'').trim().slice(0,2000);
      const discomfort=body.discomfort?1:0;
      const id=crypto.randomUUID();
      const savedAt=new Date().toISOString();
      await env.RFIT_DB.prepare("INSERT INTO daily_checkins(id,user_id,checkin_date,weight_kg,water_liters,sleep_quality,energy,appetite,training_adherence,nutrition_adherence,discomfort,notes,created_at,updated_at) VALUES(?,?,date('now'),?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,checkin_date) DO UPDATE SET weight_kg=excluded.weight_kg,water_liters=excluded.water_liters,sleep_quality=excluded.sleep_quality,energy=excluded.energy,appetite=excluded.appetite,training_adherence=excluded.training_adherence,nutrition_adherence=excluded.nutrition_adherence,discomfort=excluded.discomfort,notes=excluded.notes,updated_at=excluded.updated_at")
        .bind(id,session.sub,weight,water,Number(body.sleep_quality),Number(body.energy),Number(body.appetite),Number(body.training_adherence),Number(body.nutrition_adherence),discomfort,notes,savedAt,savedAt).run();
      return reply({ok:true,saved:true,message:'Check-in salvo com sucesso.'});
    }catch(error){console.error('student_daily_checkin_failed',error?.message||'unknown');return reply({ok:false,error:'checkin_save_failed'},503);}
  }
  if (url.pathname === '/api/student/journey/photos') {
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    if(request.method==='GET'){
      try{
        const result=await env.RFIT_DB.prepare("SELECT id,mime_type,byte_size,photo_type,note,taken_at,created_at FROM student_journey_photos WHERE user_id=? ORDER BY taken_at DESC,created_at DESC LIMIT 60").bind(session.sub).all();
        return reply({ok:true,photos:result.results||[]});
      }catch(error){console.error('journey_photos_list_failed',error?.message||'unknown');return reply({ok:false,error:'journey_photos_unavailable'},503);}
    }
    if(request.method==='POST'){
      try{
        const mime=(request.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
        if(!['image/jpeg','image/png','image/webp'].includes(mime))return reply({ok:false,error:'unsupported_image_type'},415);
        const declared=Number(request.headers.get('content-length')||0);
        if(declared>716800)return reply({ok:false,error:'image_too_large'},413);
        const bytes=new Uint8Array(await request.arrayBuffer());
        if(!bytes.length||bytes.byteLength>716800)return reply({ok:false,error:'image_too_large'},413);
        const signature=mime==='image/jpeg'?bytes[0]===0xff&&bytes[1]===0xd8:mime==='image/png'?bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47:bytes[0]===0x52&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[3]===0x46&&bytes[8]===0x57&&bytes[9]===0x45&&bytes[10]===0x42&&bytes[11]===0x50;
        if(!signature)return reply({ok:false,error:'invalid_image'},400);
        const params=url.searchParams;
        const photoType=['frente','lado','costas','progresso'].includes(params.get('type'))?params.get('type'):'progresso';
        const note=String(params.get('note')||'').trim().slice(0,240);
        const takenAt=params.get('date')&&/^\d{4}-\d{2}-\d{2}$/.test(params.get('date'))?params.get('date')+'T12:00:00.000Z':new Date().toISOString();
        const id=crypto.randomUUID();
        await env.RFIT_DB.prepare("INSERT INTO student_journey_photos(id,user_id,image_blob,mime_type,byte_size,photo_type,note,taken_at) VALUES(?,?,?,?,?,?,?,?)").bind(id,session.sub,bytes,mime,bytes.byteLength,photoType,note,takenAt).run();
        return reply({ok:true,saved:true,id,byte_size:bytes.byteLength},201);
      }catch(error){console.error('journey_photo_save_failed',error?.message||'unknown');return reply({ok:false,error:'journey_photo_save_failed'},503);}
    }
    return reply({ok:false,error:'method_not_allowed'},405);
  }
  if(url.pathname.startsWith('/api/student/journey/photos/')&&url.pathname.endsWith('/image')&&request.method==='GET'){
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return new Response('Unauthorized',{status:401});
    const id=url.pathname.split('/').filter(Boolean).slice(-2)[0];
    try{
      const row=await env.RFIT_DB.prepare("SELECT image_blob,mime_type FROM student_journey_photos WHERE id=? AND user_id=? LIMIT 1").bind(id,session.sub).first();
      if(!row)return new Response('Not found',{status:404});
      const bytes=row.image_blob instanceof ArrayBuffer?row.image_blob:row.image_blob?.buffer?row.image_blob:new Uint8Array(row.image_blob||[]);
      return new Response(bytes,{headers:{'Content-Type':row.mime_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}});
    }catch(error){console.error('journey_photo_read_failed',error?.message||'unknown');return new Response('Photo unavailable',{status:503});}
  }
  if(url.pathname.startsWith('/api/student/journey/photos/')&&request.method==='DELETE'){
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    const id=url.pathname.split('/').pop();
    try{const result=await env.RFIT_DB.prepare("DELETE FROM student_journey_photos WHERE id=? AND user_id=?").bind(id,session.sub).run();return reply({ok:true,deleted:Boolean(result.meta?.changes)});}
    catch(error){console.error('journey_photo_delete_failed',error?.message||'unknown');return reply({ok:false,error:'journey_photo_delete_failed'},503);}
  }
  if (url.pathname === '/api/student/journey/notes') {
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    if(request.method!=='GET')return reply({ok:false,error:'method_not_allowed'},405);
    try{
      const result=await env.RFIT_DB.prepare("SELECT n.id,n.note,n.created_at,u.full_name AS author_name FROM student_journey_notes n JOIN users u ON u.id=n.author_user_id WHERE n.user_id=? ORDER BY n.created_at DESC LIMIT 100").bind(session.sub).all();
      return reply({ok:true,notes:result.results||[]});
    }catch(error){console.error('journey_notes_list_failed',error?.message||'unknown');return reply({ok:false,error:'journey_notes_unavailable'},503);}
  }
  /* ===== XP CUMULATIVO E CONQUISTAS PERMANENTES ===== */
  if(url.pathname==='/api/student/gamification'){
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    if(request.method!=='GET')return reply({ok:false,error:'method_not_allowed'},405);
    try{
      const userId=session.sub;
      const award=async(key,type,description,xp,sourceAt)=>env.RFIT_DB.prepare('INSERT OR IGNORE INTO student_xp_events(id,user_id,event_key,event_type,description,xp,source_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),userId,key,type,description,xp,sourceAt||null).run();
      const [daily,weekly,measurements,goals,photos,profile,payments,workouts,diets,manualAwards]=await Promise.all([
        env.RFIT_DB.prepare('SELECT id,checkin_date,weight_kg,water_liters,created_at FROM daily_checkins WHERE user_id=? ORDER BY checkin_date,created_at').bind(userId).all(),
        env.RFIT_DB.prepare('SELECT id,week_start,created_at FROM weekly_checkins WHERE user_id=? ORDER BY week_start,created_at').bind(userId).all(),
        env.RFIT_DB.prepare("SELECT id,measured_at FROM student_measurements WHERE user_id=? UNION ALL SELECT id,measured_at FROM advanced_assessments WHERE user_id=? ORDER BY measured_at,id").bind(userId,userId).all(),
        env.RFIT_DB.prepare('SELECT id,title,status,created_at,completed_at FROM student_journey_goals WHERE user_id=? ORDER BY created_at').bind(userId).all(),
        env.RFIT_DB.prepare('SELECT id,taken_at,created_at FROM student_journey_photos WHERE user_id=? ORDER BY taken_at,created_at').bind(userId).all(),
        env.RFIT_DB.prepare('SELECT anamnesis_completed_at,weight_kg FROM student_profiles WHERE user_id=? LIMIT 1').bind(userId).first(),
        env.RFIT_DB.prepare("SELECT p.id,p.idempotency_key,p.paid_at,p.amount_cents,pc.plan_id,pl.code AS plan_code,pl.name AS plan_name,pl.price_cents FROM payments p LEFT JOIN payment_checkouts pc ON pc.provider_payment_id=p.provider_payment_id LEFT JOIN plans pl ON pl.id=pc.plan_id WHERE p.user_id=? AND p.status='approved' ORDER BY COALESCE(p.paid_at,p.created_at),p.id").bind(userId).all(),
        env.RFIT_DB.prepare("SELECT id,title,created_at FROM workouts WHERE user_id=? ORDER BY created_at LIMIT 1").bind(userId).first(),
        env.RFIT_DB.prepare("SELECT id,title,created_at FROM diets WHERE user_id=? ORDER BY created_at LIMIT 1").bind(userId).first(),
        env.RFIT_DB.prepare("SELECT id,title,description,message,xp,created_at FROM student_manual_achievement_awards WHERE user_id=? ORDER BY created_at").bind(userId).all()
      ]);
      const dailyRows=daily.results||[],weeklyRows=weekly.results||[],measureRows=measurements.results||[],goalRows=goals.results||[],photoRows=photos.results||[],paymentRows=payments.results||[],manualRows=manualAwards.results||[];
      for(const row of dailyRows)await award('daily-checkin:'+row.checkin_date,'checkin','Check-in diário concluído',25,row.created_at||row.checkin_date);
      for(const row of weeklyRows)await award('weekly-checkin:'+row.week_start,'checkin','Check-in semanal concluído',25,row.created_at||row.week_start);
      if(profile?.anamnesis_completed_at)await award('anamnesis:first','anamnesis','Anamnese inicial concluída',100,profile.anamnesis_completed_at);
      for(let i=0;i<measureRows.length;i++){const row=measureRows[i];await award('assessment:'+row.id,'assessment',i===0?'Primeira avaliação registrada':'Nova avaliação registrada',i===0?100:40,row.measured_at);}
      for(const row of photoRows)await award('photo:'+row.id,'photo','Foto de evolução registrada',10,row.taken_at||row.created_at);
      for(const row of goalRows)if(row.status==='completed'||row.completed_at)await award('goal:'+row.id,'goal','Meta pessoal concluída: '+row.title,150,row.completed_at||row.created_at);
      let previousPayment=null,renewalCount=0,upgradeCount=0;
      for(const row of paymentRows){
        const currentPrice=Number(row.price_cents||row.amount_cents||0),previousPrice=Number(previousPayment?.price_cents||previousPayment?.amount_cents||0);
        let type='plan_first',xp=100,description='Plano R-Fit ativado';
        if(previousPayment){if(currentPrice>previousPrice){type='plan_upgrade';xp=150;description='Upgrade de plano realizado';upgradeCount++;}else{type='plan_renewal';xp=200;description='Plano renovado';renewalCount++;}}
        if(row.idempotency_key)await award('payment:'+row.idempotency_key,type,description,xp,row.paid_at);
        previousPayment=row;
      }
      const weeks=new Set();
      const addWeek=value=>{if(!value)return;const d=new Date(String(value).slice(0,10)+'T12:00:00Z');if(Number.isNaN(d.getTime()))return;const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()-day+1);weeks.add(d.toISOString().slice(0,10));};
      dailyRows.forEach(row=>addWeek(row.checkin_date));weeklyRows.forEach(row=>addWeek(row.week_start));
      const orderedWeeks=[...weeks].sort();let bestStreak=0,streak=0,prev=null;
      for(const week of orderedWeeks){const d=new Date(week+'T12:00:00Z');if(prev&&Math.round((d-prev)/604800000)===1)streak++;else streak=1;bestStreak=Math.max(bestStreak,streak);prev=d;}
      const completedGoals=goalRows.filter(g=>g.status==='completed'||g.completed_at);
      const hydrationDays=new Set(dailyRows.filter(row=>{const weight=Number(row.weight_kg||profile?.weight_kg||0),water=Number(row.water_liters);if(!(weight>0)||!Number.isFinite(water)||water<0)return false;return water>=Math.round(weight*0.05*10)/10;}).map(row=>row.checkin_date).filter(Boolean));
      const defs=[
        {code:'first-checkin',icon:'✓',title:'Primeiro passo',description:'Realizou seu primeiro check-in.',unlocked:dailyRows.length+weeklyRows.length>=1,date:dailyRows[0]?.created_at||weeklyRows[0]?.created_at,xp:50},
        {code:'five-checkins',icon:'★',title:'Ritmo constante',description:'Completou 5 check-ins.',unlocked:dailyRows.length+weeklyRows.length>=5,date:(dailyRows.concat(weeklyRows).sort((a,b)=>String(a.created_at||a.checkin_date).localeCompare(String(b.created_at||b.week_start)))[4]?.created_at),xp:50},
        {code:'ten-checkins',icon:'🏅',title:'Compromisso em ação',description:'Completou 10 check-ins.',unlocked:dailyRows.length+weeklyRows.length>=10,date:(dailyRows.concat(weeklyRows).sort((a,b)=>String(a.created_at||a.checkin_date).localeCompare(String(b.created_at||b.week_start)))[9]?.created_at),xp:75},
        {code:'thirty-checkins',icon:'🏆',title:'30 passos de evolução',description:'Completou 30 check-ins.',unlocked:dailyRows.length+weeklyRows.length>=30,date:null,xp:100},
        {code:'fifty-checkins',icon:'🥇',title:'50 vezes por você',description:'Completou 50 check-ins.',unlocked:dailyRows.length+weeklyRows.length>=50,date:null,xp:150},
        {code:'hundred-checkins',icon:'💯',title:'Centenário R-Fit',description:'Completou 100 check-ins.',unlocked:dailyRows.length+weeklyRows.length>=100,date:null,xp:250},
        {code:'anamnesis-complete',icon:'📋',title:'Minha história registrada',description:'Preencheu sua anamnese e compartilhou seu ponto de partida.',unlocked:Boolean(profile?.anamnesis_completed_at),date:profile?.anamnesis_completed_at,xp:100},
        {code:'hydration-seven-days',icon:'💧',title:'Hidratação em dia',description:'Atingiu sua meta diária de água em 7 dias diferentes.',unlocked:hydrationDays.size>=7,date:null,xp:100},
        {code:'first-workout',icon:'🏋️',title:'Primeiro treino recebido',description:'Seu primeiro treino foi disponibilizado pelo professor.',unlocked:Boolean(workouts),date:workouts?.created_at,xp:50},
        {code:'first-diet',icon:'🥗',title:'Plano alimentar recebido',description:'Seu primeiro plano alimentar foi disponibilizado.',unlocked:Boolean(diets),date:diets?.created_at,xp:50},
        {code:'first-assessment',icon:'⚖️',title:'Ponto de partida',description:'Recebeu sua primeira avaliação corporal.',unlocked:measureRows.length>=1,date:measureRows[0]?.measured_at,xp:50},
        {code:'five-assessments',icon:'📈',title:'Evolução acompanhada',description:'Possui 5 avaliações corporais.',unlocked:measureRows.length>=5,date:measureRows[4]?.measured_at,xp:75},
        {code:'ten-assessments',icon:'🧭',title:'Histórico completo',description:'Possui 10 avaliações corporais registradas.',unlocked:measureRows.length>=10,date:measureRows[9]?.measured_at,xp:150},
        {code:'first-goal',icon:'🎯',title:'Olhar no objetivo',description:'Definiu sua primeira meta.',unlocked:goalRows.length>=1,date:goalRows[0]?.created_at,xp:50},
        {code:'four-week-streak',icon:'🔥',title:'Quatro semanas firmes',description:'Registrou atividades em 4 semanas consecutivas.',unlocked:bestStreak>=4,date:null,xp:100},
        {code:'eight-week-streak',icon:'🌟',title:'Constância de verdade',description:'Registrou atividades em 8 semanas consecutivas.',unlocked:bestStreak>=8,date:null,xp:150},
        {code:'twelve-week-streak',icon:'🔥',title:'Três meses imparável',description:'Registrou atividades em 12 semanas consecutivas.',unlocked:bestStreak>=12,date:null,xp:250},
        {code:'first-photo',icon:'📸',title:'Minha transformação',description:'Adicionou sua primeira foto de evolução.',unlocked:photoRows.length>=1,date:photoRows[0]?.taken_at||photoRows[0]?.created_at,xp:50},
        {code:'goal-complete',icon:'🏁',title:'Meta alcançada',description:'Concluiu um objetivo acompanhado.',unlocked:completedGoals.length>=1,date:completedGoals[0]?.completed_at||completedGoals[0]?.created_at,xp:100},
        {code:'three-goals',icon:'🎖️',title:'Três conquistas pessoais',description:'Concluiu 3 objetivos acompanhados.',unlocked:completedGoals.length>=3,date:completedGoals[2]?.completed_at||completedGoals[2]?.created_at,xp:150},
        {code:'five-goals',icon:'🏅',title:'Colecionador de metas',description:'Concluiu 5 objetivos acompanhados.',unlocked:completedGoals.length>=5,date:completedGoals[4]?.completed_at||completedGoals[4]?.created_at,xp:250},
        {code:'ten-photos',icon:'🖼️',title:'Álbum de evolução',description:'Registrou 10 fotos de acompanhamento.',unlocked:photoRows.length>=10,date:photoRows[9]?.taken_at||photoRows[9]?.created_at,xp:75},
        {code:'three-photos',icon:'📷',title:'Olhar para trás',description:'Registrou 3 fotos de evolução.',unlocked:photoRows.length>=3,date:photoRows[2]?.taken_at||photoRows[2]?.created_at,xp:50},
        {code:'twenty-photos',icon:'🎞️',title:'Minha história em imagens',description:'Registrou 20 fotos de evolução.',unlocked:photoRows.length>=20,date:photoRows[19]?.taken_at||photoRows[19]?.created_at,xp:150},
        {code:'first-renewal',icon:'💎',title:'Fidelidade R-Fit',description:'Renovou seu plano pela primeira vez.',unlocked:renewalCount>=1,date:null,xp:100},
        {code:'three-renewals',icon:'👑',title:'Compromisso de longo prazo',description:'Renovou seu plano 3 vezes.',unlocked:renewalCount>=3,date:null,xp:200},
        {code:'first-upgrade',icon:'🚀',title:'Novo patamar',description:'Fez upgrade do seu plano.',unlocked:upgradeCount>=1,date:null,xp:100}
      ];
      for(const item of defs){if(!item.unlocked)continue;const inserted=await env.RFIT_DB.prepare('INSERT OR IGNORE INTO student_achievement_unlocks(id,user_id,achievement_code,unlocked_at,xp_awarded) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),userId,item.code,item.date||new Date().toISOString(),item.xp).run();if(inserted.meta?.changes){await award('achievement:'+item.code,'achievement','Conquista desbloqueada: '+item.title,item.xp,item.date);await env.RFIT_DB.prepare("INSERT OR IGNORE INTO notifications(id,user_id,channel,template_code,payload_json,status,sent_at,dedupe_key) VALUES(?,?,'in_app','achievement_unlocked',?,'sent',CURRENT_TIMESTAMP,?)").bind(crypto.randomUUID(),userId,JSON.stringify({title:'Nova conquista desbloqueada!',message:item.title+' — você recebeu '+item.xp+' XP.',url:'/student/pages/portal/journey/index.html'}),'achievement:'+item.code).run();}}
      const unlocks=await env.RFIT_DB.prepare('SELECT achievement_code,unlocked_at,xp_awarded FROM student_achievement_unlocks WHERE user_id=?').bind(userId).all();
      const unlockedMap=new Map((unlocks.results||[]).map(row=>[row.achievement_code,row]));
      const events=await env.RFIT_DB.prepare('SELECT event_type,description,xp,source_at,created_at FROM student_xp_events WHERE user_id=? ORDER BY COALESCE(source_at,created_at) DESC,id DESC LIMIT 12').bind(userId).all();
      const total=await env.RFIT_DB.prepare('SELECT COALESCE(SUM(xp),0) AS total_xp FROM student_xp_events WHERE user_id=?').bind(userId).first();
      const manualDefs=manualRows.map(row=>({code:'manual:'+row.id,icon:'🎁',title:row.title,description:row.description||row.message||'Conquista especial concedida pelo professor.',unlocked:true,date:row.created_at,xp:Number(row.xp||0),manual:true,message:row.message||''}));
      const allDefs=[...defs,...manualDefs];
      const xp=Number(total?.total_xp||0),levels=[{min:0,name:'Iniciante'},{min:300,name:'Em Evolução'},{min:800,name:'Determinado'},{min:1500,name:'Consistente'},{min:2500,name:'Disciplinado'},{min:4000,name:'Elite'},{min:6000,name:'Referência'},{min:8500,name:'Lenda R-Fit'}];
      let current=levels[0],next=null;levels.forEach((level,index)=>{if(xp>=level.min){current=level;next=levels[index+1]||null;}});
      return reply({ok:true,xp,level:levels.indexOf(current)+1,level_name:current.name,next_level:next?{name:next.name,xp:next.min,remaining:Math.max(0,next.min-xp)}:null,progress_percent:next?Math.max(0,Math.min(100,Math.round((xp-current.min)/(next.min-current.min)*100))):100,achievements:allDefs.map(item=>{const row=unlockedMap.get(item.code);return {...item,unlocked:item.manual?true:Boolean(row),unlocked_at:item.manual?item.date:(row?.unlocked_at||null)};}),unlocked_count:unlockedMap.size,total_achievements:allDefs.length,recent_events:events.results||[]});
    }catch(error){console.error('student_gamification_failed',error?.message||'unknown');return reply({ok:false,error:'gamification_unavailable'},503);}
  }

  if (url.pathname === '/api/student/journey/goals') {
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    if(request.method==='GET'){
      try{
        const [result,measurement,profile,dailyWeight]=await Promise.all([
          env.RFIT_DB.prepare("SELECT id,metric,title,start_value,target_value,unit,notes,status,created_at,updated_at,completed_at FROM student_journey_goals WHERE user_id=? ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END,created_at DESC").bind(session.sub).all(),
          env.RFIT_DB.prepare("SELECT weight_kg,waist_cm,body_fat_pct,measured_at AS recorded_at FROM student_measurements WHERE user_id=? ORDER BY measured_at DESC LIMIT 1").bind(session.sub).first(),
          env.RFIT_DB.prepare("SELECT weight_kg FROM student_profiles WHERE user_id=? LIMIT 1").bind(session.sub).first(),
          env.RFIT_DB.prepare("SELECT weight_kg,created_at AS recorded_at FROM daily_checkins WHERE user_id=? AND weight_kg IS NOT NULL ORDER BY checkin_date DESC,created_at DESC LIMIT 1").bind(session.sub).first()
        ]);
        const useDailyWeight=Boolean(dailyWeight?.weight_kg!==null&&dailyWeight?.weight_kg!==undefined&&(!measurement?.recorded_at||String(dailyWeight.recorded_at||'')>String(measurement.recorded_at)));
        const currentWeight=useDailyWeight?dailyWeight?.weight_kg:(measurement?.weight_kg??profile?.weight_kg??null);
        const goals=(result.results||[]).map(goal=>{
          const current=goal.metric==='weight'?(currentWeight??null):goal.metric==='waist'?(measurement?.waist_cm??null):goal.metric==='body_fat'?(measurement?.body_fat_pct??null):null;
          const value=current===null?null:Number(current),start=goal.start_value===null?(value!==null&&Number.isFinite(value)?value:null):Number(goal.start_value),target=goal.target_value===null?null:Number(goal.target_value);
          let progress=null,reached=false;
          if(start!==null&&target!==null&&value!==null&&Number.isFinite(value)&&target!==start){
            progress=Math.max(0,Math.min(100,Math.round(((value-start)/(target-start))*100)));
            reached=target>start?value>=target:value<=target;
          }
          let status=goal.status,completedAt=goal.completed_at;
          if(status==='active'&&reached){status='completed';completedAt=new Date().toISOString();env.RFIT_DB.prepare("UPDATE student_journey_goals SET status='completed',completed_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=? AND status='active'").bind(completedAt,goal.id,session.sub).run().catch(()=>{});}
          return {...goal,status,completed_at:completedAt,current_value:value,progress_percent:progress};
        });
        return reply({ok:true,goals});
      }catch(error){console.error('journey_goals_list_failed',error?.message||'unknown');return reply({ok:false,error:'journey_goals_unavailable'},503);}
    }
    if(request.method==='POST'){
      try{
        const body=await request.json();
        const metric=['weight','waist','body_fat','fitness','custom'].includes(body.metric)?body.metric:'custom';
        const title=String(body.title||'').trim().slice(0,100);
        const unit=({weight:'kg',waist:'cm',body_fat:'%',fitness:'',custom:''})[metric];
        const notes=String(body.notes||'').trim().slice(0,500);
        let start=body.start_value===null||body.start_value===''||body.start_value===undefined?null:Number(body.start_value);
        const target=body.target_value===null||body.target_value===''||body.target_value===undefined?null:Number(body.target_value);
        if(start===null&&['weight','waist','body_fat'].includes(metric)){
          const field=metric==='weight'?'weight_kg':metric==='waist'?'waist_cm':'body_fat_pct';
          const latest=await env.RFIT_DB.prepare("SELECT "+field+" AS current_value FROM student_measurements WHERE user_id=? ORDER BY measured_at DESC LIMIT 1").bind(session.sub).first();
          if(latest?.current_value!==null&&latest?.current_value!==undefined)start=Number(latest.current_value);
          else if(metric==='weight'){
            const profile=await env.RFIT_DB.prepare("SELECT weight_kg AS current_value FROM student_profiles WHERE user_id=? LIMIT 1").bind(session.sub).first();
            if(profile?.current_value!==null&&profile?.current_value!==undefined)start=Number(profile.current_value);
          }
        }
        if(!title||start!==null&&!Number.isFinite(start)||target!==null&&!Number.isFinite(target)||start===null&&target===null)return reply({ok:false,error:'invalid_goal'},400);
        const id=crypto.randomUUID();
        await env.RFIT_DB.prepare("INSERT INTO student_journey_goals(id,user_id,metric,title,start_value,target_value,unit,notes) VALUES(?,?,?,?,?,?,?,?)").bind(id,session.sub,metric,title,start,target,unit,notes).run();
        return reply({ok:true,saved:true,id},201);
      }catch(error){console.error('journey_goal_save_failed',error?.message||'unknown');return reply({ok:false,error:'journey_goal_save_failed'},503);}
    }
    return reply({ok:false,error:'method_not_allowed'},405);
  }
  if (url.pathname.startsWith('/api/student/journey/goals/') && request.method==='DELETE') {
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    const id=url.pathname.split('/').pop();
    try{const result=await env.RFIT_DB.prepare("DELETE FROM student_journey_goals WHERE id=? AND user_id=?").bind(id,session.sub).run();return reply({ok:true,deleted:Boolean(result.meta?.changes)});}
    catch(error){console.error('journey_goal_delete_failed',error?.message||'unknown');return reply({ok:false,error:'journey_goal_delete_failed'},503);}
  }
  if (url.pathname === '/api/student/plans') {
    if (request.method !== 'GET') return reply({ok:false,error:'method_not_allowed'},405);
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    try{
      const result=await env.RFIT_DB.prepare("SELECT id,code,name,description,price_cents,duration_days,lifetime,includes_training,includes_nutrition FROM plans WHERE is_active=1 ORDER BY CASE code WHEN 'nutrition' THEN 1 WHEN 'training' THEN 2 WHEN 'combo' THEN 3 WHEN 'premium_lifetime' THEN 4 ELSE 5 END,created_at").all();
      return reply({ok:true,plans:result.results||[]});
    }catch(error){console.error('student_plan_catalog_failed',error?.message||'unknown');return reply({ok:false,error:'plan_catalog_unavailable'},503);}
  }
  if (url.pathname === '/api/student/subscription') {
    if (request.method !== 'GET') return reply({ok:false,error:'method_not_allowed'},405);
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    try {
      const subscription=await env.RFIT_DB.prepare("SELECT s.id,s.status,s.expires_at,s.lifetime,s.created_at,s.payment_provider,p.code AS plan_code,p.name AS plan_name,p.includes_training,p.includes_nutrition FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=? AND s.status='active' AND (s.lifetime=1 OR s.expires_at IS NULL OR s.expires_at>CURRENT_TIMESTAMP) ORDER BY s.created_at DESC LIMIT 1").bind(session.sub).first();
      if(!subscription)return reply({ok:true,subscription:null});
      let days_remaining=null;
      if(!Number(subscription.lifetime) && subscription.expires_at) {
        days_remaining=Math.max(0,Math.ceil((new Date(subscription.expires_at).getTime()-Date.now())/86400000));
      }
      const payment=await env.RFIT_DB.prepare("SELECT pc.method,p.status,p.paid_at,p.amount_cents FROM payments p LEFT JOIN payment_checkouts pc ON pc.provider_payment_id=p.provider_payment_id WHERE p.user_id=? AND p.status='approved' ORDER BY COALESCE(p.paid_at,p.created_at) DESC LIMIT 1").bind(session.sub).first().catch(()=>null);
      return reply({ok:true,subscription:{...subscription,days_remaining,last_payment_method:payment?.method||null,last_payment_status:payment?.status||null,last_payment_date:payment?.paid_at||null,last_payment_amount_cents:payment?.amount_cents??null}});
    } catch(error) {
      console.error('student_subscription_failed',error?.message||'unknown');
      return reply({ok:false,error:'subscription_unavailable'},503);
    }
  }
  if (url.pathname === '/api/student/anamnesis/status' || url.pathname === '/api/student/anamnesis') {
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    try{
      if(request.method==='GET'){
        const profile=await env.RFIT_DB.prepare('SELECT anamnesis_completed_at FROM student_profiles WHERE user_id=?').bind(session.sub).first();
        const sub=await env.RFIT_DB.prepare("SELECT id,plan_id,expires_at,lifetime FROM subscriptions WHERE user_id=? AND status='active' AND (lifetime=1 OR expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP) ORDER BY created_at DESC LIMIT 1").bind(session.sub).first();
        return reply({ok:true,completed:Boolean(profile?.anamnesis_completed_at),completed_at:profile?.anamnesis_completed_at||null,has_active_plan:Boolean(sub)});
      }
      if(request.method==='POST' && url.pathname==='/api/student/anamnesis'){
        const active=await env.RFIT_DB.prepare("SELECT id FROM subscriptions WHERE user_id=? AND status='active' AND (lifetime=1 OR expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP) LIMIT 1").bind(session.sub).first();
        if(!active)return reply({ok:false,error:'active_plan_required'},403);
        const body=await request.json();
        const fields=['birth_date','sex','height_cm','weight_kg','goal','training_frequency','experience_level','health_conditions','medications','allergies','restrictions','additional_notes'];
        const answers={};
        for(const key of fields)answers[key]=String(body[key]??'').trim().slice(0,2000);
        if(body.form_answers&&typeof body.form_answers==='object'&&!Array.isArray(body.form_answers))answers.form_answers=body.form_answers;
        const required=['birth_date','height_cm','weight_kg','goal','training_frequency'];
        if(required.some(key=>!answers[key])||!/^\d{4}-\d{2}-\d{2}$/.test(answers.birth_date)||!Number.isFinite(Number(answers.height_cm))||Number(answers.height_cm)<80||Number(answers.height_cm)>250||!Number.isFinite(Number(answers.weight_kg))||Number(answers.weight_kg)<20||Number(answers.weight_kg)>400)return reply({ok:false,error:'required_fields_missing'},400);
        const previous=await env.RFIT_DB.prepare('SELECT version,answers_json,completed_at FROM anamneses WHERE user_id=? ORDER BY completed_at DESC LIMIT 1').bind(session.sub).first();
        if(previous?.answers_json){
          try{
            const previousAnswers=JSON.parse(previous.answers_json);
            const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
            if(JSON.stringify(stable(answers))===JSON.stringify(stable(previousAnswers))){ /* mantém respostas; permite completar fichas pendentes */ }
          }catch{}
        }
        const completedAt=new Date().toISOString();
        const nextVersion=Number(previous?.version||0)+1;
        await env.RFIT_DB.prepare("INSERT INTO anamneses(id,user_id,version,answers_json,completed_at) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),session.sub,nextVersion,JSON.stringify(answers),completedAt).run();
        await env.RFIT_DB.prepare("UPDATE student_profiles SET birth_date=?,sex=?,height_cm=?,weight_kg=?,goal=?,training_frequency=?,experience_level=?,restrictions_json=?,anamnesis_completed_at=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?").bind(answers.birth_date,answers.sex,Number(answers.height_cm),Number(answers.weight_kg),answers.goal,Number(answers.training_frequency),answers.experience_level,JSON.stringify({health_conditions:answers.health_conditions,medications:answers.medications,allergies:answers.allergies,restrictions:answers.restrictions,additional_notes:answers.additional_notes}),completedAt,session.sub).run();
        // Na primeira anamnese, criar uma ficha inicial persistida (nunca recalcular em acessos posteriores).
        {
          const plan=await env.RFIT_DB.prepare("SELECT p.includes_training,p.includes_nutrition FROM subscriptions s JOIN plans p ON p.id=s.plan_id WHERE s.user_id=? AND s.status='active' AND (s.lifetime=1 OR s.expires_at IS NULL OR s.expires_at>CURRENT_TIMESTAMP) ORDER BY s.created_at DESC LIMIT 1").bind(session.sub).first();
          const freq=Math.max(2,Math.min(6,Number(answers.training_frequency)||3));
          if(Number(plan?.includes_training)){
            const existing=await env.RFIT_DB.prepare("SELECT id FROM workouts WHERE user_id=? LIMIT 1").bind(session.sub).first();
            if(!existing){
              const wid=crypto.randomUUID(),days=Math.min(freq,4);
              await env.RFIT_DB.prepare("INSERT INTO workouts(id,user_id,subscription_id,title,goal,weekly_frequency,source,status,created_by) VALUES(?,?,?,'Treino inicial R-Fit',?,?, 'template','active',NULL)").bind(wid,session.sub,active.id,answers.goal,days).run();
              const routines=[
                [{n:'Agachamento livre ou cadeira',s:3,r:'8-12'},{n:'Supino máquina',s:3,r:'8-12'},{n:'Remada baixa',s:3,r:'8-12'},{n:'Elevação pélvica',s:3,r:'10-15'},{n:'Mesa flexora',s:3,r:'10-15'},{n:'Desenvolvimento máquina',s:2,r:'10-12'},{n:'Panturrilha em pé',s:3,r:'12-15'},{n:'Prancha',s:3,r:'20-40 s'}],
                [{n:'Leg press',s:3,r:'10-12'},{n:'Puxada frente',s:3,r:'10-12'},{n:'Desenvolvimento máquina',s:3,r:'10-12'},{n:'Mesa flexora',s:3,r:'12-15'},{n:'Abdominal',s:3,r:'12-15'}]
              ];
              for(let d=0;d<days;d++){const sid=crypto.randomUUID();await env.RFIT_DB.prepare("INSERT INTO workout_sessions(id,workout_id,day_number,title,notes) VALUES(?,?,?,?,?)").bind(sid,wid,d+1,'Treino '+String.fromCharCode(65+d),'Ficha inicial geral. Ajustar cargas e amplitude sem dor; interromper se houver desconforto.').run();for(let j=0;j<routines[d%2].length;j++){const e=routines[d%2][j];await env.RFIT_DB.prepare("INSERT INTO workout_exercises(id,session_id,exercise_name,sets,reps,rest_seconds,order_index,notes) VALUES(?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),sid,e.n,e.s,e.r,60,j,'Carga leve/moderada e técnica controlada.').run();}}
            }
          }
          if(Number(plan?.includes_nutrition)){
            const existing=await env.RFIT_DB.prepare("SELECT id FROM diets WHERE user_id=? LIMIT 1").bind(session.sub).first();
            if(!existing){
              const did=crypto.randomUUID(),kg=Number(answers.weight_kg),protein=Math.round(kg*1.6),water=Math.round(kg*35/250)*250,kcal=Math.round(kg*30),fats=Math.round(kcal*.25/9),carbs=Math.round((kcal-protein*4-fats*9)/4);
              await env.RFIT_DB.prepare("INSERT INTO diets(id,user_id,subscription_id,title,goal,calories_target,source,status,created_by) VALUES(?,?,?,'Plano alimentar inicial R-Fit',?,?, 'template','active',NULL)").bind(did,session.sub,active.id,answers.goal,kcal).run();
              const meals=[['Café da manhã',['Proteína (ovos, iogurte ou queijo)','Carboidrato (aveia, pão ou fruta)','Água'] ],['Almoço',['Proteína (frango, peixe, ovos ou leguminosas)','Arroz/batata/mandioca','Feijão e verduras/legumes','Água']],['Lanche',['Fruta + iogurte ou outra fonte proteica'] ],['Jantar',['Proteína','Carboidrato conforme fome/atividade','Verduras/legumes','Água']]];
              for(let i=0;i<meals.length;i++)await env.RFIT_DB.prepare("INSERT INTO diet_meals(id,diet_id,meal_order,meal_name,items_json,notes) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(),did,i+1,meals[i][0],JSON.stringify(meals[i][1]),'Estrutura geral; ajustar por preferências, restrições e orientação profissional.').run();
              await env.RFIT_DB.prepare("UPDATE diets SET goal=? WHERE id=?").bind(answers.goal+' | Proteína ~'+protein+' g/dia; Carboidratos ~'+carbs+' g/dia; Gorduras ~'+fats+' g/dia; água ~'+(water/1000).toFixed(2)+' L/dia. Estimativas iniciais, não prescrição clínica.',did).run();
            }
          }
        }
        // Mudança posterior da anamnese alerta o professor, mas não mexe nas fichas.
        if(previous){
          const prof=await env.RFIT_DB.prepare("SELECT id FROM users WHERE role IN ('professor','admin') AND status='active'").all();
          for(const p of (prof.results||[])){ const payload=JSON.stringify({title:'Anamnese atualizada',message:'O aluno atualizou a anamnese. Revise os dados antes de novos ajustes.',student_id:session.sub,url:'/professor/pages/portal/students/index.html'}); await env.RFIT_DB.prepare("INSERT INTO notifications(id,user_id,channel,template_code,payload_json,status,sent_at) VALUES(?,?,'in_app','anamnesis_updated',?,'sent',CURRENT_TIMESTAMP)").bind(crypto.randomUUID(),p.id,payload).run(); }
        }
        return reply({ok:true,completed:true,redirect:'/student/pages/portal/home/index.html'});
      }
      return reply({ok:false,error:'method_not_allowed'},405);
    }catch(error){console.error('student_anamnesis_failed',error?.message||'unknown');return reply({ok:false,error:'anamnesis_unavailable'},503);}
  }
  return null;
}
