/// FluxGK · checkout transparente (feature 003, RN-G04 a RN-G06; contrato em
/// _reversa_forward/003-gateways-checkout-transparente/interfaces/checkout-transparente.md).
///
/// O cliente paga sem sair do FluxGK. O número do cartão NUNCA chega aqui: o SDK do gateway (Stripe Payment Element,
/// Mercado Pago Card Payment Brick) desenha os campos no navegador e entrega um token de uso único. Este módulo só
/// cria a cobrança no gateway padrão:
///
///   Stripe       cartão  cliente + assinatura incompleta; o navegador confirma com o `clientSecret` (s = st_<nonce>).
///                        A 1ª fatura paga (webhook `invoice.paid`) gera o código ou aplica o plano (fluxgk_assinatura.js).
///   Mercado Pago cartão  assinatura (`/preapproval`) com o `card_token_id` do Brick (s = mpa_<id>); o webhook da
///                        assinatura gera o código ou aplica o plano (fluxgk_mercadopago.js).
///   Mercado Pago pix     pagamento Pix com QR devolvido à página (s = mp_<nonce>); o webhook do pagamento faz o resto.
///
/// "O site não armazena nada" (RN-G05): o token e o e-mail digitado só atravessam esta rota até o gateway. Nada aqui
/// grava registro, e o log de erro leva só método, caminho, status e o código de erro do gateway, nunca o corpo.
/// A confirmação continua só pelo webhook conferido (RN-G06): a resposta do navegador não muda plano nenhum.

const LIMITE = 10, JANELA_MS = 10 * 60 * 1000;
const STRIPE_VERSAO = '2024-06-20';      /* fixa a forma da resposta: `latest_invoice.payment_intent` existe nela */

function P() { return require(`${__hooks}/fluxgk_assinatura.js`); }
function erro(status, chave, msg) { const E = P().ErroPagamento; return new E(status, chave, msg); }

/** Limite por IP em memória (reinício zera). Conta todo pedido, aceito ou não. */
function limitar(app, ip) {
  const k = 'fluxgk_transp_' + String(ip || '?');
  const agora = Date.now();
  let n = 0, ini = agora;
  const v = String(app.store().get(k) || '');
  if (v) { const p = v.split('|'); n = Number(p[0]) || 0; ini = Number(p[1]) || agora; }
  if (agora - ini > JANELA_MS) { n = 0; ini = agora; }
  n++;
  app.store().set(k, n + '|' + ini);
  if (n > LIMITE) throw erro(429, 'muitas_tentativas', 'Muitas tentativas. Espere alguns minutos e tente de novo.');
}

/** IP do cliente: o nginx da stack põe o IP real em X-Real-IP (ver nginx/conf.d/default.conf). Esse cabeçalho só vale
 *  quando quem conecta é endereço privado (o nginx); de fora, vale o endereço da conexão. */
function ipCliente(e) {
  const remoto = String(e.request.remoteAddr || '').replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
  const privado = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd)/.test(remoto);
  const real = String(e.request.header.get('X-Real-IP') || '').trim();
  return privado && real ? real : (e.realIP() || remoto);
}

/** Chamada ao gateway sem nunca registrar o corpo do pedido nem da resposta. */
function enviar(gateway, metodo, url, cabecalhos, corpo) {
  let r;
  try { r = $http.send({ url: url, method: metodo, timeout: 10, headers: cabecalhos, body: corpo || '' }); }
  catch (_) { throw erro(502, 'pagamento_falhou', 'O serviço de pagamento não respondeu. Tente de novo.'); }
  if (r.statusCode >= 200 && r.statusCode < 300) return r.json;
  const j = r.json || {};
  const cod = (j.error && (j.error.code || j.error.type)) || j.error || j.code || '';
  console.log('[transparente] ' + gateway + ' ' + metodo + ' ' + url.replace(/^https?:\/\/[^/]+/, '') + ' → ' + r.statusCode + (cod ? ' ' + String(cod).slice(0, 60) : ''));
  if (r.statusCode === 400 || r.statusCode === 402 || r.statusCode === 422) {
    throw erro(402, 'cartao_recusado', 'O pagamento foi recusado. Confira os dados ou use outro cartão.');
  }
  throw erro(502, 'pagamento_falhou', 'O serviço de pagamento recusou o pedido.');
}

function stripe(metodo, caminho, params) {
  const c = P().cfg();
  return enviar('stripe', metodo, c.api + caminho, {
    Authorization: 'Bearer ' + c.chave, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': STRIPE_VERSAO,
  }, params ? P().form(params).join('&') : '');
}

function mp(metodo, caminho, corpo, idem) {
  const I = require(`${__hooks}/fluxgk_integracoes.js`).ler($app);
  const base = String($os.getenv('MP_API_URL') || 'https://api.mercadopago.com').trim().replace(/\/$/, '');
  const h = { Authorization: 'Bearer ' + I.mp.token, 'Content-Type': 'application/json' };
  if (idem) h['X-Idempotency-Key'] = idem;
  return enviar('mercadopago', metodo, base + caminho, h, corpo ? JSON.stringify(corpo) : '');
}

function nonce() { return $security.randomStringWithAlphabet(24, 'abcdefghijklmnopqrstuvwxyz0123456789'); }
function nomePlano(plano) { return plano.charAt(0).toUpperCase() + plano.slice(1); }

