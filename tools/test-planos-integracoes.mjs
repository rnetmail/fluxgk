#!/usr/bin/env node
/* FluxGK · integrações configuradas pelo Admin (feature 001, ampliação de 14/10: RN-P14 a RN-P16).
 *
 * O PocketBase precisa subir com PB_ENCRYPTION_KEY (32 caracteres), STRIPE_API_URL e MP_API_URL apontando para o
 * serviço FALSO que este script sobe em FALSO_PORTA (padrão 8099; ele responde como Stripe ou como Mercado Pago,
 * conforme a chave). Confere: só o Admin vê e grava; as chaves ficam cifradas no banco e nunca voltam em claro;
 * testar conexão; trocar o provedor ativo cria os planos que faltam no Mercado Pago; checkout no cartão e no Pix;
 * webhook do Mercado Pago (assinatura, repetição, Pix anônimo e logado, assinatura no cartão e renovação);
 * login Google liga e desliga pela tela.
 * Uso: node tools/test-planos-integracoes.mjs http://127.0.0.1:8090 */
import http from 'node:http';
import crypto from 'node:crypto';
import { cliente, placar } from './pb-ci.mjs';

const { req, superusuario, conta } = cliente(process.argv[2]);
const { ok, fim } = placar();
const sfx = Date.now().toString(36);
const SUB = crypto.randomBytes(16).toString('hex'), P9001 = 'p1' + sfx, P9002 = 'p2' + sfx, P9003 = 'p3' + sfx, COB1 = 'c1' + sfx, COB2 = 'c2' + sfx;
const MP_TOKEN = 'APP_USR-ci-token-1234', MP_SEGREDO = 'mp-segredo-ci';

/* --------------------------- serviço falso (Stripe + Mercado Pago) --------------------------- */
const pedidos = [], MP = { pagamentos: {}, assinaturas: {}, cobrancas: {} };
let n = 0;
const falso = http.createServer((rq, rs) => {
  let corpo = '';
  rq.on('data', (d) => (corpo += d)).on('end', () => {
    pedidos.push({ m: rq.method, u: rq.url, corpo, auth: rq.headers.authorization });
    const json = (s, j) => { rs.writeHead(s, { 'content-type': 'application/json' }); rs.end(JSON.stringify(j)); };
    const a = rq.headers.authorization;
    if (a === 'Bearer sk_test_ci') {
      if (rq.url === '/v1/prices') return json(200, { id: `price_ci_${++n}` });
      if (rq.url.startsWith('/v1/prices/')) return json(200, { active: false });
      if (rq.url === '/v1/balance') return json(200, { livemode: false });
      return json(404, { error: { message: 'stripe falso' } });
    }
    if (a !== `Bearer ${MP_TOKEN}`) return json(401, { message: 'token' });
    if (rq.url === '/users/me') return json(200, { id: 1, nickname: 'CONTA-MP-CI' });
    if (rq.url === '/preapproval_plan') return json(201, { id: `mpplano${++n}`, init_point: 'https://mp.falso/plano' });
    if (rq.url === '/checkout/preferences') return json(201, { id: `pref${++n}`, init_point: 'https://mp.falso/pix' });
    const m = /^\/(v1\/payments|preapproval|authorized_payments)\/(.+)$/.exec(rq.url);
    if (m) {
      const tabela = { 'v1/payments': MP.pagamentos, preapproval: MP.assinaturas, authorized_payments: MP.cobrancas }[m[1]];
      const x = tabela[decodeURIComponent(m[2])];
      return x ? json(200, x) : json(404, { message: 'não existe' });
    }
    return json(404, { message: 'mp falso' });
  });
});
await new Promise((r) => falso.listen(Number(process.env.FALSO_PORTA || 8099), '0.0.0.0', r));

