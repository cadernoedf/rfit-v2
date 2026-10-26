/* ==========================================================================
   R-FIT V2 | AUTENTICAÇÃO E SESSÕES
   01. Cookies e tokens assinados
   02. Verificação de senha PBKDF2
   03. Login de aluno
   04. Login Google e callback de professor
   05. Sessão atual e logout
   As rotas protegidas são validadas no Worker, não apenas na interface.
   ========================================================================== */

const COOKIE_STATE = "rfit_oauth_state";
const COOKIE_SESSION = "rfit_session";
const SESSION_SECONDS = 60 * 60 * 8;
const encoder = new TextEncoder();

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function decodeBase64url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}
function cookieValue(request, name) {
  const header = request.headers.get("Cookie") || "";
  const item = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(name + "="));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}
function cookieHeader(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
function redirect(url, cookies = []) {
  const headers = new Headers({ Location: url, "Cache-Control": "no-store" });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}
function authError(message, status = 400) {
  return Response.json({ ok: false, error: message }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}
async function sign(value, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}
async function makeSession(user, secret) {
  const payload = base64url(encoder.encode(JSON.stringify({
    sub: user.id, email: user.email, role: user.role, name: user.full_name,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS
  })));
  return `${payload}.${await sign(payload, secret)}`;
}
async function readSession(request, secret) {
  if (!secret) return null;
  const token = cookieValue(request, COOKIE_SESSION);
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || signature !== await sign(payload, secret)) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(decodeBase64url(payload)));
    if (!data.sub || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch { return null; }
}
async function verifyPassword(password, stored) {
  /* PBKDF2-SHA256 verification using WebCrypto supported by Cloudflare Workers. */
  const parts = String(stored || "").split("$");
  if (parts.length !== 4) return false;
  const [algorithm, iterationsText, saltText, hashText] = parts;
  const iterations = Number(iterationsText);
  if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) return false;

  const decode = (value) => {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  };

  let salt;
  let expected;
  try {
    salt = decode(saltText);
    expected = decode(hashText);
  } catch {
    return false;
  }
  if (salt.length < 8 || expected.length !== 32) return false;

  // Pass the WebCrypto algorithm identifier as a string at importKey time.
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt, iterations: iterations },
    key,
    256
  );
  const actual = new Uint8Array(derived);
  let difference = actual.length ^ expected.length;
  for (let i = 0; i < expected.length; i++) difference |= actual[i] ^ expected[i];
  return difference === 0;
}

