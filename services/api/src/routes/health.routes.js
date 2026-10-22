/* ==========================================================================
   R-FIT V2 | ROTA DE SAÚDE DA API
   01. Rota e método aceitos
   02. Consulta de teste ao banco D1
   03. Resposta de sucesso ou indisponibilidade
   Banco: binding RFIT_DB, configurado em wrangler.toml.
   Consulta: SELECT 1 AS ok — não lê nem altera dados de usuários.
   ========================================================================== */

export async function healthRoutes(request, env, url) {
  /* 01. ROTA E MÉTODO ACEITOS */
  if (url.pathname !== '/api/health' || request.method !== 'GET') return null;

  /* 02. CONSULTA DE TESTE AO BANCO D1 */
  try {
    await env.RFIT_DB.prepare('SELECT 1 AS ok').first();

    /* 03. RESPOSTA DE SUCESSO */
    return Response.json({
      ok: true,
      service: 'rfit-v2-api',
      database: 'connected'
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch {
    /* 03. RESPOSTA DE INDISPONIBILIDADE */
    return Response.json({
      ok: false,
      service: 'rfit-v2-api',
      database: 'unavailable'
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }
}
