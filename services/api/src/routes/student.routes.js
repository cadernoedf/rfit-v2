/* R-Fit V2 | catálogo de planos visível para alunos autenticados. */
import { getSession } from './auth.routes.js';

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function studentRoutes(request, env, url) {
  if (url.pathname !== '/api/student/plans') return null;
  if (request.method !== 'GET') return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405, headers });
  const session = await getSession(request, env);
  if (!session || session.role !== 'student') return Response.json({ ok: false, error: 'unauthenticated' }, { status: 401, headers });
  try {
    const result = await env.RFIT_DB.prepare(
      'SELECT id,code,name,description,price_cents,duration_days,lifetime,includes_training,includes_nutrition FROM plans WHERE is_active=1 ORDER BY CASE code WHEN \'nutrition\' THEN 1 WHEN \'training\' THEN 2 WHEN \'combo\' THEN 3 WHEN \'premium_lifetime\' THEN 4 ELSE 5 END, created_at'
    ).all();
    return Response.json({ ok: true, plans: result.results || [] }, { headers });
  } catch (error) {
    console.error('student_plan_catalog_failed', error?.message || 'unknown');
    return Response.json({ ok: false, error: 'plan_catalog_unavailable' }, { status: 503, headers });
  }
}
