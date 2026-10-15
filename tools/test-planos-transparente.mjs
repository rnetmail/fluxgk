#!/usr/bin/env node
/* FluxGK · gateways e checkout transparente (feature 003) contra um PocketBase de verdade e um gateway FALSO.
 *
 * O PocketBase sobe como no passo "Planos" do CI (STRIPE_SECRET_KEY=sk_test_ci, STRIPE_WEBHOOK_SECRET=whsec_ci,
 * STRIPE_API_URL e MP_API_URL no serviço falso que este script sobe em FALSO_PORTA, padrão 8099, PB_ENCRYPTION_KEY).
 * Confere: cadastro dos gateways (chave pública, modo, padrão só com credencial, lista `gateways`), o que a página de
 * planos recebe (sem segredo), o transparente na Stripe (cliente, assinatura incompleta com versão fixa, 1ª fatura gera
 * o código ou aplica o plano), no Mercado Pago (cartão com token, Pix com QR, webhooks), cartão recusado, limite por IP
 * e que nenhum registro guarda o token do cartão nem o e-mail digitado (RN-G05).
 * Uso: node tools/test-planos-transparente.mjs http://127.0.0.1:8090 */
import http from 'node:http';
import crypto from 'node:crypto';
import { cliente, placar } from './pb-ci.mjs';

const { req, superusuario, conta } = cliente(process.argv[2]);
const { ok, fim } = placar();
const sfx = Date.now().toString(36);
const MP_TOKEN = 'APP_USR-ci-token-tr-9876', MP_SEGREDO = 'mp-segredo-tr', STRIPE_SEGREDO = 'whsec_ci';
const EMAIL_ANON = `comprador.${sfx}@exemplo.com`, TOK_MP = `tok_ci_${sfx}_cartao`, TOK_MP2 = `tok_ci_${sfx}_logado`;

/* ------------------------------ gateway falso (Stripe + Mercado Pago) ------------------------------ */
const pedidos = [], SUBS = {}, MP = { pagamentos: {}, assinaturas: {} };
let n = 0;
const falso = http.createServer((rq, rs) => {
  let corpo = '';
  rq.on('data', (d) => (corpo += d)).on('end', () => {
    pedidos.push({ m: rq.method, u: rq.url, corpo, h: rq.headers });
    const json = (s, j) => { rs.writeHead(s, { 'content-type': 'application/json' }); rs.end(JSON.stringify(j)); };
    const a = rq.headers.authorization;
    if (a === 'Bearer sk_test_ci') {
      if (rq.url === '/v1/prices') return json(200, { id: `price_tr_${++n}` });
      if (rq.url.startsWith('/v1/prices/')) return json(200, { active: false });
      if (rq.url === '/v1/balance') return json(200, { livemode: false });
      if (rq.url === '/v1/customers' && rq.method === 'POST') return json(200, { id: `cus_tr_${++n}` });
      if (rq.url === '/v1/subscriptions' && rq.method === 'POST') {
        const p = new URLSearchParams(corpo), id = `sub_tr_${sfx}_${++n}`;
        SUBS[id] = { id, metadata: { plano: p.get('metadata[plano]'), ciclo: p.get('metadata[ciclo]'), conta: p.get('metadata[conta]') || '', sessao: p.get('metadata[sessao]') } };
        return json(200, { id, status: 'incomplete', latest_invoice: { id: `in_${n}`, payment_intent: { id: `pi_${n}`, client_secret: `pi_${n}_secret_ci` } } });
      }
      const m = /^\/v1\/subscriptions\/(.+)$/.exec(rq.url);
      if (m && SUBS[m[1]]) return json(200, SUBS[m[1]]);
      return json(404, { error: { message: 'stripe falso' } });
    }
    if (a !== `Bearer ${MP_TOKEN}`) return json(401, { message: 'token' });
    if (rq.url === '/users/me') return json(200, { id: 1, nickname: 'CONTA-MP-TR' });
    if (rq.url === '/preapproval_plan') return json(201, { id: `mpplano_tr_${++n}` });
    if (rq.url === '/checkout/preferences') return json(201, { id: `pref${++n}`, init_point: 'https://mp.falso/pix' });
    if (rq.url === '/preapproval' && rq.method === 'POST') {
      const b = JSON.parse(corpo || '{}');
      if (b.card_token_id === 'tok_recusado') return json(400, { message: 'Card token rejected', status: 400, cause: [{ code: 'cc_rejected' }] });
      const id = `pre${sfx}${++n}`;
      MP.assinaturas[id] = { id, status: 'authorized', preapproval_plan_id: b.preapproval_plan_id, external_reference: b.external_reference };
      return json(201, { id, status: 'authorized' });
    }
    if (rq.url === '/v1/payments' && rq.method === 'POST') {
      const b = JSON.parse(corpo || '{}'), id = String(9000000 + (++n));
      MP.pagamentos[id] = { id, status: 'approved', external_reference: b.external_reference, transaction_amount: b.transaction_amount };
      return json(201, { id, status: 'pending', point_of_interaction: { transaction_data: { qr_code: `00020126pix${id}`, qr_code_base64: 'iVBORw0KGgo=' } } });
    }
    const m = /^\/(v1\/payments|preapproval)\/(.+)$/.exec(rq.url);
    if (m) {
      const x = (m[1] === 'preapproval' ? MP.assinaturas : MP.pagamentos)[decodeURIComponent(m[2])];
      return x ? json(200, x) : json(404, { message: 'não existe' });
    }
    return json(404, { message: 'mp falso' });
  });
});
await new Promise((r) => falso.listen(Number(process.env.FALSO_PORTA || 8099), '0.0.0.0', r));

