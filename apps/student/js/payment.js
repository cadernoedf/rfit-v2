import { getCurrentUser } from '../../shared/js/api-client.js';
const params=new URLSearchParams(location.search);const planCode=params.get('plan')||'';
const labels={nutrition:['R-Fit Nutrição','R$ 75/mês'],training:['R-Fit Treino','R$ 95/mês'],combo:['R-Fit Completo','R$ 149/mês'],premium_lifetime:['R-Fit Premium','R$ 199 — pagamento único']};
let method='pix',checkoutId=null;
const $=s=>document.querySelector(s);const message=(text,error=false)=>{$('#pay-message').textContent=text;$('#pay-message').classList.toggle('error',error)};
document.addEventListener('DOMContentLoaded',async()=>{
 if(!labels[planCode]){message('Plano inválido. Volte à página de planos e escolha novamente.',true);$('#start-payment').disabled=true;return;}
 $('#pay-title').textContent=labels[planCode][0];$('#pay-plan').textContent=labels[planCode][1];
 try{const current=await getCurrentUser();if(current.user.role!=='student')location.replace('/professor/');}
 catch{location.replace('/student/pages/login.html?next='+encodeURIComponent('/student/pages/payment.html?plan='+planCode));return;}
 document.querySelectorAll('[data-method]').forEach(b=>b.addEventListener('click',()=>{method=b.dataset.method;document.querySelectorAll('[data-method]').forEach(x=>x.classList.toggle('active',x===b));}));
 $('#start-payment').addEventListener('click',async()=>{
  const btn=$('#start-payment');btn.disabled=true;message('Criando cobrança segura no Mercado Pago…');
  try{
   const res=await fetch('/api/payments/checkout',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({plan_code:planCode,method})});
   const data=await res.json();if(!res.ok)throw new Error(data.error||'checkout_creation_failed');
   checkoutId=data.checkout_id;$('#method-picker').hidden=true;$('#payment-result').hidden=false;
   if(data.method==='card'){
    $('#payment-result').innerHTML='<p><strong>Continue no checkout seguro do Mercado Pago.</strong></p><a id="open-checkout" class="pay-primary" href="'+String(data.checkout_url).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'" target="_blank" rel="noopener noreferrer">Abrir Mercado Pago ↗</a><p class="pay-muted">Depois de pagar, volte a esta página para verificarmos a confirmação.</p><button id="check-status" class="pay-secondary">Já paguei — verificar</button>';
    $('#check-status').addEventListener('click',checkStatus);
   }else{
    const qr=data.qr_code_base64?'<img class="pay-qr" alt="QR Code PIX para pagamento" src="data:image/png;base64,'+data.qr_code_base64.replace(/[^A-Za-z0-9+/=]/g,'')+'">':'';
    $('#payment-result').innerHTML='<h2>PIX gerado</h2>'+qr+'<p class="pay-muted">Escaneie o QR Code ou copie o código PIX abaixo.</p><textarea class="pay-code" id="pix-copy" readonly></textarea><button id="copy-pix" class="pay-primary">Copiar código PIX</button><button id="check-status" class="pay-secondary">Já paguei — verificar</button>';
    $('#pix-copy').value=data.qr_code||'';
    $('#copy-pix').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#pix-copy').value);message('Código PIX copiado.');}catch{ $('#pix-copy').select();message('Selecione e copie o código PIX.');}});
    $('#check-status').addEventListener('click',checkStatus);
   }
   message('Cobrança criada. O acesso só será liberado após confirmação do Mercado Pago.');
  }catch(e){const errors={payment_provider_not_configured:'O Mercado Pago ainda não está configurado no servidor. Nenhuma cobrança foi criada.',plan_unavailable:'Este plano está sem preço ativo no banco. Nenhuma cobrança foi criada.',payment_provider_error:'O Mercado Pago recusou a solicitação de cobrança. O cartão e o PIX usam fluxos diferentes; precisamos conferir a configuração do PIX. Nenhum acesso foi liberado.',pix_generation_failed:'O Mercado Pago não retornou o QR Code PIX. Nenhum acesso foi liberado.',checkout_creation_failed:'Não foi possível criar a cobrança. Nenhum acesso foi liberado.'};message(errors[e.message]||'Erro ao criar pagamento. Nenhuma cobrança confirmada.',true);btn.disabled=false;}
 });
 async function checkStatus(){if(!checkoutId)return;message('Consultando confirmação no Mercado Pago…');try{const r=await fetch('/api/payments/status?checkout='+encodeURIComponent(checkoutId),{credentials:'same-origin',cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error();if(d.access_granted){message('Pagamento confirmado! Vamos encaminhar você para concluir seu cadastro.');location.assign('/student/pages/portal/anamnesis/index.html');}else message('Pagamento ainda não confirmado. Aguarde e tente verificar novamente.');}catch{message('Não foi possível verificar agora. Tente novamente em instantes.',true);}}
});