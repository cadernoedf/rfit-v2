/* ==========================================================================
   R-FIT V2 | API WORKER
   01. Imports
   02. Response/security helpers
   03. Request routing
   ========================================================================== */

/* 01. IMPORTS */
import { healthRoutes } from './routes/health.routes.js';
import { authRoutes } from './routes/auth.routes.js';

/* 02. RESPONSE / SECURITY HELPERS */
const json = (data, status = 200) => Response.json(data, {
  status,
  headers: {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  }
});

/* 03. REQUEST ROUTING */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    const auth = await authRoutes(request, env, url);
    if (auth) return auth;

    if (url.pathname.startsWith('/api/')) {
      const health = await healthRoutes(request, env, url);
      if (health) return health;
      return json({ error: 'not_found' }, 404);
    }

    /* Static assets are served by the configured Cloudflare assets binding. */
    return env.ASSETS
      ? env.ASSETS.fetch(request)
      : new Response('R-Fit V2 API scaffold', { status: 200 });
  }
};
