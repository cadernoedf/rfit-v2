export async function healthRoutes(request, env, url) {
  if (url.pathname !== '/api/health' || request.method !== 'GET') return null;
  try {
    await env.RFIT_DB.prepare('SELECT 1 AS ok').first();
    return Response.json({ ok: true, service: 'rfit-v2-api', database: 'connected' }, {
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
    });
  } catch {
    return Response.json({ ok: false, service: 'rfit-v2-api', database: 'unavailable' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
    });
  }
}
