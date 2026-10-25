/* ==========================================================================
   R-FIT V2 | API WORKER
   01. Imports
   02. Response/security helpers
   03. Route protection
   04. Request routing and static assets
   ========================================================================== */

/* 01. IMPORTS */
import { healthRoutes } from './routes/health.routes.js';
import { authRoutes, getSession } from './routes/auth.routes.js';
import { adminRoutes } from './routes/admin.routes.js';

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

/* 03. ROUTE PROTECTION
   Protect private HTML entry points at the server, not only in browser JS. */
async function protectPortal(request, env, url) {
  const isStudentPage = url.pathname === '/student/dashboard.html';
  const isProfessorPage = url.pathname === '/professor/' || url.pathname === '/professor' || url.pathname === '/professor/index.html';
  if (!isStudentPage && !isProfessorPage) return null;

  const session = await getSession(request, env);
  if (!session) return Response.redirect(new URL('/student/', url.origin), 302);
  if (isStudentPage && session.role !== 'student') return Response.redirect(new URL('/professor/', url.origin), 302);
  if (isProfessorPage && !['professor', 'admin'].includes(session.role)) return Response.redirect(new URL('/student/dashboard.html', url.origin), 302);
  return null;
}

/* 04. REQUEST ROUTING AND STATIC ASSETS */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

    const auth = await authRoutes(request, env, url);
    if (auth) return auth;

    const admin = await adminRoutes(request, env, url);
    if (admin) return admin;

    if (url.pathname.startsWith('/api/')) {
      const health = await healthRoutes(request, env, url);
      if (health) return health;
      return json({ error: 'not_found' }, 404);
    }

    const blocked = await protectPortal(request, env, url);
    if (blocked) return blocked;

    /* Route the root to the student login. The single CSS remains shared. */
    if (url.pathname === '/') return Response.redirect(new URL('/student/pages/login.html', url.origin), 302);

    return env.ASSETS
      ? env.ASSETS.fetch(request)
      : new Response('R-Fit V2 API scaffold', { status: 200 });
  }
};
