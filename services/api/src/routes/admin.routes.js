/* R-FIT V2 | API ADMINISTRATIVA DO PROFESSOR
   Dados reais agregados do D1; somente professor/admin autenticado. */
import { getSession } from './auth.routes.js';

const noStore = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function adminRoutes(request, env, url) {
  if (!url.pathname.startsWith('/api/professor/')) return null;
  if (request.method !== 'GET') return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405, headers: noStore });

  const session = await getSession(request, env);
  if (!session || !['professor', 'admin'].includes(session.role)) {
    return Response.json({ ok: false, error: 'forbidden' }, { status: 403, headers: noStore });
  }

  try {
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