export async function authRoutes(request, env, url) {
  /* 01. INÍCIO DO LOGIN GOOGLE — diagnóstico de configuração incluído */
  if (url.pathname === "/auth/google" && request.method === "GET") {
    const missingGoogleConfig = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "PROFESSOR_EMAIL", "SESSION_SECRET"].filter((name) => !String(env[name] || "").trim());
    if (missingGoogleConfig.length) {
      console.error("google_auth_missing_configuration", missingGoogleConfig.join(","));
      return Response.json({ ok: false, error: "auth_not_configured", missing: missingGoogleConfig }, {
        status: 503,
        headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
      });
    }
    const state = crypto.randomUUID() + crypto.randomUUID();
    const callback = new URL("/auth/google/callback", url.origin).toString();
    const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    google.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
    google.searchParams.set("redirect_uri", callback);
    google.searchParams.set("response_type", "code");
    google.searchParams.set("scope", "openid email profile");
    google.searchParams.set("state", state);
    google.searchParams.set("prompt", "select_account");
    return redirect(google.toString(), [cookieHeader(COOKIE_STATE, state, 600)]);
  }

  /* 02. CALLBACK GOOGLE: somente o e-mail do proprietário é professor.
     Qualquer outra conta Google verificada é aluno e segue para escolha de plano.
     Para aluno novo, exige celular via etapa de conclusão do cadastro. */
  if (url.pathname === "/auth/google/callback" && request.method === "GET") {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.PROFESSOR_EMAIL || !env.SESSION_SECRET) return authError("auth_not_configured", 503);
    const state = url.searchParams.get("state");
    const savedState = cookieValue(request, COOKIE_STATE);
    const code = url.searchParams.get("code");
    if (!state || !savedState || state !== savedState || !code) return authError("oauth_state_or_code_invalid", 400);

    const callback = new URL("/auth/google/callback", url.origin).toString();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: callback, grant_type: "authorization_code" })
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
    const allowedEmail = String(env.PROFESSOR_EMAIL).trim().toLowerCase();
    if (!profile.sub || !email || profile.email_verified !== true) return authError("google_account_not_authorized", 403);

    const isOwner = email === allowedEmail;
    const id = `google:${profile.sub}`;
    try {
      if (isOwner) {
        await env.RFIT_DB.prepare(
          "INSERT INTO users (id,email,google_subject,full_name,avatar_url,role,email_verified_at,status) VALUES (?,?,?,?,?,'professor',CURRENT_TIMESTAMP,'active') ON CONFLICT(email) DO UPDATE SET google_subject=excluded.google_subject,full_name=excluded.full_name,avatar_url=excluded.avatar_url,updated_at=CURRENT_TIMESTAMP WHERE users.role='professor'"
        ).bind(id, email, profile.sub, String(profile.name || email).slice(0,160), profile.picture || null).run();
        const user = await env.RFIT_DB.prepare("SELECT id,email,full_name,role,status FROM users WHERE email=? AND google_subject=? LIMIT 1").bind(email, profile.sub).first();
        if (!user || user.status !== "active" || user.role !== "professor") return authError("google_account_not_authorized", 403);
        const session = await makeSession(user, env.SESSION_SECRET);
        return redirect(new URL("/professor/", url.origin).toString(), [
          cookieHeader(COOKIE_SESSION, session, SESSION_SECONDS), cookieHeader(COOKIE_STATE, "", 0)
        ]);
      }

      let user = await env.RFIT_DB.prepare("SELECT id,email,full_name,phone,role,status,google_subject FROM users WHERE email=? LIMIT 1").bind(email).first();
      if (user && user.role !== "student") return authError("google_account_not_authorized", 403);

      if (!user) {
        await env.RFIT_DB.prepare(
          "INSERT INTO users (id,email,google_subject,full_name,avatar_url,role,email_verified_at,status) VALUES (?,?,?,?,?,'student',CURRENT_TIMESTAMP,'pending')"
        ).bind(id, email, profile.sub, String(profile.name || email).slice(0,160), profile.picture || null).run();
        await env.RFIT_DB.prepare("INSERT INTO student_profiles (user_id) VALUES (?)").bind(id).run();
        const pendingSession = await makeSession({ id, email, full_name: String(profile.name || email).slice(0,160), role: "student" }, env.SESSION_SECRET);
        return redirect(new URL("/student/pages/google-complete.html", url.origin).toString(), [
          cookieHeader(COOKIE_SESSION, pendingSession, SESSION_SECONDS), cookieHeader(COOKIE_STATE, "", 0)
        ]);
      }

      if (user.status !== "active") {
        return redirect(new URL("/student/pages/google-complete.html", url.origin).toString(), [cookieHeader(COOKIE_STATE, "", 0)]);
      }
      if (!user.phone || String(user.phone).replace(/\\D/g, "").length < 10) {
        const pendingSession = await makeSession(user, env.SESSION_SECRET);
        return redirect(new URL("/student/pages/google-complete.html", url.origin).toString(), [
          cookieHeader(COOKIE_SESSION, pendingSession, SESSION_SECONDS), cookieHeader(COOKIE_STATE, "", 0)
        ]);
      }
      const session = await makeSession(user, env.SESSION_SECRET);
      return redirect(new URL("/student/pages/portal/plan/index.html", url.origin).toString(), [
        cookieHeader(COOKIE_SESSION, session, SESSION_SECONDS), cookieHeader(COOKIE_STATE, "", 0)
      ]);
    } catch (error) {
      console.error("google_auth_database_error", error?.name || "Error", error?.message || "unknown");
      return authError("auth_database_error", 503);
    }
  }

  /* 03. CONCLUSÃO DO CADASTRO GOOGLE: celular obrigatório antes de escolher plano */
  if (url.pathname === "/auth/student/google-complete" && request.method === "POST") {
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return authError("origin_not_allowed", 403);
    const session = await readSession(request, env.SESSION_SECRET);
    if (!session || session.role !== "student") return authError("unauthenticated", 401);
    let body;
    try { body = await request.json(); } catch { return authError("invalid_json", 400); }
    const phone = String(body.phone || "").trim();
    const digits = phone.replace(/\\D/g, "");
    if (digits.length < 10 || digits.length > 13) return authError("registration_invalid", 400);
    try {
      const result = await env.RFIT_DB.prepare("UPDATE users SET phone=?,status='active',updated_at=CURRENT_TIMESTAMP WHERE id=? AND role='student' AND google_subject IS NOT NULL").bind(phone, session.sub).run();
      if (!result.meta?.changes) return authError("google_student_not_found", 404);
      const user = await env.RFIT_DB.prepare("SELECT id,email,full_name,role,status FROM users WHERE id=? AND role='student'").bind(session.sub).first();
      if (!user || user.status !== "active") return authError("google_student_not_found", 404);
      const nextSession = await makeSession(user, env.SESSION_SECRET);
      return Response.json({ ok: true, redirect: "/student/pages/portal/plan/index.html" }, {
        headers: { "Cache-Control": "no-store", "Set-Cookie": cookieHeader(COOKIE_SESSION, nextSession, SESSION_SECONDS), "X-Content-Type-Options": "nosniff" }
      });
    } catch (error) {
      console.error("google_student_completion_failed", error?.message || "unknown");
      return authError("registration_failed", 503);
    }
  }

  /* 04. CADASTRO DE ALUNO */
  if (url.pathname === "/auth/student/register" && request.method === "POST") {
    if (!env.SESSION_SECRET) return authError("auth_not_configured", 503);
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return authError("origin_not_allowed", 403);
    let body;
    try { body = await request.json(); } catch { return authError("invalid_json", 400); }
    const name = String(body.name || "").trim().replace(/\\s+/g, " ");
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const normalizedPhone = phone.replace(/\D/g, "");
    const password = String(body.password || "");
    if (name.length < 2 || name.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || normalizedPhone.length < 10 || normalizedPhone.length > 13) return authError("registration_invalid", 400);
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
      const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256));
      const encode = (bytes) => base64url(bytes);
      const passwordHash = `pbkdf2-sha256$100000$${encode(salt)}$${encode(bits)}`;
      const id = crypto.randomUUID();
      try {
        await env.RFIT_DB.prepare("INSERT INTO users (id,email,full_name,phone,password_hash,role,status) VALUES (?,?,?,?,?,'student','active')").bind(id,email,name,phone,passwordHash).run();
        await env.RFIT_DB.prepare("INSERT INTO student_profiles (user_id) VALUES (?)").bind(id).run();
        const user = { id, email, full_name: name, role: "student" };
        const session = await makeSession(user, env.SESSION_SECRET);
        return Response.json({ ok: true, message: "Cadastro criado. Redirecionando para a escolha do plano.", redirect: "/student/pages/portal/plan/index.html" }, {
          status: 201,
          headers: {
            "Cache-Control": "no-store",
            "Set-Cookie": cookieHeader(COOKIE_SESSION, session, SESSION_SECONDS),
            "X-Content-Type-Options": "nosniff"
          }
        });
      } catch (error) {
        if (String(error?.message || "").toLowerCase().includes("unique")) return authError("email_already_registered", 409);
        console.error("student_registration_failed", error?.message || "unknown");
        return Response.json({ ok: false, error: "registration_failed", detail: String(error?.message || error?.name || "unknown").slice(0, 180) }, { status: 503, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
      }
    } catch (error) {
      console.error("student_registration_failed", error?.name || "Error", error?.message || "unknown");
      return Response.json({ ok: false, error: "registration_failed", detail: String(error?.message || error?.name || "unknown").slice(0, 180) }, { status: 503, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    }
  }

  /* 04. LOGIN DE ALUNO POR E-MAIL E SENHA */
  if (url.pathname === "/auth/student/login" && request.method === "POST") {
    if (!env.SESSION_SECRET) return authError("auth_not_configured", 503);
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return authError("origin_not_allowed", 403);
    let body;
    try { body = await request.json(); } catch { return authError("invalid_json", 400); }
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password || email.length > 254 || password.length > 128) return authError("invalid_credentials", 400);
    let user;
    try {
      user = await env.RFIT_DB.prepare("SELECT id,email,full_name,role,status,password_hash FROM users WHERE email=? LIMIT 1").bind(email).first();
    } catch (error) {
      console.error("student_login_database_error", error?.name || "Error", error?.message || "unknown");
      return authError("auth_database_error", 503);
    }
    let valid = false;
    try {
      valid = Boolean(user && user.role === "student" && user.status === "active" && await verifyPassword(password, user.password_hash));
    } catch (error) {
      const errorName = String(error?.name || "Error").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 40);
      console.error("student_login_password_verification_error", errorName, error?.message || "unknown");
      return authError(`password_verification_error:${errorName}`, 503);
    }
    if (!valid) return authError("invalid_credentials", 401);
    try {
      const session = await makeSession(user, env.SESSION_SECRET);
      return Response.json({ ok: true, redirect: "/student/dashboard.html" }, {
        headers: { "Cache-Control": "no-store", "Set-Cookie": cookieHeader(COOKIE_SESSION, session, SESSION_SECONDS), "X-Content-Type-Options": "nosniff" }
      });
    } catch (error) {
      console.error("student_login_session_error", error?.name || "Error", error?.message || "unknown");
      return authError("session_creation_error", 503);
    }
  }

  /* 05. SESSÃO ATUAL E LOGOUT */
  if (url.pathname === "/api/auth/me" && request.method === "GET") {
    const session = await readSession(request, env.SESSION_SECRET);
    if (!session) return authError("unauthenticated", 401);
    return Response.json({ ok: true, user: { id: session.sub, email: session.email, name: session.name, role: session.role } }, { headers: { "Cache-Control": "no-store" } });
  }
  if (url.pathname === "/auth/logout" && request.method === "POST") {
    return redirect(new URL("/student/", url.origin).toString(), [cookieHeader(COOKIE_SESSION, "", 0)]);
  }

  return null;
}

export async function getSession(request, env) {
  return readSession(request, env.SESSION_SECRET);
}
