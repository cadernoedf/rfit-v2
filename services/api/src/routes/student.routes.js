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
      const profile=await env.RFIT_DB.prepare("SELECT height_cm,weight_kg,goal,anamnesis_completed_at FROM student_profiles WHERE user_id=? LIMIT 1").bind(session.sub).first();
      const sub=await env.RFIT_DB.prepare("SELECT s.id,s.status,s.expires_at,s.lifetime,p.code AS plan_code,p.name AS plan_name,p.includes_training,p.includes_nutrition FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=? AND s.status='active' AND (s.lifetime=1 OR s.expires_at IS NULL OR s.expires_at>CURRENT_TIMESTAMP) ORDER BY s.created_at DESC LIMIT 1").bind(session.sub).first();
      const measurement=await env.RFIT_DB.prepare("SELECT weight_kg,height_cm,waist_cm,measured_at FROM student_measurements WHERE user_id=? ORDER BY measured_at DESC LIMIT 1").bind(session.sub).first();
      const workout=await env.RFIT_DB.prepare("SELECT id,title,created_at FROM workouts WHERE user_id=? AND status='active' ORDER BY created_at DESC LIMIT 1").bind(session.sub).first();
      const diet=await env.RFIT_DB.prepare("SELECT id,title,created_at FROM diets WHERE user_id=? AND status='active' ORDER BY created_at DESC LIMIT 1").bind(session.sub).first();
      const height=Number(measurement?.height_cm||profile?.height_cm||0)/100;
      const weight=Number(measurement?.weight_kg||profile?.weight_kg||0);
      const bmi=height>0&&weight>0?Math.round(weight/(height*height)*10)/10:null;
      const days=sub&&!Number(sub.lifetime)&&sub.expires_at?Math.max(0,Math.ceil((new Date(sub.expires_at).getTime()-Date.now())/86400000)):null;
      return reply({ok:true,student:{name:user?.full_name||session.name||'',email:user?.email||session.email||'',phone:user?.phone||'',avatar_url:user?.avatar_url||''},subscription:sub?{plan_name:sub.plan_name||'Plano R-Fit',plan_code:sub.plan_code,lifetime:Number(sub.lifetime),expires_at:sub.expires_at,days_remaining:days,includes_training:Number(sub.includes_training),includes_nutrition:Number(sub.includes_nutrition)}:null,anamnesis_completed:Boolean(profile?.anamnesis_completed_at),body:{bmi,waist_cm:measurement?.waist_cm??null,measured_at:measurement?.measured_at||null},workout_available:Boolean(workout),workout_title:workout?.title||'',diet_available:Boolean(diet),diet_title:diet?.title||''});
    } catch(error) { console.error('student_dashboard_failed',error?.message||'unknown'); return reply({ok:false,error:'dashboard_unavailable'},503); }
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
      const subscription=await env.RFIT_DB.prepare("SELECT s.id,s.status,s.expires_at,s.lifetime,s.created_at,p.code AS plan_code,p.name AS plan_name,p.includes_training,p.includes_nutrition FROM subscriptions s LEFT JOIN plans p ON p.id=s.plan_id WHERE s.user_id=? AND s.status='active' AND (s.lifetime=1 OR s.expires_at IS NULL OR s.expires_at>CURRENT_TIMESTAMP) ORDER BY s.created_at DESC LIMIT 1").bind(session.sub).first();
      if(!subscription)return reply({ok:true,subscription:null});
      let days_remaining=null;
      if(!Number(subscription.lifetime) && subscription.expires_at) {
        days_remaining=Math.max(0,Math.ceil((new Date(subscription.expires_at).getTime()-Date.now())/86400000));
      }
      return reply({ok:true,subscription:{...subscription,days_remaining}});
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
        const required=['birth_date','sex','height_cm','weight_kg','goal','training_frequency','experience_level','health_conditions','medications','allergies'];
        if(required.some(key=>!answers[key])||!/^\d{4}-\d{2}-\d{2}$/.test(answers.birth_date)||!Number.isFinite(Number(answers.height_cm))||Number(answers.height_cm)<80||Number(answers.height_cm)>250||!Number.isFinite(Number(answers.weight_kg))||Number(answers.weight_kg)<20||Number(answers.weight_kg)>400)return reply({ok:false,error:'required_fields_missing'},400);
        const completedAt=new Date().toISOString();
        await env.RFIT_DB.prepare("INSERT INTO anamneses(id,user_id,version,answers_json,completed_at) VALUES(?,?,1,?,?)").bind(crypto.randomUUID(),session.sub,JSON.stringify(answers),completedAt).run();
        await env.RFIT_DB.prepare("UPDATE student_profiles SET birth_date=?,sex=?,height_cm=?,weight_kg=?,goal=?,training_frequency=?,experience_level=?,restrictions_json=?,anamnesis_completed_at=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?").bind(answers.birth_date,answers.sex,Number(answers.height_cm),Number(answers.weight_kg),answers.goal,Number(answers.training_frequency),answers.experience_level,JSON.stringify({health_conditions:answers.health_conditions,medications:answers.medications,allergies:answers.allergies,restrictions:answers.restrictions,additional_notes:answers.additional_notes}),completedAt,session.sub).run();
        return reply({ok:true,completed:true,redirect:'/student/pages/portal/home/index.html'});
      }
      return reply({ok:false,error:'method_not_allowed'},405);
    }catch(error){console.error('student_anamnesis_failed',error?.message||'unknown');return reply({ok:false,error:'anamnesis_unavailable'},503);}
  }
  return null;
}
