/* R-Fit V2 | catálogo de planos e anamnese do aluno. */
import { getSession } from './auth.routes.js';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const reply=(data,status=200)=>Response.json(data,{status,headers});

export async function studentRoutes(request, env, url) {
  if (url.pathname === '/api/student/plans') {
    if (request.method !== 'GET') return reply({ok:false,error:'method_not_allowed'},405);
    const session=await getSession(request,env);
    if(!session||session.role!=='student')return reply({ok:false,error:'unauthenticated'},401);
    try{
      const result=await env.RFIT_DB.prepare("SELECT id,code,name,description,price_cents,duration_days,lifetime,includes_training,includes_nutrition FROM plans WHERE is_active=1 ORDER BY CASE code WHEN 'nutrition' THEN 1 WHEN 'training' THEN 2 WHEN 'combo' THEN 3 WHEN 'premium_lifetime' THEN 4 ELSE 5 END,created_at").all();
      return reply({ok:true,plans:result.results||[]});
    }catch(error){console.error('student_plan_catalog_failed',error?.message||'unknown');return reply({ok:false,error:'plan_catalog_unavailable'},503);}
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