function webhookMp(tipo, id, opc = {}) {
  const ts = String(opc.ts || Math.floor(Date.now() / 1000)), rid = `req-${sfx}-${++n}`;
  const v1 = crypto.createHmac('sha256', opc.segredo || MP_SEGREDO).update(`id:${String(id).toLowerCase()};request-id:${rid};ts:${ts};`).digest('hex');
  return req('POST', `/api/fluxgk/pagamento/webhook-mp?data.id=${encodeURIComponent(id)}&type=${tipo}`, null,
    JSON.stringify({ type: tipo, data: { id } }), { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': rid });
}

/* ------------------------------------------ contas ------------------------------------------ */
const su = await superusuario();
const admin = await conta(`admin-int.${sfx}@ci.local`, { role: 'admin' });
const tec = await conta(`tec-int.${sfx}@ci.local`, { plano: '', modulos: [], acessoAte: '' });
const eu = async (c) => (await req('GET', `/api/collections/users/records/${c.id}`, su)).j;

/* ---------------------------------- só o Admin, nada em claro ---------------------------------- */
ok((await req('GET', '/api/fluxgk/admin/integracoes', tec.t)).s === 403, 'técnico não vê as integrações');
ok((await req('PUT', '/api/fluxgk/admin/integracoes', tec.t, { mpAccessToken: 'x' })).s === 403, 'técnico não grava as integrações');
ok((await req('GET', '/api/fluxgk/admin/integracoes')).s >= 401, 'sem login não vê as integrações');
const g0 = await req('GET', '/api/fluxgk/admin/integracoes', admin.t);
ok(g0.s === 200 && g0.j.cifra === true, 'Admin vê as integrações e a cifra está ligada', g0.j);

const precos = [['basic', 2900, 27800], ['intermediate', 4900, 47000], ['advanced', 7900, 75800], ['pro', 11900, 114200]];
for (const [p, m, a] of precos) await req('PUT', `/api/fluxgk/admin/precos/${p}`, admin.t, { mensalCentavos: m, anualCentavos: a });
const antesMp = pedidos.filter((x) => x.u === '/preapproval_plan').length;
const put = await req('PUT', '/api/fluxgk/admin/integracoes', admin.t, {
  provedorAtivo: 'mercadopago', urlPublica: 'https://app.ci/', mpAccessToken: MP_TOKEN, mpWebhookSecret: MP_SEGREDO,
});
ok(put.s === 200 && put.j.provedorAtivo === 'mercadopago' && put.j.urlPublica === 'https://app.ci', 'Admin ativa o Mercado Pago', put.j);
ok(put.j.mercadopago.token.definida && put.j.mercadopago.token.final === '1234' && put.j.mercadopago.token.origem === 'tela',
  'a tela mostra só "definida · final 1234"', put.j.mercadopago);
ok(!JSON.stringify(put.j).includes(MP_TOKEN) && !JSON.stringify(put.j).includes(MP_SEGREDO), 'a resposta nunca traz a chave em claro');
ok(put.j.precosCriados === 8 && pedidos.filter((x) => x.u === '/preapproval_plan').length - antesMp === 8,
  'trocar para o Mercado Pago cria os 8 planos de assinatura que faltavam', put.j.precosCriados);
const reg = (await req('GET', '/api/collections/config_integracoes/records', su)).j.items[0];
ok(reg && reg.mpAccessToken.startsWith('enc:') && !reg.mpAccessToken.includes(MP_TOKEN) && reg.mpWebhookSecret.startsWith('enc:'),
  'no banco as chaves estão cifradas', reg && reg.mpAccessToken.slice(0, 12));
const ev = await req('GET', '/api/fluxgk/admin/eventos?tipo=admin.integracoes', admin.t);
ok(ev.j.itens.length >= 1 && !JSON.stringify(ev.j).includes(MP_TOKEN), 'o histórico registra a mudança sem a chave', ev.j.itens[0]);
const t1 = await req('POST', '/api/fluxgk/admin/integracoes/testar', admin.t, { provedor: 'mercadopago' });
ok(t1.j.ok === true && t1.j.conta === 'CONTA-MP-CI', 'testar conexão com o Mercado Pago', t1.j);
const t2 = await req('POST', '/api/fluxgk/admin/integracoes/testar', admin.t, { provedor: 'stripe' });
ok(t2.j.ok === true, 'testar conexão com a Stripe', t2.j);
const ruim = await req('PUT', '/api/fluxgk/admin/integracoes', admin.t, { provedorAtivo: 'paypal' });
ok(ruim.s === 400, 'provedor desconhecido: 400', ruim.s);

/* ----------------------------------------- checkout ----------------------------------------- */
const pl = await req('GET', '/api/fluxgk/planos');
ok(pl.j.provedor === 'mercadopago' && JSON.stringify(pl.j.meios) === '["cartao","pix"]' && pl.j.pagamentoDisponivel, 'planos: Mercado Pago com cartão e Pix', pl.j);
const cartao = await req('POST', '/api/fluxgk/checkout', null, { plano: 'intermediate', ciclo: 'mensal', meio: 'cartao' });
ok(cartao.s === 200 && /preapproval_plan_id=mpplano\d+/.test(cartao.j.url), 'cartão: página do plano de assinatura', cartao.j);
const planoMpId = /preapproval_plan_id=(mpplano\d+)/.exec(cartao.j.url)[1];
const pix = await req('POST', '/api/fluxgk/checkout', null, { plano: 'basic', ciclo: 'anual', meio: 'pix' });
const pref = JSON.parse(pedidos.filter((x) => x.u === '/checkout/preferences').pop().corpo);
ok(pix.s === 200 && pix.j.url === 'https://mp.falso/pix' && pref.items[0].unit_price === 278
  && pref.payment_methods.excluded_payment_types.map((x) => x.id).join() === 'credit_card,debit_card,ticket'
  && pref.notification_url === 'https://app.ci/api/fluxgk/pagamento/webhook-mp', 'Pix: preferência só com Pix, valor do período, aviso no app', pref);
const nonce = pref.external_reference.split('|')[4];
ok(pref.external_reference.startsWith('fluxgk|basic|anual||') && pref.back_urls.success === `https://app.ci/assinatura-ok.html?s=mp_${nonce}`,
  'Pix anônimo: referência sem conta e volta para a página do código', pref.external_reference);

/* ------------------------------------------ webhook ------------------------------------------ */
MP.pagamentos[P9001] = { id: P9001, status: 'approved', transaction_amount: 278, external_reference: pref.external_reference };
ok((await webhookMp('payment', P9001, { segredo: 'errado' })).s === 400, 'webhook com assinatura errada: 400');
ok((await webhookMp('payment', P9001, { ts: Math.floor(Date.now() / 1000) - 3600 })).s === 400, 'webhook assinado há 1 hora: 400');
const w1 = await webhookMp('payment', P9001);
ok(w1.s === 200 && w1.j.ok, 'Pix aprovado: 200', w1);
const w2 = await webhookMp('payment', P9001);
ok(w2.s === 200 && w2.j.repetido, 'a mesma notificação de novo: repetida, sem efeito', w2.j);
const cod = await req('GET', `/api/fluxgk/codigo?s=mp_${nonce}`);
ok(cod.j.estado === 'pronto' && cod.j.plano === 'basic', 'Pix anônimo: a página de sucesso mostra o código', cod.j);
await req('POST', '/api/fluxgk/ativar', tec.t, { codigo: cod.j.codigo });
const r1 = await eu(tec);
const dias1 = (Date.parse(r1.acessoAte.replace(' ', 'T')) - Date.now()) / 864e5;
ok(r1.plano === 'basic' && dias1 > 360 && dias1 < 370, 'código do Pix anual vale 1 ano', { plano: r1.plano, dias: dias1 });
MP.pagamentos[P9002] = { id: P9002, status: 'pending', external_reference: pref.external_reference };
const w3 = await webhookMp('payment', P9002);
ok(w3.j.resultado === 'ignorado', 'Pix pendente não gera nada', w3.j);

/* Pix logado: o período entra direto e soma ao que ainda falta */
await req('POST', '/api/fluxgk/checkout', tec.t, { plano: 'basic', ciclo: 'mensal', meio: 'pix' });
const prefLog = JSON.parse(pedidos.filter((x) => x.u === '/checkout/preferences').pop().corpo);
ok(prefLog.external_reference.split('|')[3] === tec.id, 'Pix logado: a referência leva a conta', prefLog.external_reference);
MP.pagamentos[P9003] = { id: P9003, status: 'approved', transaction_amount: 29, external_reference: prefLog.external_reference };
await webhookMp('payment', P9003);
const r2 = await eu(tec);
const dias2 = (Date.parse(r2.acessoAte.replace(' ', 'T')) - Date.now()) / 864e5;
ok(dias2 > dias1 + 27, 'renovar por Pix antes de vencer soma o mês ao que faltava', { antes: dias1, depois: dias2 });

/* cartão: assinatura autorizada gera código; a cobrança mensal estende */
MP.assinaturas[SUB] = { id: SUB, status: 'authorized', preapproval_plan_id: planoMpId };
const w4 = await webhookMp('subscription_preapproval', SUB);
const cod2 = await req('GET', `/api/fluxgk/codigo?s=mpa_${SUB}`);
ok(w4.j.ok && cod2.j.estado === 'pronto' && cod2.j.plano === 'intermediate', 'cartão: assinatura autorizada gera o código', { w4: w4.j, cod2: cod2.j });
const tec2 = await conta(`tec2-int.${sfx}@ci.local`, { plano: '', modulos: [], acessoAte: '' });
await req('POST', '/api/fluxgk/ativar', tec2.t, { codigo: cod2.j.codigo });
const r3 = await eu(tec2);
ok(r3.plano === 'intermediate' && r3.assinaturaId === SUB, 'cartão: código liga a assinatura à conta', r3);
const debito = new Date(Date.now() + 20 * 864e5).toISOString();
MP.cobrancas[COB1] = { id: COB1, status: 'processed', preapproval_id: SUB, debit_date: debito, transaction_amount: 49 };
await webhookMp('subscription_authorized_payment', COB1);
const r4 = await eu(tec2);
const dias4 = (Date.parse(r4.acessoAte.replace(' ', 'T')) - Date.now()) / 864e5;
ok(dias4 > 48 && dias4 < 54, 'cartão: a cobrança do mês estende o acesso a partir do débito', dias4);
const portal = await req('POST', '/api/fluxgk/portal', tec2.t);
ok(portal.j.url === 'https://www.mercadopago.com.br/subscriptions', 'portal de quem assina pelo Mercado Pago aponta para a conta MP', portal.j);
MP.assinaturas[SUB].status = 'cancelled';
await webhookMp('subscription_preapproval', SUB);
ok((await eu(tec2)).acessoAte === r4.acessoAte, 'cancelar não corta o acesso antes do vencimento');

/* ------------------------------------------- Google ------------------------------------------- */
const gg = await req('PUT', '/api/fluxgk/admin/integracoes', admin.t, { googleClientId: 'id-ci.apps.googleusercontent.com', googleClientSecret: 'segredo-google-ci' });
const am = await req('GET', '/api/collections/users/auth-methods');
ok(gg.j.google.ligado && gg.j.google.clientId === 'id-ci.apps.googleusercontent.com' && !JSON.stringify(gg.j).includes('segredo-google-ci')
  && am.j.oauth2.enabled && am.j.oauth2.providers.some((p) => p.name === 'google'), 'salvar o Google liga o login na hora', { g: gg.j.google, am: am.j.oauth2.enabled });
const so = await req('PUT', '/api/fluxgk/admin/integracoes', admin.t, { googleClientId: 'id-ci.apps.googleusercontent.com' });
ok(so.j.google.ligado && so.j.google.segredoDefinido, 'trocar só o Client ID mantém o segredo', so.j.google);
const off = await req('PUT', '/api/fluxgk/admin/integracoes', admin.t, { googleClientId: '' });
const am2 = await req('GET', '/api/collections/users/auth-methods');
ok(!off.j.google.ligado && !am2.j.oauth2.providers.some((p) => p.name === 'google'), 'apagar o Client ID desliga o login Google', off.j.google);

/* volta para a Stripe: o webhook do Mercado Pago continua valendo para quem já assina */
const volta = await req('PUT', '/api/fluxgk/admin/integracoes', admin.t, { provedorAtivo: 'stripe' });
ok(volta.j.provedorAtivo === 'stripe' && (await req('GET', '/api/fluxgk/planos')).j.provedor === 'stripe', 'Admin volta para a Stripe');
MP.cobrancas[COB2] = { id: COB2, status: 'processed', preapproval_id: SUB, debit_date: new Date(Date.now() + 50 * 864e5).toISOString(), transaction_amount: 49 };
await webhookMp('subscription_authorized_payment', COB2);
ok((await eu(tec2)).acessoAte > r4.acessoAte, 'com a Stripe ativa, a renovação do Mercado Pago continua estendendo');

falso.close();
fim('integrações');
