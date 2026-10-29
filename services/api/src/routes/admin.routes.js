/* R-FIT V2 | API ADMINISTRATIVA DO PROFESSOR
   Dados reais agregados do D1; somente professor/admin autenticado. */
import { getSession } from './auth.routes.js';

const noStore = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function adminRoutes(request, env, url) {
  if (!url.pathname.startsWith('/api/professor/')) return null;
  const isSettings = url.pathname === '/api/professor/settings';
  const isPlanCollection = url.pathname === '/api/professor/plans';
  const planMatch = url.pathname.match(/^\/api\/professor\/plans\/([^/]+)$/);
  const isPlanItem = Boolean(planMatch);
  const isStudentStatus = /^\/api\/professor\/students\/[^/]+\/status$/.test(url.pathname);
  const testAccessMatch = url.pathname.match(/^\/api\/professor\/students\/([^/]+)\/test-access$/);
  const isTestAccess = Boolean(testAccessMatch);
  if (request.method !== 'GET' && !(request.method === 'PUT' && isSettings) && !(request.method === 'PATCH' && isStudentStatus) && !(request.method === 'POST' && isTestAccess) && !(request.method === 'POST' && isPlanCollection) && !(request.method === 'PATCH' && isPlanItem)) return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405, headers: noStore });

  const session = await getSession(request, env);
  if (!session || !['professor', 'admin'].includes(session.role)) {
    return Response.json({ ok: false, error: 'forbidden' }, { status: 403, headers: noStore });
  }

  try {
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
