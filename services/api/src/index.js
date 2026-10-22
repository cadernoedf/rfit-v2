import { healthRoutes } from './routes/health.routes.js';

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
    if (url.pathname.startsWith('/api/')) {
      const health = await healthRoutes(request, env, url);
      if (health) return health;
      return json({ error: 'not_found' }, 404);
    }
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response('R-Fit V2 API scaffold', { status: 200 });
  }
};
