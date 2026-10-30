/* R-Fit V2 | catálogo de planos e anamnese do aluno. */
import { getSession } from './auth.routes.js';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const reply=(data,status=200)=>Response.json(data,{status,headers});

export async function studentRoutes(request, env, url) {
  if (url.pathname === '/api/student/dashboard') {
    if (request.method !== 'GET') return reply({ok:false,error:'method_not_allowed'},405);
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    try {
      const user=await env.RFIT_DB.prepare("SELECT full_name,email,phone,avatar_url FROM users WHERE id=? AND role='student' LIMIT 1").bind(session.sub).first();
      const profile=await env.RFIT_DB.prepare("SELECT height_cm,weight_kg,goal,restrictions_json,anamnesis_completed_at FROM student_profiles WHERE user_id=? LIMIT 1").bind(session.sub).first();
      const sub=await env.RFIT_DB.prepare("SELECT s.id,s.status,s.expires_at,s.lifetime,s.created_at,s.payment_provider,p.code AS plan_code,p.name AS plan_name,p.includes_training,p.includes_nutrition FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=? ORDER BY s.created_at DESC LIMIT 1").bind(session.sub).first();
      const measurement=await env.RFIT_DB.prepare("SELECT weight_kg,height_cm,waist_cm,basal_kcal,measured_at FROM student_measurements WHERE user_id=? ORDER BY measured_at DESC LIMIT 1").bind(session.sub).first();
      const latestCheckin=await env.RFIT_DB.prepare("SELECT weight_kg,checkin_date,created_at FROM daily_checkins WHERE user_id=? AND weight_kg IS NOT NULL ORDER BY checkin_date DESC,created_at DESC LIMIT 1").bind(session.sub).first();
      const latestAnamnesis=await env.RFIT_DB.prepare('SELECT answers_json,completed_at FROM anamneses WHERE user_id=? ORDER BY completed_at DESC LIMIT 1').bind(session.sub).first();
      let anamnesisAnswers=null;try{anamnesisAnswers=latestAnamnesis?.answers_json?JSON.parse(latestAnamnesis.answers_json):null}catch{}
      const workout=await env.RFIT_DB.prepare("SELECT id,title,created_at FROM workouts WHERE user_id=? AND status='active' ORDER BY created_at DESC LIMIT 1").bind(session.sub).first();
      const diet=await env.RFIT_DB.prepare("SELECT id,title,created_at FROM diets WHERE user_id=? AND status='active' ORDER BY created_at DESC LIMIT 1").bind(session.sub).first();
      const measurementDate=measurement?.measured_at?new Date(measurement.measured_at).getTime():0;
      const checkinDate=latestCheckin?.created_at||latestCheckin?.checkin_date;
      const checkinTime=checkinDate?new Date(checkinDate).getTime():0;
      const checkinIsLatest=Boolean(latestCheckin?.weight_kg!==null&&latestCheckin?.weight_kg!==undefined&&checkinTime>=measurementDate);
      const currentWeight=checkinIsLatest?latestCheckin.weight_kg:(measurement?.weight_kg??profile?.weight_kg??null);
      const height=Number(measurement?.height_cm||profile?.height_cm||0)/100;
      const weight=Number(currentWeight||0);
      const bmi=height>0&&weight>0?Math.round(weight/(height*height)*10)/10:null;
      const validExpiry=sub?.expires_at?new Date(sub.expires_at).getTime():null;
      const isExpired=Boolean(sub&&!Number(sub.lifetime)&&validExpiry!==null&&Number.isFinite(validExpiry)&&validExpiry<=Date.now());
      const days=sub&&!Number(sub.lifetime)&&validExpiry!==null&&Number.isFinite(validExpiry)?Math.max(0,Math.ceil((validExpiry-Date.now())/86400000)):null;
      let healthInfo={};try{healthInfo=JSON.parse(profile?.restrictions_json||'{}')}catch{}; return reply({ok:true,student:{name:user?.full_name||session.name||'',email:user?.email||session.email||'',phone:user?.phone||'',avatar_url:user?.avatar_url||''},subscription:sub?{plan_name:sub.plan_name||'Plano R-Fit',plan_code:sub.plan_code,status:sub.status,lifetime:Number(sub.lifetime),expires_at:sub.expires_at,days_remaining:days,is_expired:isExpired,access_type:sub.lifetime?'lifetime':(/courtesy|cortesia|manual/i.test(String(sub.payment_provider||''))?'courtesy':'standard'),includes_training:Number(sub.includes_training),includes_nutrition:Number(sub.includes_nutrition)}:null,anamnesis_completed:Boolean(profile?.anamnesis_completed_at),anamnesis_answers:anamnesisAnswers,health_info:healthInfo,body:{weight_kg:currentWeight,bmi,waist_cm:measurement?.waist_cm??null,basal_kcal:measurement?.basal_kcal??null,measured_at:checkinIsLatest?checkinDate:(measurement?.measured_at||profile?.anamnesis_completed_at||null),weight_source:checkinIsLatest?'checkin':measurement?.weight_kg!==null&&measurement?.weight_kg!==undefined?'evaluation':'anamnesis'},workout_available:Boolean(workout),workout_title:workout?.title||'',diet_available:Boolean(diet),diet_title:diet?.title||''});
    } catch(error) { console.error('student_dashboard_failed',error?.message||'unknown'); return reply({ok:false,error:'dashboard_unavailable'},503); }
  }
  if (url.pathname === '/api/student/measurements') {
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    if(request.method!=='GET')return reply({ok:false,error:'method_not_allowed'},405);
    try{
      const result=await env.RFIT_DB.prepare("SELECT id,weight_kg,height_cm,waist_cm,basal_kcal,measured_at FROM student_measurements WHERE user_id=? ORDER BY measured_at ASC").bind(session.sub).all();
      const measurements=(result.results||[]).map(row=>{const height=Number(row.height_cm||0)/100,weight=Number(row.weight_kg||0);return {...row,bmi:height>0&&weight>0?Math.round(weight/(height*height)*10)/10:null};});
      return reply({ok:true,measurements});
    }catch(error){console.error('student_measurement_history_failed',error?.message||'unknown');return reply({ok:false,error:'measurement_history_unavailable'},503);}
  }
  if (url.pathname === '/api/student/checkins') {
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    if(request.method!=='GET')return reply({ok:false,error:'method_not_allowed'},405);
    try{
      const result=await env.RFIT_DB.prepare("SELECT id,checkin_date,weight_kg,sleep_quality,energy,appetite,training_adherence,nutrition_adherence,discomfort,notes,created_at,updated_at FROM daily_checkins WHERE user_id=? ORDER BY checkin_date DESC,created_at DESC LIMIT 90").bind(session.sub).all();
      return reply({ok:true,checkins:result.results||[],total:(result.results||[]).length});
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
      if(weight!==null&&(!Number.isFinite(weight)||weight<20||weight>400))return reply({ok:false,error:'invalid_weight'},400);
      const notes=String(body.notes||'').trim().slice(0,2000);
      const discomfort=body.discomfort?1:0;
      const id=crypto.randomUUID();
      const savedAt=new Date().toISOString();
      await env.RFIT_DB.prepare("INSERT INTO daily_checkins(id,user_id,checkin_date,weight_kg,sleep_quality,energy,appetite,training_adherence,nutrition_adherence,discomfort,notes,created_at,updated_at) VALUES(?,?,date('now'),?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,checkin_date) DO UPDATE SET weight_kg=excluded.weight_kg,sleep_quality=excluded.sleep_quality,energy=excluded.energy,appetite=excluded.appetite,training_adherence=excluded.training_adherence,nutrition_adherence=excluded.nutrition_adherence,discomfort=excluded.discomfort,notes=excluded.notes,updated_at=excluded.updated_at")
        .bind(id,session.sub,weight,Number(body.sleep_quality),Number(body.energy),Number(body.appetite),Number(body.training_adherence),Number(body.nutrition_adherence),discomfort,notes,savedAt,savedAt).run();
      return reply({ok:true,saved:true,message:'Check-in salvo com sucesso.'});
    }catch(error){console.error('student_daily_checkin_failed',error?.message||'unknown');return reply({ok:false,error:'checkin_save_failed'},503);}
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
            if(JSON.stringify(stable(answers))===JSON.stringify(stable(previousAnswers)))return reply({ok:true,completed:true,unchanged:true,completed_at:previous.completed_at||null});
          }catch{}
        }
        const completedAt=new Date().toISOString();
        const nextVersion=Number(previous?.version||0)+1;
        await env.RFIT_DB.prepare("INSERT INTO anamneses(id,user_id,version,answers_json,completed_at) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),session.sub,nextVersion,JSON.stringify(answers),completedAt).run();
        await env.RFIT_DB.prepare("UPDATE student_profiles SET birth_date=?,sex=?,height_cm=?,weight_kg=?,goal=?,training_frequency=?,experience_level=?,restrictions_json=?,anamnesis_completed_at=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?").bind(answers.birth_date,answers.sex,Number(answers.height_cm),Number(answers.weight_kg),answers.goal,Number(answers.training_frequency),answers.experience_level,JSON.stringify({health_conditions:answers.health_conditions,medications:answers.medications,allergies:answers.allergies,restrictions:answers.restrictions,additional_notes:answers.additional_notes}),completedAt,session.sub).run();
        return reply({ok:true,completed:true,redirect:'/student/pages/portal/home/index.html'});
      }
      return reply({ok:false,error:'method_not_allowed'},405);
    }catch(error){console.error('student_anamnesis_failed',error?.message||'unknown');return reply({ok:false,error:'anamnesis_unavailable'},503);}
  }
  return null;
}