let ipN = 0;
const ip = () => `198.51.100.${(++ipN % 250) + 1}`;            /* um IP de teste por pedido: o limite fica para o fim */
const transp = (corpo, t, ipFixo) => req('POST', '/api/fluxgk/checkout/transparente', t, corpo, { 'X-Real-IP': ipFixo || ip() });
let nEv = 0;
async function webhookStripe(type, object) {
  const corpo = JSON.stringify({ id: `evt_tr_${sfx}_${++nEv}`, type, data: { object } });
  const ts = Math.floor(Date.now() / 1000);
  const sig = `t=${ts},v1=${crypto.createHmac('sha256', STRIPE_SEGREDO).update(`${ts}.${corpo}`).digest('hex')}`;
  return req('POST', '/api/fluxgk/pagamento/webhook', null, corpo, { 'Stripe-Signature': sig });
}
const fatura = (sub, metadata) => ({
  id: `in_tr_${++nEv}`, billing_reason: 'subscription_create', customer: 'cus_tr_x', amount_paid: 4900,
  ...(metadata ? { parent: { subscription_details: { subscription: sub, metadata } } } : { subscription: sub }),
  lines: { data: [{ period: { end: Math.floor(Date.now() / 1000) + 30 * 86400 } }] },
});
function webhookMp(tipo, id) {
  const ts = String(Math.floor(Date.now() / 1000)), rid = `req-tr-${sfx}-${++nEv}`;
  const v1 = crypto.createHmac('sha256', MP_SEGREDO).update(`id:${String(id).toLowerCase()};request-id:${rid};ts:${ts};`).digest('hex');
  return req('POST', `/api/fluxgk/pagamento/webhook-mp?data.id=${encodeURIComponent(id)}&type=${tipo}`, null,
    JSON.stringify({ type: tipo, data: { id } }), { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': rid });
}
const codigo = (s) => req('GET', `/api/fluxgk/codigo?s=${encodeURIComponent(s)}`);

/* ------------------------------------------ contas ------------------------------------------ */
const su = await superusuario();
const admin = await conta(`admin-tr.${sfx}@ci.local`, { role: 'admin' });
const tec = await conta(`tec-tr.${sfx}@ci.local`, { plano: '', modulos: [], acessoAte: '', origemPlano: '' });
const outro = await conta(`outro-tr.${sfx}@ci.local`, { plano: '', modulos: [], acessoAte: '', origemPlano: '' });
const eu = async (c) => (await req('GET', `/api/collections/users/records/${c.id}`, su)).j;

/* ------------------------------------- cadastro dos gateways ------------------------------------- */
/* no CI este teste roda depois do de integrações, no mesmo banco: começa do zero (só a Stripe da stack) */
const zera = await req('PUT', '/api/fluxgk/admin/integracoes', admin.t, {
  provedorAtivo: 'stripe', mpAccessToken: '', mpWebhookSecret: '', mpPublicKey: '', stripePublicKey: '', stripeModo: '', mpModo: '',
});
ok(zera.s === 200, 'estado inicial: só a Stripe da stack, sem chave pública', zera);
ok((await req('GET', '/api/fluxgk/admin/integracoes', tec.t)).s === 403, 'técnico não vê os gateways');
const g0 = await req('GET', '/api/fluxgk/admin/integracoes', admin.t);
const gw = (j, id) => (j.gateways || []).find((g) => g.id === id);
ok(g0.s === 200 && Array.isArray(g0.j.gateways) && g0.j.gateways.length === 2, 'Admin vê a lista de gateways (Stripe e Mercado Pago)', g0.j);
ok(gw(g0.j, 'stripe').configurado === true && gw(g0.j, 'mercadopago').configurado === false, 'Stripe configurada (stack), Mercado Pago não', g0.j.gateways);
ok(gw(g0.j, 'stripe').modo === 'pagina', 'sem chave pública, o modo é a página do gateway', gw(g0.j, 'stripe'));

const semCred = await req('PUT', '/api/fluxgk/admin/integracoes', admin.t, { provedorAtivo: 'mercadopago' });
ok(semCred.s === 400 && semCred.j.data && semCred.j.data.codigo === 'gateway_sem_credencial', 'padrão sem credencial é recusado', semCred);
ok((await req('GET', '/api/fluxgk/admin/integracoes', admin.t)).j.padrao !== 'mercadopago', 'e o padrão não muda');
const pkRuim = await req('PUT', '/api/fluxgk/admin/integracoes', admin.t, { stripePublicKey: 'sk_test_errada' });
ok(pkRuim.s === 400 && pkRuim.j.data.codigo === 'chave_publica_invalida', 'chave pública no formato errado é recusada', pkRuim);
const modoRuim = await req('PUT', '/api/fluxgk/admin/integracoes', admin.t, { stripeModo: 'outro' });
ok(modoRuim.s === 400 && modoRuim.j.data.codigo === 'modo_invalido', 'modo de checkout inválido é recusado', modoRuim);

for (const [p, m, a] of [['basic', 2900, 27800], ['intermediate', 4900, 47000], ['advanced', 7900, 75800], ['pro', 11900, 114200]]) {
  await req('PUT', `/api/fluxgk/admin/precos/${p}`, admin.t, { mensalCentavos: m, anualCentavos: a });
}
const p0 = await req('GET', '/api/fluxgk/planos');
ok(p0.j.checkout && p0.j.checkout.gateway === 'stripe' && p0.j.checkout.modo === 'pagina', 'a página de planos sabe que a Stripe está em modo página', p0.j.checkout);
const modoPag = await transp({ plano: 'intermediate', ciclo: 'mensal', meio: 'cartao', email: EMAIL_ANON });
ok(modoPag.s === 409 && modoPag.j.data.codigo === 'modo_pagina', 'transparente recusado enquanto o modo é página', modoPag);

const st = await req('PUT', '/api/fluxgk/admin/integracoes', admin.t, { stripePublicKey: 'pk_test_ci1234567890', stripeModo: 'transparente', provedorAtivo: 'stripe', urlPublica: 'https://app.ci' });
ok(st.s === 200 && st.j.padrao === 'stripe' && gw(st.j, 'stripe').modo === 'transparente' && gw(st.j, 'stripe').chavePublica === 'pk_test_ci1234567890',
  'Admin cadastra a chave pública da Stripe, modo transparente, como padrão', st.j);
ok(!JSON.stringify(st.j).includes('sk_test_ci'), 'a tela continua sem receber a chave secreta');
const p1 = await req('GET', '/api/fluxgk/planos');
ok(p1.j.checkout.modo === 'transparente' && p1.j.checkout.chavePublica === 'pk_test_ci1234567890' && p1.j.checkout.meios.join() === 'cartao',
  'a página de planos recebe gateway, modo, chave pública e meios', p1.j.checkout);
ok(!/sk_test|whsec|APP_USR/.test(JSON.stringify(p1.j)), 'e nenhum segredo');

/* ------------------------------------- Stripe transparente ------------------------------------- */
ok((await transp({ plano: 'intermediate', ciclo: 'mensal', meio: 'cartao' })).j.data.codigo === 'email_invalido', 'compra anônima sem e-mail é recusada');
ok((await transp({ plano: 'nenhum', ciclo: 'mensal', email: EMAIL_ANON })).s === 400, 'plano inválido é recusado');
ok((await transp({ plano: 'basic', ciclo: 'mensal', meio: 'pix', email: EMAIL_ANON })).j.data.codigo === 'meio_invalido', 'Pix transparente não existe na Stripe');
const c1 = await transp({ plano: 'intermediate', ciclo: 'mensal', meio: 'cartao', email: EMAIL_ANON });
ok(c1.s === 200 && c1.j.gateway === 'stripe' && /_secret_/.test(c1.j.clientSecret) && /^st_[a-z0-9]{24}$/.test(c1.j.s), 'Stripe: devolve clientSecret e a sessão st_', c1.j);
const pSub = pedidos.filter((x) => x.u === '/v1/subscriptions').pop();
const qSub = new URLSearchParams(pSub.corpo);
ok(qSub.get('payment_behavior') === 'default_incomplete' && qSub.get('expand[0]') === 'latest_invoice.payment_intent' && qSub.get('metadata[sessao]') === c1.j.s,
  'a assinatura nasce incompleta, com a fatura expandida e a sessão na metadata', pSub.corpo);
ok(pSub.h['stripe-version'] === '2024-06-20', 'a versão da API da Stripe vai fixada no cabeçalho', pSub.h['stripe-version']);
ok(pedidos.some((x) => x.u === '/v1/customers' && new URLSearchParams(x.corpo).get('email') === EMAIL_ANON), 'o e-mail vai ao gateway (cliente da Stripe)');
ok((await codigo(c1.j.s)).j.estado === 'aguardando', 'antes do webhook, a página vê "aguardando"');
const sub1 = Object.keys(SUBS).find((k) => SUBS[k].metadata.sessao === c1.j.s);
const w1 = await webhookStripe('invoice.paid', fatura(sub1, SUBS[sub1].metadata));
ok(w1.s === 200 && w1.j.resultado === 'ok', 'a 1ª fatura paga é aceita', w1);
const k1 = await codigo(c1.j.s);
ok(k1.j.estado === 'pronto' && /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/.test(k1.j.codigo) && k1.j.plano === 'intermediate', 'e gera o código da compra anônima', k1.j);
await webhookStripe('invoice.paid', fatura(sub1, SUBS[sub1].metadata));
const cods1 = await req('GET', `/api/collections/codigos_ativacao/records?filter=${encodeURIComponent(`sessaoPagamento='${c1.j.s}'`)}`, su);
ok(cods1.j.totalItems === 1, 'a fatura repetida (outro evento) não gera um segundo código', cods1.j.totalItems);
const at = await req('POST', '/api/fluxgk/ativar', tec.t, { codigo: k1.j.codigo });
ok(at.s === 200 && (await eu(tec)).plano === 'intermediate' && (await eu(tec)).assinaturaId === sub1, 'o código ativa a conta e liga a assinatura', at);

const c2 = await transp({ plano: 'advanced', ciclo: 'anual', meio: 'cartao' }, outro.t);
ok(c2.s === 200 && c2.j.gateway === 'stripe', 'conta logada não precisa informar e-mail', c2);
const sub2 = Object.keys(SUBS).find((k) => SUBS[k].metadata.sessao === c2.j.s);
ok(SUBS[sub2].metadata.conta === outro.id, 'a conta logada vai na metadata da assinatura');
const w2 = await webhookStripe('invoice.paid', fatura(sub2, null));     /* sem metadata na fatura: o servidor relê a assinatura */
const o2 = await eu(outro);
ok(w2.s === 200 && o2.plano === 'advanced' && o2.assinaturaId === sub2, 'compra logada: o plano entra direto na conta (metadata relida)', { w2, plano: o2.plano });
ok((await codigo(c2.j.s)).j.estado === 'aplicado', 'e a página vê "plano aplicado"');

/* ---------------------------------- Mercado Pago transparente ---------------------------------- */
const mp = await req('PUT', '/api/fluxgk/admin/integracoes', admin.t, {
  mpAccessToken: MP_TOKEN, mpWebhookSecret: MP_SEGREDO, mpPublicKey: 'TEST-ci-publica-1234', mpModo: 'transparente', provedorAtivo: 'mercadopago',
});
ok(mp.s === 200 && mp.j.padrao === 'mercadopago' && gw(mp.j, 'mercadopago').configurado && gw(mp.j, 'mercadopago').modo === 'transparente', 'Mercado Pago transparente vira o padrão', mp.j);
const p2 = await req('GET', '/api/fluxgk/planos');
ok(p2.j.checkout.gateway === 'mercadopago' && p2.j.checkout.meios.join() === 'cartao,pix' && p2.j.checkout.chavePublica === 'TEST-ci-publica-1234', 'a página oferece cartão e Pix do Mercado Pago', p2.j.checkout);
ok((await transp({ plano: 'basic', ciclo: 'mensal', meio: 'cartao', email: EMAIL_ANON })).j.data.codigo === 'token_ausente', 'cartão sem token é recusado');
const recusado = await transp({ plano: 'basic', ciclo: 'mensal', meio: 'cartao', email: EMAIL_ANON, token: 'tok_recusado' });
ok(recusado.s === 402 && recusado.j.data.codigo === 'cartao_recusado', 'cartão recusado pelo gateway volta como 402', recusado);
const m1 = await transp({ plano: 'basic', ciclo: 'mensal', meio: 'cartao', email: EMAIL_ANON, token: TOK_MP });
ok(m1.s === 200 && /^mpa_pre/.test(m1.j.s) && m1.j.estado === 'authorized', 'MP cartão: assinatura criada com o token, sessão mpa_', m1.j);
const pPre = JSON.parse(pedidos.filter((x) => x.u === '/preapproval').pop().corpo);
ok(pPre.card_token_id === TOK_MP && pPre.payer_email === EMAIL_ANON && pPre.status === 'authorized' && /^mpplano/.test(pPre.preapproval_plan_id),
  'o pedido leva o token, o e-mail e o plano de assinatura', pPre);
const id1 = m1.j.s.slice(4);
ok((await webhookMp('subscription_preapproval', id1)).s === 200, 'webhook da assinatura aceito');
const km = await codigo(m1.j.s);
ok(km.j.estado === 'pronto' && km.j.plano === 'basic', 'e a compra anônima recebe o código', km.j);

const tec2 = await conta(`tec2-tr.${sfx}@ci.local`, { plano: '', modulos: [], acessoAte: '', origemPlano: '' });
const m2 = await transp({ plano: 'intermediate', ciclo: 'anual', meio: 'cartao', token: TOK_MP2 }, tec2.t);
ok(m2.s === 200, 'MP cartão logado', m2);
await webhookMp('subscription_preapproval', m2.j.s.slice(4));
const t2 = await eu(tec2);
ok(t2.plano === 'intermediate' && t2.assinaturaId === m2.j.s.slice(4), 'compra logada no MP: plano direto na conta e assinatura ligada', t2);
ok((await codigo(m2.j.s)).j.estado === 'aplicado', 'e a página vê "plano aplicado"');
await webhookMp('subscription_preapproval', m2.j.s.slice(4));
const cods2 = await req('GET', `/api/collections/codigos_ativacao/records?filter=${encodeURIComponent(`sessaoPagamento='${m2.j.s}'`)}`, su);
ok(cods2.j.totalItems === 1, 'o webhook repetido não aplica de novo', cods2.j.totalItems);

const x1 = await transp({ plano: 'basic', ciclo: 'mensal', meio: 'pix', email: EMAIL_ANON });
ok(x1.s === 200 && /^mp_[a-z0-9]{24}$/.test(x1.j.s) && /^00020126pix/.test(x1.j.pix.copiaECola) && x1.j.pix.imagem, 'MP Pix: QR e copia e cola na página', x1.j);
const pPix = pedidos.filter((x) => x.u === '/v1/payments' && x.m === 'POST').pop();
ok(pPix.h['x-idempotency-key'] === x1.j.s.slice(3) && JSON.parse(pPix.corpo).payment_method_id === 'pix', 'o Pix vai com chave de idempotência', pPix.h['x-idempotency-key']);
const pid = Object.keys(MP.pagamentos).pop();
ok((await webhookMp('payment', pid)).s === 200 && (await codigo(x1.j.s)).j.estado === 'pronto', 'Pix aprovado: sai o código');

/* --------------------------------- nada guardado do pagador --------------------------------- */
let tudo = '';
for (const col of ['eventos_pagamento', 'codigos_ativacao', 'users', 'config_integracoes', 'planos_config']) {
  const r = await req('GET', `/api/collections/${col}/records?perPage=500`, su);
  tudo += JSON.stringify(r.j);
}
tudo += JSON.stringify((await req('GET', '/api/logs?perPage=500', su)).j);
ok(tudo.length > 1000 && !tudo.includes(EMAIL_ANON), 'o e-mail digitado na compra anônima não está em registro nem em log');
ok(!tudo.includes(TOK_MP) && !tudo.includes(TOK_MP2) && !tudo.includes('_secret_ci'), 'nem o token do cartão, nem o clientSecret');

/* --------------------------------------- limite por IP --------------------------------------- */
const fixo = '203.0.113.77';
let ult = null;
for (let i = 0; i < 11; i++) ult = await transp({ plano: 'basic', ciclo: 'mensal', meio: 'pix', email: `x${i}@exemplo.com` }, null, fixo);
ok(ult.s === 429 && ult.j.data.codigo === 'muitas_tentativas', 'o 11º pedido do mesmo IP em 10 minutos é recusado', ult);
ok((await transp({ plano: 'basic', ciclo: 'mensal', meio: 'pix', email: EMAIL_ANON })).s === 200, 'outro IP continua comprando');

/* ------------------------------------- volta ao modo página ------------------------------------- */
await req('PUT', '/api/fluxgk/admin/integracoes', admin.t, { mpModo: 'pagina' });
const p3 = await req('GET', '/api/fluxgk/planos');
ok(p3.j.checkout.modo === 'pagina' && p3.j.checkout.chavePublica === '', 'modo página: a chave pública some da página de planos', p3.j.checkout);
const hosp = await req('POST', '/api/fluxgk/checkout', null, { plano: 'basic', ciclo: 'mensal', meio: 'pix' });
ok(hosp.s === 200 && hosp.j.url, 'e o checkout hospedado da 001 continua funcionando', hosp);

falso.close();
fim('checkout transparente (feature 003)');
