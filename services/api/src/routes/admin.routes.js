/* R-FIT V2 | API ADMINISTRATIVA DO PROFESSOR
   Dados reais agregados do D1; somente professor/admin autenticado. */
import { getSession } from './auth.routes.js';

const noStore = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function adminRoutes(request, env, url) {
  if (!url.pathname.startsWith('/api/professor/')) return null;
  const isSupportInbox = url.pathname === '/api/professor/support';
  const supportThreadMatch = url.pathname.match(/^\/api\/professor\/support\/([^/]+)\/messages$/);
  const isSupportThread = Boolean(supportThreadMatch);
  const isSettings = url.pathname === '/api/professor/settings';
  const isFinance = url.pathname === '/api/professor/finance';
  const isStudentCollection = url.pathname === '/api/professor/students';
  const studentDetailMatch = url.pathname.match(/^\/api\/professor\/students\/([^/]+)$/);
  const workoutCreateMatch = url.pathname.match(/^\/api\/professor\/students\/([^/]+)\/workouts$/);
  const dietCreateMatch = url.pathname.match(/^\/api\/professor\/students\/([^/]+)\/diets$/);
  const isAnnouncementCollection = url.pathname === '/api/professor/announcements';
  const announcementMatch = url.pathname.match(/^\/api\/professor\/announcements\/([^/]+)$/);
  const isAnnouncementItem = Boolean(announcementMatch);
  const isPlanCollection = url.pathname === '/api/professor/plans';
  const planMatch = url.pathname.match(/^\/api\/professor\/plans\/([^/]+)$/);
  const isPlanItem = Boolean(planMatch);
  const isStudentStatus = /^\/api\/professor\/students\/[^/]+\/status$/.test(url.pathname);
  const testAccessMatch = url.pathname.match(/^\/api\/professor\/students\/([^/]+)\/test-access$/);
  const isTestAccess = Boolean(testAccessMatch);
  const journeyNoteMatch = url.pathname.match(/^\/api\/professor\/students\/([^/]+)\/journey-notes$/);
  const isJourneyNote = Boolean(journeyNoteMatch);

  if (request.method !== 'GET' && !(request.method === 'POST' && isSupportThread) && !(request.method === 'GET' && isFinance) && !(request.method === 'POST' && isStudentCollection) && !(request.method === 'GET' && studentDetailMatch) && !(request.method === 'POST' && workoutCreateMatch) && !(request.method === 'POST' && dietCreateMatch) && !(request.method === 'POST' && isAnnouncementCollection) && !(request.method === 'PATCH' && isAnnouncementItem) && !(request.method === 'GET' && isSupportInbox) && !(request.method === 'GET' && isSupportThread) && !(request.method === 'PUT' && isSettings) && !(request.method === 'PATCH' && isStudentStatus) && !(request.method === 'POST' && isTestAccess) && !(request.method === 'POST' && isJourneyNote) && !(request.method === 'POST' && isPlanCollection) && !(request.method === 'PATCH' && isPlanItem)) return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405, headers: noStore });

  const session = await getSession(request, env);
  if (!session || !['professor', 'admin'].includes(session.role)) {
    return Response.json({ ok: false, error: 'forbidden' }, { status: 403, headers: noStore });
  }

  try {
    /* ===== PERFIL COMPLETO DO ALUNO ===== */
    if (studentDetailMatch && request.method === 'GET') {
      const studentId=decodeURIComponent(studentDetailMatch[1]);
      const [student,measurements,workouts,diets,subscription]=await Promise.all([
        env.RFIT_DB.prepare(`SELECT u.id,u.full_name,u.email,u.phone,u.avatar_url,u.status,u.created_at,
          sp.birth_date,sp.sex,sp.height_cm,sp.weight_kg,sp.goal,sp.training_frequency,sp.experience_level,sp.anamnesis_completed_at
          FROM users u LEFT JOIN student_profiles sp ON sp.user_id=u.id WHERE u.id=? AND u.role='student'`).bind(studentId).first(),
        env.RFIT_DB.prepare('SELECT id,weight_kg,height_cm,body_fat_pct,waist_cm,hip_cm,measured_at,notes FROM student_measurements WHERE user_id=? ORDER BY measured_at DESC LIMIT 12').bind(studentId).all(),
        env.RFIT_DB.prepare('SELECT id,title,goal,weekly_frequency,status,created_at,updated_at FROM workouts WHERE user_id=? ORDER BY created_at DESC LIMIT 30').bind(studentId).all(),
        env.RFIT_DB.prepare('SELECT id,title,goal,calories_target,status,created_at,updated_at FROM diets WHERE user_id=? ORDER BY created_at DESC LIMIT 30').bind(studentId).all(),
        env.RFIT_DB.prepare(`SELECT s.id,s.status,s.starts_at,s.expires_at,s.billing_starts_at,s.lifetime,p.name AS plan_name,p.price_cents
          FROM subscriptions s JOIN plans p ON p.id=s.plan_id WHERE s.user_id=? ORDER BY s.created_at DESC LIMIT 1`).bind(studentId).first()
      ]);
      if(!student)return Response.json({ok:false,error:'student_not_found'},{status:404,headers:noStore});
      return Response.json({ok:true,student,measurements:measurements.results||[],workouts:workouts.results||[],diets:diets.results||[],subscription:subscription||null},{headers:noStore});
    }

    /* ===== CRIAR TREINO PERSONALIZADO ===== */
    if (workoutCreateMatch && request.method === 'POST') {
      const studentId=decodeURIComponent(workoutCreateMatch[1]);
      const student=await env.RFIT_DB.prepare("SELECT id FROM users WHERE id=? AND role='student'").bind(studentId).first();
      if(!student)return Response.json({ok:false,error:'student_not_found'},{status:404,headers:noStore});
      const body=await request.json(),title=String(body.title||'').trim().slice(0,140),goal=String(body.goal||'').trim().slice(0,500);
      const frequency=Number(body.weekly_frequency||3),sessions=Array.isArray(body.sessions)?body.sessions.slice(0,7):[];
      if(!title||!Number.isInteger(frequency)||frequency<1||frequency>7||!sessions.length)return Response.json({ok:false,error:'invalid_workout'},{status:400,headers:noStore});
      const id=crypto.randomUUID();
      await env.RFIT_DB.prepare("INSERT INTO workouts(id,user_id,title,goal,weekly_frequency,source,status,created_by) VALUES(?,?,?,?,?,'professor','active',?)").bind(id,studentId,title,goal,frequency,session.sub).run();
      for(let index=0;index<sessions.length;index++){
        const day=sessions[index],sessionId=crypto.randomUUID(),dayTitle=String(day.title||('Treino '+String.fromCharCode(65+index))).slice(0,100);
        await env.RFIT_DB.prepare('INSERT INTO workout_sessions(id,workout_id,day_number,title,notes) VALUES(?,?,?,?,?)').bind(sessionId,id,index+1,dayTitle,String(day.notes||'').slice(0,500)).run();
        const exercises=Array.isArray(day.exercises)?day.exercises.slice(0,20):[];
        for(let order=0;order<exercises.length;order++){
          const exercise=exercises[order],name=String(exercise.name||'').trim().slice(0,120);
          if(!name)continue;
          const sets=Number(exercise.sets||3),rest=Number(exercise.rest_seconds||60);
          if(!Number.isInteger(sets)||sets<1||sets>20||!Number.isInteger(rest)||rest<0||rest>1800)continue;
          await env.RFIT_DB.prepare('INSERT INTO workout_exercises(id,session_id,exercise_name,sets,reps,rest_seconds,order_index,notes) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),sessionId,name,sets,String(exercise.reps||'12').slice(0,30),rest,order,String(exercise.notes||'').slice(0,300)).run();
        }
      }
      await env.RFIT_DB.prepare('INSERT INTO audit_log(id,actor_user_id,action,entity_type,entity_id,metadata_json) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),session.sub,'workout.created','student',studentId,JSON.stringify({workout_id:id,title})).run();
      return Response.json({ok:true,id},{status:201,headers:noStore});
    }

    /* ===== CRIAR DIETA PERSONALIZADA ===== */
    if (dietCreateMatch && request.method === 'POST') {
      const studentId=decodeURIComponent(dietCreateMatch[1]);
      const student=await env.RFIT_DB.prepare("SELECT id FROM users WHERE id=? AND role='student'").bind(studentId).first();
      if(!student)return Response.json({ok:false,error:'student_not_found'},{status:404,headers:noStore});
      const body=await request.json(),title=String(body.title||'').trim().slice(0,140),goal=String(body.goal||'').trim().slice(0,500);
      const calories=body.calories_target===null||body.calories_target===''?null:Number(body.calories_target),meals=Array.isArray(body.meals)?body.meals.slice(0,12):[];
      if(!title||!meals.length||(calories!==null&&(!Number.isInteger(calories)||calories<500||calories>10000)))return Response.json({ok:false,error:'invalid_diet'},{status:400,headers:noStore});
      const id=crypto.randomUUID();
      await env.RFIT_DB.prepare("INSERT INTO diets(id,user_id,title,goal,calories_target,source,status,created_by) VALUES(?,?,?,?,?,'professor','active',?)").bind(id,studentId,title,goal,calories,session.sub).run();
      for(let index=0;index<meals.length;index++){
        const meal=meals[index],name=String(meal.name||'').trim().slice(0,100);
        if(!name)continue;
        const items=Array.isArray(meal.items)?meal.items.slice(0,30):[];
        await env.RFIT_DB.prepare('INSERT INTO diet_meals(id,diet_id,meal_order,meal_name,items_json,notes) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),id,index+1,name,JSON.stringify(items.map(v=>String(v).slice(0,300))),String(meal.notes||'').slice(0,500)).run();
      }
      await env.RFIT_DB.prepare('INSERT INTO audit_log(id,actor_user_id,action,entity_type,entity_id,metadata_json) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),session.sub,'diet.created','student',studentId,JSON.stringify({diet_id:id,title})).run();
      return Response.json({ok:true,id},{status:201,headers:noStore});
    }

    /* ===== FINANCEIRO: somente pagamentos registrados ===== */
    if (isFinance && request.method === 'GET') {
      const [totals, recent] = await Promise.all([
        env.RFIT_DB.prepare(`SELECT
          COALESCE(SUM(CASE WHEN status='approved' THEN amount_cents ELSE 0 END),0) AS received_cents,
          COALESCE(SUM(CASE WHEN status='pending' THEN amount_cents ELSE 0 END),0) AS pending_cents,
          COALESCE(SUM(CASE WHEN status='refunded' THEN amount_cents ELSE 0 END),0) AS refunded_cents,
          COUNT(CASE WHEN status='approved' THEN 1 END) AS approved_count,
          COUNT(CASE WHEN status='pending' THEN 1 END) AS pending_count
          FROM payments`).first(),
        env.RFIT_DB.prepare(`SELECT pay.id,pay.amount_cents,pay.currency,pay.status,pay.provider,pay.paid_at,pay.created_at,
          u.id AS student_id,u.full_name,u.email,p.name AS plan_name
          FROM payments pay JOIN users u ON u.id=pay.user_id
          LEFT JOIN subscriptions sub ON sub.id=pay.subscription_id
          LEFT JOIN plans p ON p.id=sub.plan_id
          ORDER BY pay.created_at DESC LIMIT 100`).all()
      ]);
      const month = await env.RFIT_DB.prepare(`SELECT COALESCE(SUM(amount_cents),0) AS total_cents,COUNT(*) AS count
        FROM payments WHERE status='approved' AND date(paid_at) >= date('now','start of month')`).first();
      const schedule = await env.RFIT_DB.prepare(`SELECT
        COUNT(CASE WHEN date(s.billing_starts_at) BETWEEN date('now') AND date('now','+30 days') THEN 1 END) AS upcoming_count,
        COALESCE(SUM(CASE WHEN date(s.billing_starts_at) BETWEEN date('now') AND date('now','+30 days') THEN p.price_cents ELSE 0 END),0) AS upcoming_cents,
        COUNT(CASE WHEN date(s.billing_starts_at)<date('now') THEN 1 END) AS overdue_count
        FROM subscriptions s JOIN plans p ON p.id=s.plan_id
        WHERE s.status='active' AND s.billing_starts_at IS NOT NULL`).first();
      const billingRows = await env.RFIT_DB.prepare(`SELECT u.full_name,u.email,p.name AS plan_name,p.price_cents,s.billing_starts_at
        FROM subscriptions s JOIN users u ON u.id=s.user_id JOIN plans p ON p.id=s.plan_id
        WHERE s.status='active' AND s.billing_starts_at IS NOT NULL
        ORDER BY s.billing_starts_at ASC LIMIT 100`).all();
      return Response.json({ok:true,totals:totals||{},month:month||{},schedule:schedule||{},billing_schedule:billingRows.results||[],payments:recent.results||[]},{headers:noStore});
    }

    /* ===== CADASTRO ADMINISTRATIVO DE ALUNO ===== */
    if (isStudentCollection && request.method === 'POST') {
      const body = await request.json();
      const name = String(body.name || '').trim().replace(/\s+/g, ' ');
      const email = String(body.email || '').trim().toLowerCase();
      const phone = String(body.phone || '').trim();
      const planId = String(body.plan_id || '').trim();
      const courtesy = body.courtesy === true;
      const delay = Number(body.billing_delay_days ?? 30);
      if (name.length < 2 || name.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !planId || !Number.isInteger(delay) || delay < 0 || delay > 365) {
        return Response.json({ok:false,error:'invalid_student_data'},{status:400,headers:noStore});
      }
      const plan = await env.RFIT_DB.prepare('SELECT id,code,name,duration_days,lifetime,is_active FROM plans WHERE id=? AND is_active=1').bind(planId).first();
      if (!plan) return Response.json({ok:false,error:'plan_unavailable'},{status:400,headers:noStore});
      const id = crypto.randomUUID();
      const temporaryPassword = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2,'0')).join('');
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(temporaryPassword),{name:'PBKDF2'},false,['deriveBits']);
      const bits = new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:100000},key,256));
      const encode = bytes => btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
      const passwordHash = ['pbkdf2-sha256','100000',encode(salt),encode(bits)].join('$');
      const now=new Date();
      const billingDate=courtesy?null:new Date(now.getTime()+delay*86400000).toISOString();
      const expiry=courtesy||plan.lifetime?null:(billingDate||new Date(now.getTime()+Math.max(1,Number(plan.duration_days)||30)*86400000).toISOString());
      const subscriptionId=crypto.randomUUID();
      try {
        await env.RFIT_DB.batch([
          env.RFIT_DB.prepare("INSERT INTO users(id,email,full_name,phone,password_hash,role,status) VALUES(?,?,?,?,?,'student','active')").bind(id,email,name,phone||null,passwordHash),
          env.RFIT_DB.prepare('INSERT INTO student_profiles(user_id) VALUES(?)').bind(id),
          env.RFIT_DB.prepare("INSERT INTO subscriptions(id,user_id,plan_id,status,starts_at,expires_at,lifetime,billing_starts_at,billing_cycle,payment_provider) VALUES(?,?,?,'active',?,?,?,?,?,'manual')").bind(subscriptionId,id,plan.id,now.toISOString(),expiry,plan.lifetime?1:0,billingDate,'monthly'),
          env.RFIT_DB.prepare('INSERT INTO audit_log(id,actor_user_id,action,entity_type,entity_id,metadata_json) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),session.sub,'student.created','user',id,JSON.stringify({plan_id:plan.id,courtesy,billing_starts_at:billingDate}))
        ]);
        return Response.json({ok:true,student:{id,name,email,plan_name:plan.name,courtesy,billing_starts_at:billingDate},temporary_password:temporaryPassword,delivery:'manual'},{status:201,headers:noStore});
      } catch(error) {
        if(String(error?.message||'').toLowerCase().includes('unique'))return Response.json({ok:false,error:'email_already_registered'},{status:409,headers:noStore});
        throw error;
      }
    }

    /* ===== AVISOS DO PORTAL ===== */
    if (isAnnouncementCollection && request.method === 'GET') {
      const rows=await env.RFIT_DB.prepare('SELECT id,title,message,audience,target_user_ids_json,starts_at,ends_at,is_active,require_acknowledgement,created_at FROM portal_announcements ORDER BY created_at DESC LIMIT 100').all();
      return Response.json({ok:true,announcements:rows.results||[]},{headers:noStore});
    }
    if (isAnnouncementCollection && request.method === 'POST') {
      const body=await request.json();
      const title=String(body.title||'').trim().slice(0,120), message=String(body.message||'').trim().slice(0,2000);
      const audience=body.audience==='selected'?'selected':'all';
      const ids=Array.isArray(body.target_user_ids)?body.target_user_ids.filter(v=>typeof v==='string').slice(0,200):[];
      if(!title||!message||(audience==='selected'&&!ids.length))return Response.json({ok:false,error:'invalid_announcement'},{status:400,headers:noStore});
      if(ids.length){const placeholders=ids.map(()=>'?').join(',');const found=await env.RFIT_DB.prepare(`SELECT COUNT(*) AS total FROM users WHERE role='student' AND id IN (${placeholders})`).bind(...ids).first();if(Number(found?.total||0)!==ids.length)return Response.json({ok:false,error:'invalid_targets'},{status:400,headers:noStore});}
      const id=crypto.randomUUID();
      await env.RFIT_DB.prepare('INSERT INTO portal_announcements(id,title,message,audience,target_user_ids_json,starts_at,ends_at,is_active,require_acknowledgement,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,title,message,audience,JSON.stringify(ids),body.starts_at||null,body.ends_at||null,body.is_active===false?0:1,body.require_acknowledgement?1:0,session.sub).run();
      return Response.json({ok:true,id},{status:201,headers:noStore});
    }
    if (isAnnouncementItem && request.method === 'PATCH') {
      const id=decodeURIComponent(announcementMatch[1]),body=await request.json();
      const active=body.is_active===true?1:body.is_active===false?0:null;
      if(active===null)return Response.json({ok:false,error:'invalid_announcement_update'},{status:400,headers:noStore});
      const result=await env.RFIT_DB.prepare('UPDATE portal_announcements SET is_active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(active,id).run();
      if(!result.meta?.changes)return Response.json({ok:false,error:'announcement_not_found'},{status:404,headers:noStore});
      return Response.json({ok:true},{headers:noStore});
    }

    if (isSupportInbox && request.method === 'GET') {
      const rows=await env.RFIT_DB.prepare(`SELECT u.id AS student_id,u.full_name,u.avatar_url,
        (SELECT body FROM support_messages m WHERE m.student_user_id=u.id ORDER BY m.created_at DESC,m.id DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM support_messages m WHERE m.student_user_id=u.id ORDER BY m.created_at DESC,m.id DESC LIMIT 1) AS last_message_at,
        (SELECT sender_role FROM support_messages m WHERE m.student_user_id=u.id ORDER BY m.created_at DESC,m.id DESC LIMIT 1) AS last_sender_role,
        (SELECT COUNT(*) FROM support_messages m WHERE m.student_user_id=u.id AND m.sender_role='student' AND m.read_at IS NULL) AS unread_count
        FROM users u WHERE u.role='student' AND EXISTS(SELECT 1 FROM support_messages m WHERE m.student_user_id=u.id)
        ORDER BY last_message_at DESC LIMIT 200`).all();
      return Response.json({ok:true,conversations:rows.results||[]},{headers:noStore});
    }
    if (isSupportThread && request.method === 'GET') {
      const studentId=decodeURIComponent(supportThreadMatch[1]);
      const student=await env.RFIT_DB.prepare("SELECT id,full_name,avatar_url FROM users WHERE id=? AND role='student'").bind(studentId).first();
      if(!student)return Response.json({ok:false,error:'student_not_found'},{status:404,headers:noStore});
      await env.RFIT_DB.prepare("UPDATE support_messages SET read_at=CURRENT_TIMESTAMP WHERE student_user_id=? AND sender_role='student' AND read_at IS NULL").bind(studentId).run();
      const [rows,professor]=await Promise.all([
        env.RFIT_DB.prepare("SELECT id,sender_role,body,created_at,read_at FROM support_messages WHERE student_user_id=? ORDER BY created_at ASC,id ASC LIMIT 300").bind(studentId).all(),
        env.RFIT_DB.prepare("SELECT full_name,avatar_url FROM users WHERE id=? AND role IN ('professor','admin') LIMIT 1").bind(session.sub).first()
      ]);
      return Response.json({ok:true,student,professor:professor||{full_name:session.name||'Professor',avatar_url:null},messages:rows.results||[]},{headers:noStore});
    }
    if (isSupportThread && request.method === 'POST') {
      const studentId=decodeURIComponent(supportThreadMatch[1]);
      const student=await env.RFIT_DB.prepare("SELECT id FROM users WHERE id=? AND role='student'").bind(studentId).first();
      if(!student)return Response.json({ok:false,error:'student_not_found'},{status:404,headers:noStore});
      const body=await request.json(), message=String(body.message||'').trim();
      if(!message||message.length>3000)return Response.json({ok:false,error:'invalid_message'},{status:400,headers:noStore});
      const id=crypto.randomUUID();
      await env.RFIT_DB.prepare("INSERT INTO support_messages(id,student_user_id,sender_user_id,sender_role,body) VALUES(?,?,?,?,?)").bind(id,studentId,session.sub,session.role,message).run();
      return Response.json({ok:true,id,created_at:new Date().toISOString()},{status:201,headers:noStore});
    }


    if (isJourneyNote && request.method === 'POST') {
      const studentId=decodeURIComponent(journeyNoteMatch[1]);
      const student=await env.RFIT_DB.prepare("SELECT id FROM users WHERE id=? AND role='student'").bind(studentId).first();
      if(!student)return Response.json({ok:false,error:'student_not_found'},{status:404,headers:noStore});
      const body=await request.json();
      const note=String(body.note||'').trim().slice(0,1200);
      if(!note)return Response.json({ok:false,error:'empty_note'},{status:400,headers:noStore});
      const id=crypto.randomUUID();
      await env.RFIT_DB.prepare("INSERT INTO student_journey_notes(id,user_id,author_user_id,note) VALUES(?,?,?,?)").bind(id,studentId,session.sub,note).run();
      await env.RFIT_DB.prepare("INSERT INTO audit_log(id,actor_user_id,action,entity_type,entity_id,metadata_json) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(),session.sub,'journey.note_added','student',studentId,JSON.stringify({note_id:id})).run();
      return Response.json({ok:true,id},{status:201,headers:noStore});
    }

    if (isSettings && request.method === 'GET') {
      const rows = await env.RFIT_DB.prepare('SELECT setting_key,setting_value,updated_at FROM portal_settings ORDER BY setting_key').all();
      return Response.json({ok:true,settings:Object.fromEntries((rows.results||[]).map(r=>[r.setting_key,{value:r.setting_value,updated_at:r.updated_at}]))},{headers:noStore});
    }
    if (isSettings && request.method === 'PUT') {
      const body = await request.json();
      const allowed = new Set(['consultancy_name','login_title','login_message','registration_enabled','maintenance_mode']);
      const entries = Object.entries(body.settings || {}).map(([key,value]) => [key, typeof value === 'boolean' ? String(value) : value]);
      if (!entries.length || entries.some(([key,value])=>!allowed.has(key) || typeof value !== 'string' || value.length > 1000)) return Response.json({ok:false,error:'invalid_settings'},{status:400,headers:noStore});
      for (const [key,value] of entries) await env.RFIT_DB.prepare('INSERT INTO portal_settings(setting_key,setting_value,updated_by,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP').bind(key,value,session.sub).run();
      await env.RFIT_DB.prepare('INSERT INTO audit_log(id,actor_user_id,action,entity_type,metadata_json) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),session.sub,'settings.updated','portal_settings',JSON.stringify({keys:entries.map(([key])=>key)})).run();
      return Response.json({ok:true},{headers:noStore});
    }
    if (isPlanCollection && request.method === 'GET') {
      const rows=await env.RFIT_DB.prepare('SELECT id,code,name,description,price_cents,duration_days,lifetime,includes_training,includes_nutrition,is_active,created_at,updated_at FROM plans ORDER BY created_at').all();
      return Response.json({ok:true,plans:rows.results||[]},{headers:noStore});
    }
    if (isPlanCollection && request.method === 'POST') {
      const body=await request.json();
      const name=String(body.name||'').trim().slice(0,120); const description=String(body.description||'').trim().slice(0,1000);
      const price=Number(body.price_cents); const days=body.duration_days===null?null:Number(body.duration_days);
      if (!name || !Number.isInteger(price) || price<0 || (days!==null && (!Number.isInteger(days)||days<1))) return Response.json({ok:false,error:'invalid_plan'},{status:400,headers:noStore});
      const id=crypto.randomUUID(); const code=String(body.code||name.toLowerCase().replace(/[^a-z0-9]+/g,'-')).slice(0,80);
      await env.RFIT_DB.prepare('INSERT INTO plans(id,code,name,description,price_cents,duration_days,lifetime,includes_training,includes_nutrition,is_active) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,code,name,description,price,days,body.lifetime?1:0,body.includes_training?1:0,body.includes_nutrition?1:0,body.is_active===false?0:1).run();
      await env.RFIT_DB.prepare('INSERT INTO audit_log(id,actor_user_id,action,entity_type,entity_id,metadata_json) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),session.sub,'plan.created','plan',id,JSON.stringify({name,price_cents:price})).run();
      return Response.json({ok:true,id},{status:201,headers:noStore});
    }
    if (isPlanItem && request.method === 'PATCH') {
      const id = decodeURIComponent(planMatch[1]);
      const body = await request.json();
      const current = await env.RFIT_DB.prepare('SELECT id,name,description,price_cents,duration_days,lifetime,includes_training,includes_nutrition,is_active FROM plans WHERE id=?').bind(id).first();
      if (!current) return Response.json({ok:false,error:'plan_not_found'},{status:404,headers:noStore});
      const name = body.name === undefined ? current.name : String(body.name).trim().slice(0,120);
      const description = body.description === undefined ? current.description : String(body.description).trim().slice(0,1000);
      const price = body.price_cents === undefined ? current.price_cents : Number(body.price_cents);
      const days = body.duration_days === undefined ? current.duration_days : (body.duration_days === null ? null : Number(body.duration_days));
      const lifetime = body.lifetime === undefined ? current.lifetime : (body.lifetime ? 1 : 0);
      const active = body.is_active === undefined ? current.is_active : (body.is_active ? 1 : 0);
      if (!name || !Number.isInteger(price) || price < 0 || (days !== null && (!Number.isInteger(days) || days < 1))) return Response.json({ok:false,error:'invalid_plan'},{status:400,headers:noStore});
      await env.RFIT_DB.prepare('UPDATE plans SET name=?,description=?,price_cents=?,duration_days=?,lifetime=?,includes_training=?,includes_nutrition=?,is_active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(name,description,price,days,lifetime,body.includes_training===undefined?current.includes_training:(body.includes_training?1:0),body.includes_nutrition===undefined?current.includes_nutrition:(body.includes_nutrition?1:0),active,id).run();
      await env.RFIT_DB.prepare('INSERT INTO audit_log(id,actor_user_id,action,entity_type,entity_id,metadata_json) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),session.sub,'plan.updated','plan',id,JSON.stringify({name,price_cents:price,is_active:active})).run();
      return Response.json({ok:true},{headers:noStore});
    }
    if (isTestAccess && request.method === 'POST') {
      const id = decodeURIComponent(testAccessMatch[1]);
      const student = await env.RFIT_DB.prepare("SELECT id,email FROM users WHERE id=? AND role='student'").bind(id).first();
      if (!student) return Response.json({ok:false,error:'student_not_found'},{status:404,headers:noStore});
      // Temporário e restrito a contas claramente identificadas como teste.
      if (!/(teste|test)/i.test(String(student.email || ''))) return Response.json({ok:false,error:'test_account_only'},{status:403,headers:noStore});
      const plan = await env.RFIT_DB.prepare("SELECT id,duration_days FROM plans WHERE code='combo' AND is_active=1 LIMIT 1").first()
        || await env.RFIT_DB.prepare("SELECT id,duration_days FROM plans WHERE is_active=1 ORDER BY created_at LIMIT 1").first();
      if (!plan) return Response.json({ok:false,error:'plan_unavailable'},{status:409,headers:noStore});
      const now = new Date();
      const expires = new Date(now.getTime() + 30 * 86400000).toISOString();
      const current = await env.RFIT_DB.prepare("SELECT id FROM subscriptions WHERE user_id=? ORDER BY created_at DESC LIMIT 1").bind(id).first();
      const subscriptionId = current?.id || crypto.randomUUID();
      if (current) {
        await env.RFIT_DB.prepare("UPDATE subscriptions SET plan_id=?,status='active',starts_at=?,expires_at=?,lifetime=0,payment_provider='manual_test',provider_subscription_id='temporary-30-day-test',updated_at=CURRENT_TIMESTAMP WHERE id=?")
          .bind(plan.id,now.toISOString(),expires,subscriptionId).run();
      } else {
        await env.RFIT_DB.prepare("INSERT INTO subscriptions(id,user_id,plan_id,status,starts_at,expires_at,lifetime,payment_provider,provider_subscription_id) VALUES(?,?,?,'active',?,?,0,'manual_test','temporary-30-day-test')")
          .bind(subscriptionId,id,plan.id,now.toISOString(),expires).run();
      }
      await env.RFIT_DB.prepare("UPDATE users SET status='active',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
      await env.RFIT_DB.prepare("INSERT INTO audit_log(id,actor_user_id,action,entity_type,entity_id,metadata_json) VALUES(?,?,?,?,?,?)")
        .bind(crypto.randomUUID(),session.sub,'temporary_test_access_granted','user',id,JSON.stringify({days:30,expires_at:expires,provider:'manual_test'})).run();
      return Response.json({ok:true,expires_at:expires,days:30},{headers:noStore});
    }
    if (isStudentStatus && request.method === 'PATCH') {
      const id=decodeURIComponent(url.pathname.split('/')[4]); const body=await request.json();
      if (!['active','pending','suspended'].includes(body.status)) return Response.json({ok:false,error:'invalid_status'},{status:400,headers:noStore});
      const old=await env.RFIT_DB.prepare("SELECT id,status FROM users WHERE id=? AND role='student'").bind(id).first();
      if (!old) return Response.json({ok:false,error:'student_not_found'},{status:404,headers:noStore});
      await env.RFIT_DB.prepare('UPDATE users SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(body.status,id).run();
      await env.RFIT_DB.prepare('INSERT INTO audit_log(id,actor_user_id,action,entity_type,entity_id,metadata_json) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),session.sub,'student.status_changed','user',id,JSON.stringify({from:old.status,to:body.status})).run();
      return Response.json({ok:true},{headers:noStore});
    }
    if (url.pathname === '/api/professor/overview') {
      const [users, plans, subscriptions, anamneses] = await Promise.all([
        env.RFIT_DB.prepare(`SELECT COUNT(*) AS total,
          SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,
          SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN status='suspended' THEN 1 ELSE 0 END) AS suspended
          FROM users WHERE role='student'`).first(),
        env.RFIT_DB.prepare('SELECT COUNT(*) AS total FROM plans WHERE is_active=1').first(),
        env.RFIT_DB.prepare(`SELECT
          SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,
          SUM(CASE WHEN status='pending_payment' THEN 1 ELSE 0 END) AS pending_payment,
          SUM(CASE WHEN status IN ('expired','cancelled','past_due') THEN 1 ELSE 0 END) AS inactive
          FROM subscriptions`).first(),
        env.RFIT_DB.prepare(`SELECT COUNT(*) AS total FROM student_profiles sp
          JOIN users u ON u.id=sp.user_id
          WHERE u.role='student' AND sp.anamnesis_completed_at IS NULL`).first()
      ]);
      return Response.json({ ok: true, students: users, plans, subscriptions, anamnesis_pending: Number(anamneses?.total || 0) }, { headers: noStore });
    }

    if (url.pathname === '/api/professor/students') {
      const rows = await env.RFIT_DB.prepare(`SELECT u.id,u.full_name,u.email,u.avatar_url,u.status,u.created_at,
        sp.anamnesis_completed_at,
        (SELECT MAX(an.version) FROM anamneses an WHERE an.user_id=u.id) AS anamnesis_version,
        s.status AS subscription_status,p.name AS plan_name,
        (SELECT pay.status FROM payments pay WHERE pay.user_id=u.id ORDER BY pay.created_at DESC LIMIT 1) AS payment_status
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id=u.id
        LEFT JOIN subscriptions s ON s.id=(SELECT s2.id FROM subscriptions s2 WHERE s2.user_id=u.id ORDER BY s2.created_at DESC LIMIT 1)
        LEFT JOIN plans p ON p.id=s.plan_id
        WHERE u.role='student'
        ORDER BY u.created_at DESC LIMIT 200`).all();
      return Response.json({ ok: true, students: rows.results || [] }, { headers: noStore });
    }
    return Response.json({ ok: false, error: 'not_found' }, { status: 404, headers: noStore });
  } catch (error) {
    console.error('professor_admin_query_failed', error?.message || 'unknown');
    return Response.json({ ok: false, error: 'admin_data_unavailable' }, { status: 503, headers: noStore });
  }
}
