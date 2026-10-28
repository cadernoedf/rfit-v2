/* R-Fit — Mercado Pago checkout.
   Configure MP_ACCESS_TOKEN as a Cloudflare Worker secret before accepting real payments. */
import { getSession } from './auth.routes.js';

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const mercadoPagoToken = (env, mode = 'live') => mode === 'test'
  ? (env.MERCADO_PAGO_ACCESS_TOKEN_TEST || '')
  : (env.MP_ACCESS_TOKEN || env.MERCADO_PAGO_ACCESS_TOKEN_TEST || '');
const reply = (body, status = 200) => Response.json(body, { status, headers });
const cents = value => Math.round(Number(value) * 100);

async function mpRequest(env, path, options = {}, credentialMode = 'live') {
  const accessToken = mercadoPagoToken(env, credentialMode);
  if (!accessToken) throw new Error('payment_provider_not_configured');
  const response = await fetch('https://api.mercadopago.com' + path, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = String(data?.message || data?.error || 'unknown').replace(/[^a-zA-Z0-9 _.-]/g, '').slice(0, 120);
    const providerCause = String(data?.cause?.[0]?.code || data?.cause?.[0]?.description || '').replace(/[^a-zA-Z0-9 _.-]/g, '').slice(0, 120);
    console.error('mercadopago_api_error', response.status, providerMessage, providerCause);
    const error = new Error('payment_provider_error');
    error.providerStatus = response.status;
    error.providerMessage = providerMessage;
    error.providerCause = providerCause;
    throw error;
  }
  return data;
}

