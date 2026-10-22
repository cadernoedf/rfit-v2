/* ==========================================================================
   R-FIT V2 | AUTENTICAÇÃO GOOGLE
   01. Cookies e assinaturas
   02. Início do OAuth com state
   03. Callback, validação de identidade e autorização
   04. Encerramento de sessão
   Segurança: exige GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PROFESSOR_EMAIL
   e SESSION_SECRET como variáveis/segredos do Worker.
   ========================================================================== */

const COOKIE_STATE = "rfit_oauth_state";
const COOKIE_SESSION = "rfit_session";
const SESSION_SECONDS = 60 * 60 * 8;

function cookieValue(request, name) {
  const header = request.headers.get("Cookie") || "";
  const item = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(name + "="));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

function cookieHeader(name, value, maxAge, extra = "") {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}${extra}`;
}

function redirect(url, headers = {}) {
  return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store", ...headers } });
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
  return btoa(String.fromCharCode(...bytes)).replace(/=/g, "").replace(/\\+/g, "-").replace(/\\//g, "_");
}

async function makeSession(user, secret) {
  const payload = btoa(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.full_name,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS
  })).replace(/=/g, "").replace(/\\+/g, "-").replace(/\\//g, "_");
  return `${payload}.${await sign(payload, secret)}`;
}

function authError(message, status = 400) {
  return Response.json({ ok: false, error: message }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}

export async function authRoutes(request, env, url) {
  /* 01. CONFIGURAÇÃO OBRIGATÓRIA */
  const configured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.PROFESSOR_EMAIL && env.SESSION_SECRET);

  /* 02. INÍCIO DO OAUTH */
  if (url.pathname === "/auth/google" && request.method === "GET") {
    if (!configured) return authError("auth_not_configured", 503);
    const state = crypto.randomUUID() + crypto.randomUUID();
    const callback = new URL("/auth/google/callback", url.origin).toString();
    const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    google.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
    google.searchParams.set("redirect_uri", callback);
    google.searchParams.set("response_type", "code");
    google.searchParams.set("scope", "openid email profile");
    google.searchParams.set("state", state);
    google.searchParams.set("prompt", "select_account");
    return redirect(google.toString(), {
      "Set-Cookie": cookieHeader(COOKIE_STATE, state, 600)
    });
  }

  /* 03. CALLBACK, IDENTIDADE E AUTORIZAÇÃO */
  if (url.pathname === "/auth/google/callback" && request.method === "GET") {
    if (!configured) return authError("auth_not_configured", 503);
    const state = url.searchParams.get("state");
    const savedState = cookieValue(request, COOKIE_STATE);
    const code = url.searchParams.get("code");
    if (!state || !savedState || state !== savedState || !code) {
      return authError("oauth_state_or_code_invalid", 400);
    }

    const callback = new URL("/auth/google/callback", url.origin).toString();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callback,
        grant_type: "authorization_code"
      })
    });
    if (!tokenResponse.ok) return authError("google_token_exchange_failed", 502);
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) return authError("google_access_token_missing", 502);

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/json" }
    });
    if (!profileResponse.ok) return authError("google_profile_fetch_failed", 502);
    const profile = await profileResponse.json();

    const email = String(profile.email || "").trim().toLowerCase();
    const allowedEmail = String(env.PROFESSOR_EMAIL || "").trim().toLowerCase();
    if (!profile.sub || !email || profile.email_verified !== true || email !== allowedEmail) {
      return authError("google_account_not_authorized", 403);
    }

    const id = `google:${profile.sub}`;
    const fullName = String(profile.name || email).slice(0, 160);
    try {
      await env.RFIT_DB.prepare(
        "INSERT INTO users (id, email, google_subject, full_name, avatar_url, role, email_verified_at, status) VALUES (?, ?, ?, ?, ?, 'professor', CURRENT_TIMESTAMP, 'active') ON CONFLICT(email) DO UPDATE SET google_subject = excluded.google_subject, full_name = excluded.full_name, avatar_url = excluded.avatar_url, updated_at = CURRENT_TIMESTAMP WHERE users.role IN ('professor','admin')"
      ).bind(id, email, profile.sub, fullName, profile.picture || null).run();

      const user = await env.RFIT_DB.prepare(
        "SELECT id, email, full_name, role, status FROM users WHERE email = ? AND google_subject = ? LIMIT 1"
      ).bind(email, profile.sub).first();

      if (!user || user.status !== "active" || !["professor", "admin"].includes(user.role)) {
        return authError("google_account_not_authorized", 403);
      }

      const session = await makeSession(user, env.SESSION_SECRET);
      return redirect(new URL("/professor/", url.origin).toString(), {
        "Set-Cookie": [
          cookieHeader(COOKIE_SESSION, session, SESSION_SECONDS),
          cookieHeader(COOKIE_STATE, "", 0)
        ].join(", ")
      });
    } catch {
      return authError("auth_database_error", 503);
    }
  }

  /* 04. ENCERRAMENTO DE SESSÃO */
  if (url.pathname === "/auth/logout" && request.method === "POST") {
    return redirect(new URL("/student/", url.origin).toString(), {
      "Set-Cookie": cookieHeader(COOKIE_SESSION, "", 0)
    });
  }

  return null;
}