/** Pedido inteiro. `b` = corpo, `conta` = registro logado ou null, `ip` = IP real do cliente. */
function criar(app, b, conta, ip) {
  const A = require(`${__hooks}/fluxgk_acesso.js`);
  const I = require(`${__hooks}/fluxgk_integracoes.js`);
  limitar(app, ip);
  const plano = String(b.plano || ''), ciclo = String(b.ciclo || ''), meio = String(b.meio || 'cartao');
  if (!A.PLANOS[plano]) throw erro(400, 'plano_invalido', 'Plano inválido.');
  if (ciclo !== 'mensal' && ciclo !== 'anual') throw erro(400, 'ciclo_invalido', 'Escolha mensal ou anual.');
  if (meio !== 'cartao' && meio !== 'pix') throw erro(400, 'meio_invalido', 'Forma de pagamento inválida.');
  const ck = I.checkoutPublico(app);
  if (!ck || !P().disponivel()) throw erro(503, 'pagamento_indisponivel', 'Pagamento indisponível no momento.');
  if (ck.modo !== 'transparente') throw erro(409, 'modo_pagina', 'Este gateway está configurado para pagar na página dele.');
  if (ck.meios.indexOf(meio) < 0) throw erro(400, 'meio_invalido', 'Forma de pagamento indisponível neste gateway.');
  const email = conta ? conta.email() : String(b.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) throw erro(400, 'email_invalido', 'Informe um e-mail válido.');
  let reg;
  try { reg = app.findFirstRecordByFilter('planos_config', 'plano = {:p} && ativo = true', { p: plano }); }
  catch (_) { throw erro(503, 'preco_nao_configurado', 'Este plano ainda não tem preço.'); }
  const n = nonce();
  const ref = ['fluxgk', plano, ciclo, conta ? conta.id : '', n].join('|');

  if (ck.gateway === 'stripe') {
    const price = reg.getString(ciclo === 'anual' ? 'priceAnualId' : 'priceMensalId');
    if (!price) throw erro(503, 'preco_nao_configurado', 'Este plano ainda não tem preço.');
    const cliente = (conta && conta.getString('clientePagamentoId')) || stripe('POST', '/v1/customers', { email: email, metadata: { fluxgk: '1' } }).id;
    const s = 'st_' + n;
    const sub = stripe('POST', '/v1/subscriptions', {
      customer: cliente, items: { 0: { price: price } }, payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: { plano: plano, ciclo: ciclo, conta: conta ? conta.id : '', sessao: s },
      expand: { 0: 'latest_invoice.payment_intent' },
    });
    const pi = sub && sub.latest_invoice && sub.latest_invoice.payment_intent;
    const segredo = pi && typeof pi === 'object' ? pi.client_secret : '';
    if (!segredo) throw erro(502, 'pagamento_falhou', 'O serviço de pagamento não devolveu a cobrança.');
    return { gateway: 'stripe', clientSecret: segredo, s: s };
  }

  /* Mercado Pago */
  if (meio === 'pix') {
    const centavos = reg.getInt(ciclo === 'anual' ? 'precoAnualCentavos' : 'precoMensalCentavos');
    if (!(centavos > 0)) throw erro(503, 'preco_nao_configurado', 'Este plano ainda não tem preço.');
    const cfg = I.ler(app);
    const p = mp('POST', '/v1/payments', {
      transaction_amount: centavos / 100, payment_method_id: 'pix',
      description: 'FluxGK ' + nomePlano(plano) + (ciclo === 'anual' ? ' · 1 ano' : ' · 1 mês'),
      payer: { email: email }, external_reference: ref,
      notification_url: cfg.url + '/api/fluxgk/pagamento/webhook-mp',
    }, n);
    const tx = (p && p.point_of_interaction && p.point_of_interaction.transaction_data) || {};
    if (!tx.qr_code) throw erro(502, 'pagamento_falhou', 'O serviço de pagamento não devolveu o Pix.');
    return { gateway: 'mercadopago', s: 'mp_' + n, pix: { copiaECola: tx.qr_code, imagem: tx.qr_code_base64 || '' } };
  }
  const token = String(b.token || '').trim();
  if (!token || token.length > 400) throw erro(400, 'token_ausente', 'Os dados do cartão não chegaram. Tente de novo.');
  require(`${__hooks}/fluxgk_mercadopago.js`).garantirPlanos(app, reg);
  const planoMp = reg.getString(ciclo === 'anual' ? 'mpPlanoAnualId' : 'mpPlanoMensalId');
  if (!planoMp) throw erro(503, 'preco_nao_configurado', 'Este plano ainda não tem preço.');
  const a = mp('POST', '/preapproval', {
    preapproval_plan_id: planoMp, reason: 'FluxGK ' + nomePlano(plano) + (ciclo === 'anual' ? ' (anual)' : ' (mensal)'),
    external_reference: ref, payer_email: email, card_token_id: token, status: 'authorized',
  });
  if (!a || !a.id) throw erro(502, 'pagamento_falhou', 'O serviço de pagamento não devolveu a assinatura.');
  return { gateway: 'mercadopago', s: 'mpa_' + a.id, estado: String(a.status || '') };
}

module.exports = { criar: criar, limitar: limitar, ipCliente: ipCliente, STRIPE_VERSAO: STRIPE_VERSAO, LIMITE: LIMITE };