async function confirmApprovedPayment(env, payment) {
  if (!payment || payment.status !== 'approved' || !payment.external_reference) return false;
  const checkout = await env.RFIT_DB.prepare(
    'SELECT * FROM payment_checkouts WHERE id=?'
  ).bind(String(payment.external_reference)).first();
  if (!checkout || Number(payment.transaction_amount * 100).toFixed(0) !== String(checkout.amount_cents)) return false;
  if (String(payment.currency_id || 'BRL') !== 'BRL') return false;
  const existing = await env.RFIT_DB.prepare('SELECT id FROM subscriptions WHERE id=?').bind(checkout.subscription_id || '').first();
  const now = new Date();
  const starts = now.toISOString();
  const expires = Number((await env.RFIT_DB.prepare('SELECT lifetime,duration_days FROM plans WHERE id=?').bind(checkout.plan_id).first())?.lifetime)
    ? null
    : new Date(now.getTime() + Number((await env.RFIT_DB.prepare('SELECT duration_days FROM plans WHERE id=?').bind(checkout.plan_id).first())?.duration_days || 30) * 86400000).toISOString();
  const subId = checkout.subscription_id || crypto.randomUUID();
  if (!existing) {
    await env.RFIT_DB.prepare(
      "INSERT INTO subscriptions(id,user_id,plan_id,status,starts_at,expires_at,lifetime,payment_provider,provider_subscription_id) VALUES(?,?,?,'active',?,?,?,?,?)"
    ).bind(subId, checkout.user_id, checkout.plan_id, starts, expires, expires === null ? 1 : 0, 'mercadopago', String(payment.id)).run();
  } else {
    await env.RFIT_DB.prepare(
      "UPDATE subscriptions SET status='active',starts_at=?,expires_at=?,lifetime=?,payment_provider='mercadopago',provider_subscription_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(starts, expires, expires === null ? 1 : 0, String(payment.id), subId).run();
  }
  await env.RFIT_DB.prepare(
    "INSERT INTO payments(id,user_id,subscription_id,provider,provider_payment_id,amount_cents,currency,status,idempotency_key,paid_at,raw_event_json) VALUES(?,?,?,'mercadopago',?,?, 'BRL','approved',?,?,?) ON CONFLICT(idempotency_key) DO UPDATE SET status='approved',paid_at=excluded.paid_at,raw_event_json=excluded.raw_event_json"
  ).bind(crypto.randomUUID(), checkout.user_id, subId, String(payment.id), checkout.amount_cents, 'mp-payment-' + String(payment.id), starts, JSON.stringify({id:payment.id,status:payment.status})).run();
  await env.RFIT_DB.prepare(
    "UPDATE payment_checkouts SET status='approved',provider_payment_id=?,subscription_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
  ).bind(String(payment.id), subId, checkout.id).run();
  await env.RFIT_DB.prepare(
    "UPDATE users SET status='active',updated_at=CURRENT_TIMESTAMP WHERE id=? AND role='student'"
  ).bind(checkout.user_id).run();
  return true;
}

export async function paymentRoutes(request, env, url) {
  // TEMPORÁRIO: ativação simulada apenas para a conta de teste fixa.
  // Remover este endpoint e o botão antes de promover o código para produção.
  if (url.pathname === '/api/payments/test-activate') {
    if (request.method !== 'POST') return reply({ok:false,error:'method_not_allowed'},405);
    const session = await getSession(request, env);
    if (!session || session.role !== 'student') return reply({ok:false,error:'unauthenticated'},401);
    if (session.sub !== 'student-test-rfit-v2') return reply({ok:false,error:'test_account_only'},403);
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return reply({ok:false,error:'origin_not_allowed'},403);
    let body; try { body = await request.json(); } catch { return reply({ok:false,error:'invalid_json'},400); }
    const code = String(body.plan_code || '');
    if (!['nutrition','training','combo','premium_lifetime'].includes(code)) return reply({ok:false,error:'invalid_plan'},400);
    try {
      const plan = await env.RFIT_DB.prepare(
        'SELECT id,code,duration_days,lifetime FROM plans WHERE code=? AND is_active=1'
      ).bind(code).first();
      if (!plan) return reply({ok:false,error:'plan_unavailable'},409);
      // A simulação concede exatamente 30 dias, inclusive para o plano vitalício.
      // Nenhuma cobrança, pagamento ou confirmação do Mercado Pago é criada.
      await env.RFIT_DB.prepare(
        "UPDATE subscriptions SET status='expired',updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND status='active'"
      ).bind(session.sub).run();
      const subscriptionId = crypto.randomUUID();
      const startsAt = new Date();
      const expiresAt = new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      await env.RFIT_DB.prepare(
        "INSERT INTO subscriptions(id,user_id,plan_id,status,starts_at,expires_at,lifetime,payment_provider) VALUES(?,?,?,'active',?,?,0,'test')"
      ).bind(subscriptionId,session.sub,plan.id,startsAt.toISOString(),expiresAt.toISOString()).run();
      await env.RFIT_DB.prepare(
        "UPDATE users SET status='active',updated_at=CURRENT_TIMESTAMP WHERE id=? AND role='student'"
      ).bind(session.sub).run();
      return reply({ok:true,test_mode:true,subscription_id:subscriptionId,expires_at:expiresAt.toISOString(),message:'Acesso de teste ativado por 30 dias; nenhuma cobrança criada.'});
    } catch (error) {
      console.error('test_subscription_activation_failed', error?.message || 'unknown');
      return reply({ok:false,error:'test_activation_failed'},503);
    }
  }

  if (url.pathname === '/api/payments/checkout') {
    if (request.method !== 'POST') return reply({ok:false,error:'method_not_allowed'},405);
    const session = await getSession(request, env);
    if (!session || session.role !== 'student') return reply({ok:false,error:'unauthenticated'},401);
    let body; try { body = await request.json(); } catch { return reply({ok:false,error:'invalid_json'},400); }
    const code = String(body.plan_code || '');
    const method = String(body.method || '');
    if (!['nutrition','training','combo','premium_lifetime'].includes(code) || !['pix','card'].includes(method)) return reply({ok:false,error:'invalid_checkout'},400);
    if (!mercadoPagoToken(env)) return reply({ok:false,error:'payment_provider_not_configured'},503);
    try {
      const plan = await env.RFIT_DB.prepare('SELECT id,code,name,price_cents,duration_days,lifetime FROM plans WHERE code=? AND is_active=1').bind(code).first();
      if (!plan || Number(plan.price_cents) < 1) return reply({ok:false,error:'plan_unavailable'},409);
      const checkoutId = crypto.randomUUID();
      const subId = crypto.randomUUID();
      await env.RFIT_DB.prepare(
        "INSERT INTO subscriptions(id,user_id,plan_id,status,lifetime,payment_provider) VALUES(?,?,?,'pending_payment',?,'mercadopago')"
      ).bind(subId,session.sub,plan.id,Number(plan.lifetime)?1:0).run();
      await env.RFIT_DB.prepare(
        "INSERT INTO payment_checkouts(id,user_id,plan_id,subscription_id,method,status,amount_cents) VALUES(?,?,?,?,?,'pending',?)"
      ).bind(checkoutId,session.sub,plan.id,subId,method,Number(plan.price_cents)).run();
      const origin = url.origin;
      if (method === 'pix') {
        const user = await env.RFIT_DB.prepare('SELECT email,full_name FROM users WHERE id=? AND role=\'student\'').bind(session.sub).first();
        // PIX em produção usa a credencial privada de produção, igual ao fluxo de confirmação.
        // Não usar credenciais de teste para gerar cobranças reais.
        if (!env.MP_ACCESS_TOKEN) throw new Error('payment_provider_not_configured');
        const payment = await mpRequest(env, '/v1/payments', {
          method:'POST',
          headers:{'X-Idempotency-Key':checkoutId},
          body:JSON.stringify({
            transaction_amount:Number(plan.price_cents)/100,
            description:'R-Fit — '+plan.name,
            payment_method_id:'pix',
            payer:{email:user.email,first_name:String(user.full_name||'Aluno').split(' ')[0]},
            external_reference:checkoutId,
            notification_url:origin+'/api/payments/webhook'
          })
        });
        const tx = payment.point_of_interaction?.transaction_data || {};
        if (!payment.id || !tx.qr_code) throw new Error('pix_generation_failed');
        await env.RFIT_DB.prepare('UPDATE payment_checkouts SET provider_payment_id=?,pix_qr_base64=?,pix_copy_paste=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
          .bind(String(payment.id),tx.qr_code_base64||null,tx.qr_code,checkoutId).run();
        return reply({ok:true,checkout_id:checkoutId,method:'pix',status:payment.status,qr_code_base64:tx.qr_code_base64||null,qr_code:tx.qr_code,amount_cents:plan.price_cents});
      }
      const preference = await mpRequest(env, '/checkout/preferences', {
        method:'POST',
        headers:{'X-Idempotency-Key':checkoutId},
        body:JSON.stringify({
          items:[{id:plan.code,title:'R-Fit — '+plan.name,quantity:1,currency_id:'BRL',unit_price:Number(plan.price_cents)/100}],
          payer:{email:(await env.RFIT_DB.prepare('SELECT email FROM users WHERE id=?').bind(session.sub).first())?.email},
          external_reference:checkoutId,
          notification_url:origin+'/api/payments/webhook',
          back_urls:{success:origin+'/student/pages/payment-status.html?checkout='+checkoutId,pending:origin+'/student/pages/payment-status.html?checkout='+checkoutId,failure:origin+'/student/pages/payment-status.html?checkout='+checkoutId},
          auto_return:'approved',
          metadata:{checkout_id:checkoutId,user_id:session.sub,plan_code:plan.code}
        })
      });
      await env.RFIT_DB.prepare('UPDATE payment_checkouts SET provider_preference_id=?,checkout_url=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
        .bind(String(preference.id),preference.init_point,checkoutId).run();
      return reply({ok:true,checkout_id:checkoutId,method:'card',checkout_url:preference.init_point});
    } catch(error) {
      const reason = String(error?.message || 'unknown');
      console.error('payment_checkout_failed', reason);
      // Diferenciar falha do provedor para não esconder o motivo específico do PIX.
      const publicError = reason === 'payment_provider_not_configured'
        ? 'payment_provider_not_configured'
        : reason === 'payment_provider_error'
          ? 'payment_provider_error'
          : reason === 'pix_generation_failed'
            ? 'pix_generation_failed'
            : 'checkout_creation_failed';
      return reply({ok:false,error:publicError, ...(reason === 'payment_provider_error' ? {provider_status:Number(error?.providerStatus)||null,provider_message:String(error?.providerMessage||'').slice(0,120),provider_cause:String(error?.providerCause||'').slice(0,120)} : {})},503);
    }
  }

  if (url.pathname === '/api/payments/status') {
    if (request.method !== 'GET') return reply({ok:false,error:'method_not_allowed'},405);
    const session = await getSession(request,env);
    if (!session || session.role !== 'student') return reply({ok:false,error:'unauthenticated'},401);
    const id=url.searchParams.get('checkout');
    if (!id) return reply({ok:false,error:'checkout_required'},400);
    const checkout=await env.RFIT_DB.prepare('SELECT id,status,method,amount_cents FROM payment_checkouts WHERE id=? AND user_id=?').bind(id,session.sub).first();
    if (!checkout) return reply({ok:false,error:'checkout_not_found'},404);
    if (checkout.status !== 'approved' && checkout.provider_payment_id && env.MP_ACCESS_TOKEN) {
      try {
        const payment=await mpRequest(env,'/v1/payments/'+encodeURIComponent(checkout.provider_payment_id));
        await confirmApprovedPayment(env,payment);
      } catch(error) { console.error('payment_status_check_failed',error?.message||'unknown'); }
    }
    const refreshed=await env.RFIT_DB.prepare('SELECT status,method,amount_cents FROM payment_checkouts WHERE id=? AND user_id=?').bind(id,session.sub).first();
    return reply({ok:true,...refreshed,access_granted:refreshed?.status==='approved'});
  }

  if (url.pathname === '/api/payments/webhook') {
    if (request.method !== 'POST' && request.method !== 'GET') return reply({ok:false,error:'method_not_allowed'},405);
    if (!env.MP_ACCESS_TOKEN) return reply({ok:false,error:'payment_provider_not_configured'},503);
    const id=url.searchParams.get('data.id') || url.searchParams.get('id');
    let body={};
    if(request.method==='POST') body=await request.json().catch(()=>({}));
    const paymentId=id || body?.data?.id || body?.id;
    if(!paymentId) return reply({ok:true,ignored:true});
    try {
      const payment=await mpRequest(env,'/v1/payments/'+encodeURIComponent(String(paymentId)));
      const accepted=await confirmApprovedPayment(env,payment);
      return reply({ok:true,processed:accepted});
    } catch(error) {
      console.error('payment_webhook_failed',error?.message||'unknown');
      return reply({ok:false,error:'webhook_processing_failed'},503);
    }
  }
  return null;
}
