#!/usr/bin/env node
/* FluxGK · assinatura (feature 001) contra um PocketBase de verdade e um serviço de pagamento FALSO.
 *
 * O PocketBase precisa subir com:
 *   STRIPE_SECRET_KEY=sk_test_ci  STRIPE_WEBHOOK_SECRET=whsec_ci  FLUXGK_URL_PUBLICA=https://app.ci
 *   STRIPE_API_URL=http://<host visto do contêiner>:<porta do falso>   (ex.: host.docker.internal:8099)
 * Este script sobe o falso na porta FALSO_PORTA (padrão 8099) e confere: webhook (assinatura válida, inválida,
 * vencida, repetida, fora de ordem), código (gerado, reexibido, ativado, usado, corrida, limite de erros), compra
 * logada aplica direto, troca de plano, rotas do Admin (cortesia, conta, preços), checkout, planos, autoavaliação
 * com plano vencido e a exclusão de subárvore.
 * Uso: node tools/test-planos-assinatura.mjs http://127.0.0.1:8090 */
import http from 'node:http';
import crypto from 'node:crypto';
import { cliente, placar } from './pb-ci.mjs';

const { req, superusuario, conta } = cliente(process.argv[2]);
const { ok, fim } = placar();
const SEGREDO = 'whsec_ci';
const sfx = Date.now().toString(36);

/* ------------------------------- serviço de pagamento falso ------------------------------- */
const pedidos = [];
let nPrice = 0;
const falso = http.createServer((rq, rs) => {
  let corpo = '';
  rq.on('data', (d) => (corpo += d)).on('end', () => {
    pedidos.push({ m: rq.method, u: rq.url, corpo, auth: rq.headers.authorization });
    const json = (s, j) => { rs.writeHead(s, { 'content-type': 'application/json' }); rs.end(JSON.stringify(j)); };
    if (rq.headers.authorization !== 'Bearer sk_test_ci') return json(401, { error: { message: 'chave' } });
    if (rq.url === '/v1/prices' && rq.method === 'POST') return json(200, { id: `price_ci_${++nPrice}` });
    if (rq.url.startsWith('/v1/prices/')) return json(200, { id: rq.url.split('/').pop(), active: false });
    if (rq.url === '/v1/checkout/sessions') return json(200, { id: 'cs_test_falso', url: 'https://pagamento.falso/cs_test_falso' });
    if (rq.url === '/v1/billing_portal/sessions') return json(200, { url: 'https://pagamento.falso/portal' });
    return json(404, { error: { message: 'rota do falso' } });
  });
});
await new Promise((r) => falso.listen(Number(process.env.FALSO_PORTA || 8099), '0.0.0.0', r));

function assinar(corpo, t) {
  const ts = t || Math.floor(Date.now() / 1000);
  return `t=${ts},v1=${crypto.createHmac('sha256', SEGREDO).update(`${ts}.${corpo}`).digest('hex')}`;
}
async function webhook(ev, opc = {}) {
  const corpo = JSON.stringify(ev);
  return req('POST', '/api/fluxgk/pagamento/webhook', null, corpo,
    { 'Stripe-Signature': opc.assinatura || assinar(corpo, opc.t) });
}
let nEv = 0;
const evento = (type, object) => ({ id: `evt_ci_${sfx}_${++nEv}`, type, data: { object } });

/* ------------------------------------------ contas ------------------------------------------ */
const su = await superusuario();
const admin = await conta(`admin.${sfx}@ci.local`, { role: 'admin' });
const tec = await conta(`tec.${sfx}@ci.local`, { plano: '', modulos: [], acessoAte: '', origemPlano: '' });
const outro = await conta(`outro.${sfx}@ci.local`, { plano: '', modulos: [], acessoAte: '', origemPlano: '' });
const eu = async (c) => (await req('GET', `/api/collections/users/records/${c.id}`, su)).j;

/* ----------------------------------------- preços ----------------------------------------- */
const semAdmin = await req('PUT', '/api/fluxgk/admin/precos/basic', tec.t, { mensalCentavos: 2900, anualCentavos: 27800 });
ok(semAdmin.s === 403, 'técnico não mexe em preço', semAdmin.s);
for (const [p, m, a] of [['basic', 2900, 27800], ['intermediate', 4900, 47000], ['advanced', 7900, 75800], ['pro', 11900, 114200]]) {
  const r = await req('PUT', `/api/fluxgk/admin/precos/${p}`, admin.t, { mensalCentavos: m, anualCentavos: a });
  ok(r.s === 200 && r.j.mensalCentavos === m, `Admin define o preço do ${p}`, r);
}
ok(pedidos.filter((x) => x.u === '/v1/prices').length === 8, 'cada preço vira um Price no serviço (4 planos × 2 ciclos)', pedidos.length);
const repreco = await req('PUT', '/api/fluxgk/admin/precos/basic', admin.t, { mensalCentavos: 3500, anualCentavos: 27800 });
ok(repreco.s === 200 && pedidos.some((x) => x.u === '/v1/prices/price_ci_1' && x.corpo.includes('active=false')),
  'mudar o preço mensal cria um Price novo e arquiva o antigo', pedidos.slice(-2));
const planos = await req('GET', '/api/fluxgk/planos');
const basic = planos.j && planos.j.planos.find((p) => p.plano === 'basic');
ok(planos.s === 200 && planos.j.pagamentoDisponivel === true && basic.mensalCentavos === 3500
  && JSON.stringify(basic.modulos) === JSON.stringify(['data', 'planner']), 'página de planos lê módulos e preço novo', planos.j);
ok(!JSON.stringify(planos.j).includes('price_ci'), 'página de planos não expõe ids internos de preço');

/* ----------------------------------------- checkout ----------------------------------------- */
const co = await req('POST', '/api/fluxgk/checkout', null, { plano: 'intermediate', ciclo: 'anual' });
const pedidoCo = pedidos.find((x) => x.u === '/v1/checkout/sessions');
ok(co.s === 200 && co.j.url === 'https://pagamento.falso/cs_test_falso', 'checkout devolve a página hospedada', co);
ok(pedidoCo && pedidoCo.corpo.includes('mode=subscription') && pedidoCo.corpo.includes(encodeURIComponent('metadata[plano]') + '=intermediate')
  && pedidoCo.corpo.includes('price_ci_4') && !pedidoCo.corpo.includes('client_reference_id'),
  'checkout anônimo: assinatura, plano no metadata, Price anual, sem conta', pedidoCo && pedidoCo.corpo);
const coLog = await req('POST', '/api/fluxgk/checkout', tec.t, { plano: 'basic', ciclo: 'mensal' });
const pedidoLog = pedidos.filter((x) => x.u === '/v1/checkout/sessions').pop();
ok(coLog.s === 200 && pedidoLog.corpo.includes(`client_reference_id=${tec.id}`), 'checkout logado leva a conta junto', pedidoLog.corpo);
const coRuim = await req('POST', '/api/fluxgk/checkout', null, { plano: 'ouro', ciclo: 'mensal' });
ok(coRuim.s === 400, 'plano inexistente: 400', coRuim.s);

/* ------------------------------------------ webhook ------------------------------------------ */
const sessao = `cs_test_${sfx}_a`;
const evCompra = evento('checkout.session.completed', { id: sessao, payment_status: 'paid', subscription: `sub_${sfx}_a`,
  customer: `cus_${sfx}_a`, metadata: { plano: 'intermediate', ciclo: 'mensal' }, amount_total: 4900 });
const falsa = await webhook(evCompra, { assinatura: 't=1,v1=' + 'a'.repeat(64) });
ok(falsa.s === 400, 'webhook com assinatura falsa: 400', falsa.s);
const velha = await webhook(evCompra, { t: Math.floor(Date.now() / 1000) - 3600 });
ok(velha.s === 400, 'webhook assinado há 1 hora: 400', velha.s);
const antes = await req('GET', `/api/fluxgk/codigo?s=${sessao}`);
ok(antes.s === 200 && antes.j.estado === 'aguardando', 'antes do webhook: aguardando', antes.j);
const w1 = await webhook(evCompra);
ok(w1.s === 200 && w1.j.ok, 'webhook válido: 200', w1);
const w2 = await webhook(evCompra);
ok(w2.s === 200 && w2.j.repetido === true, 'mesmo evento de novo: repetido, sem efeito', w2.j);
const cod = await req('GET', `/api/fluxgk/codigo?s=${sessao}`);
ok(cod.s === 200 && cod.j.estado === 'pronto' && /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/.test(cod.j.codigo) && cod.j.plano === 'intermediate',
  'página de sucesso mostra o código', cod.j);
const cod2 = await req('GET', `/api/fluxgk/codigo?s=${sessao}`);
ok(cod2.j.codigo === cod.j.codigo, 'reabrir a página mostra o mesmo código');
const lixo = await req('GET', '/api/fluxgk/codigo?s=..%2Fusers');
ok(lixo.s === 404, 'sessão com formato errado: 404', lixo.s);
const nCodigos = (await req('GET', `/api/collections/codigos_ativacao/records?filter=${encodeURIComponent(`sessaoPagamento="${sessao}"`)}`, su)).j.totalItems;
ok(nCodigos === 1, 'uma compra gera um código só', nCodigos);
const pix = evento('checkout.session.completed', { id: `cs_test_${sfx}_pix`, payment_status: 'unpaid', subscription: `sub_${sfx}_pix`,
  metadata: { plano: 'basic', ciclo: 'mensal' } });
await webhook(pix);
const pixAntes = await req('GET', `/api/fluxgk/codigo?s=cs_test_${sfx}_pix`);
ok(pixAntes.j.estado === 'aguardando', 'Pix ainda não pago: sem código', pixAntes.j);
await webhook(evento('checkout.session.async_payment_succeeded', { ...pix.data.object, payment_status: 'paid' }));
const pixDepois = await req('GET', `/api/fluxgk/codigo?s=cs_test_${sfx}_pix`);
ok(pixDepois.j.estado === 'pronto', 'Pix confirmado depois: código sai', pixDepois.j);

/* ------------------------------------------ ativação ------------------------------------------ */
const anon = await req('POST', '/api/fluxgk/ativar', null, { codigo: cod.j.codigo });
ok(anon.s === 401, 'ativar sem login: 401', anon.s);
const at = await req('POST', '/api/fluxgk/ativar', tec.t, { codigo: cod.j.codigo.toLowerCase().replace(/-/g, ' ') });
const tecDepois = await eu(tec);
ok(at.s === 200 && tecDepois.plano === 'intermediate' && tecDepois.modulos.length === 5 && tecDepois.origemPlano === 'pagamento'
  && tecDepois.assinaturaId === `sub_${sfx}_a`, 'código ativa o plano (minúsculas e espaços aceitos)', { at: at.j, conta: tecDepois });
const usado = await req('POST', '/api/fluxgk/ativar', outro.t, { codigo: cod.j.codigo });
ok(usado.s === 409, 'código já usado: 409', usado);
const cod3 = await req('GET', `/api/fluxgk/codigo?s=${sessao}`);
ok(cod3.j.estado === 'usado' && !cod3.j.codigo, 'página de sucesso depois do uso: "usado", sem o código', cod3.j);

/* corrida: duas contas ativam o mesmo código ao mesmo tempo */
const corrida = (await req('GET', `/api/fluxgk/codigo?s=cs_test_${sfx}_pix`)).j.codigo;
const c1 = await conta(`c1.${sfx}@ci.local`, { plano: '', modulos: [], acessoAte: '' });
const c2 = await conta(`c2.${sfx}@ci.local`, { plano: '', modulos: [], acessoAte: '' });
const [r1, r2] = await Promise.all([req('POST', '/api/fluxgk/ativar', c1.t, { codigo: corrida }), req('POST', '/api/fluxgk/ativar', c2.t, { codigo: corrida })]);
ok([r1.s, r2.s].sort().join(',') === '200,409', 'corrida pelo mesmo código: um 200, um 409', [r1.s, r2.s]);

/* limite de erros por conta */
const chute = await conta(`chute.${sfx}@ci.local`, { plano: '', modulos: [], acessoAte: '' });
const st = [];
for (let i = 0; i < 11; i++) st.push((await req('POST', '/api/fluxgk/ativar', chute.t, { codigo: `ZZZZ-ZZZZ-ZZZZ-ZZ${String(i).padStart(2, '2').replace(/[01]/g, '9')}` })).s);
ok(st.slice(0, 10).every((s) => s === 400) && st[10] === 429, '10 erros e a 11ª tentativa é bloqueada', st);

/* ------------------------------------- renovação e troca ------------------------------------- */
const fim1 = Math.floor(Date.now() / 1000) + 40 * 86400, fim2 = fim1 + 30 * 86400;
await webhook(evento('invoice.paid', { subscription: `sub_${sfx}_a`, amount_paid: 4900, lines: { data: [{ period: { end: fim2 } }] } }));
const r2a = await eu(tec);
await webhook(evento('invoice.paid', { parent: { subscription_details: { subscription: `sub_${sfx}_a` } }, lines: { data: [{ period: { end: fim1 } }] } }));
const r2b = await eu(tec);
ok(new Date(r2a.acessoAte.replace(' ', 'T')).getTime() >= fim2 * 1000, 'fatura paga estende o acesso', r2a.acessoAte);
ok(r2b.acessoAte === r2a.acessoAte, 'fatura antiga chegando depois não recua o acesso', [r2a.acessoAte, r2b.acessoAte]);
await webhook(evento('customer.subscription.updated', { id: `sub_${sfx}_a`, items: { data: [{ price: { id: 'price_x', metadata: { plano: 'advanced' } } }] } }));
const r3 = await eu(tec);
ok(r3.plano === 'advanced' && r3.modulos.length === 9, 'troca de plano no portal vale na hora', r3);
await webhook(evento('customer.subscription.deleted', { id: `sub_${sfx}_a` }));
const r4 = await eu(tec);
ok(r4.plano === 'advanced' && r4.acessoAte === r3.acessoAte, 'cancelar não corta o acesso antes do vencimento', r4);
const portal = await req('POST', '/api/fluxgk/portal', tec.t);
ok(portal.s === 200 && portal.j.url === 'https://pagamento.falso/portal', 'portal do cliente para quem pagou', portal);
const semPortal = await req('POST', '/api/fluxgk/portal', admin.t);
ok(semPortal.s === 404, 'conta sem assinatura paga não tem portal', semPortal.s);

/* compra feita já logado: o plano entra direto, sem código */
const logada = await conta(`logada.${sfx}@ci.local`, { plano: '', modulos: [], acessoAte: '' });
await webhook(evento('checkout.session.completed', { id: `cs_test_${sfx}_log`, payment_status: 'paid', subscription: `sub_${sfx}_log`,
  customer: `cus_${sfx}_log`, client_reference_id: logada.id, metadata: { plano: 'basic', ciclo: 'anual' } }));
const rl = await eu(logada);
ok(rl.plano === 'basic' && rl.clientePagamentoId === `cus_${sfx}_log`, 'compra logada aplica o plano direto', rl);
const pl = await req('GET', `/api/fluxgk/codigo?s=cs_test_${sfx}_log`);
ok(pl.j.estado === 'aplicado' && !pl.j.codigo, 'página de sucesso da compra logada: "aplicado"', pl.j);

/* ------------------------------------------- Admin ------------------------------------------- */
const naoAdm = await req('GET', '/api/fluxgk/admin/contas', tec.t);
ok(naoAdm.s === 403, 'técnico não lista contas', naoAdm.s);
const contasAdm = await req('GET', `/api/fluxgk/admin/contas?q=${encodeURIComponent('tec.' + sfx)}`, admin.t);
ok(contasAdm.s === 200 && contasAdm.j.itens.length === 1 && contasAdm.j.itens[0].plano === 'advanced' && contasAdm.j.itens[0].assinatura === true,
  'Admin lista e busca contas com plano e assinatura', contasAdm);
const cort = await req('POST', '/api/fluxgk/admin/codigos', admin.t, { plano: 'pro', dias: 30, motivo: 'parceiro CI' });
ok(cort.s === 200 && /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/.test(cort.j.codigo), 'Admin gera cortesia', cort);
const semMotivo = await req('POST', '/api/fluxgk/admin/codigos', admin.t, { plano: 'pro', dias: 30 });
ok(semMotivo.s === 400, 'cortesia sem motivo: 400', semMotivo.s);
const ganha = await conta(`ganha.${sfx}@ci.local`, { plano: '', modulos: [], acessoAte: '' });
await req('POST', '/api/fluxgk/ativar', ganha.t, { codigo: cort.j.codigo });
const rg = await eu(ganha);
const dias = (new Date(rg.acessoAte.replace(' ', 'T')) - Date.now()) / 86400000;
ok(rg.plano === 'pro' && rg.origemPlano === 'cortesia' && dias > 29 && dias < 31, 'cortesia de 30 dias aplicada', rg);
const lista = await req('GET', '/api/fluxgk/admin/codigos', admin.t);
const item = lista.j.itens.find((i) => i.motivo === 'parceiro CI');
ok(item && item.usadoPor === ganha.email && item.criadoPor === admin.email && !JSON.stringify(lista.j).match(/[A-Z2-9]{4}-[A-Z2-9]{4}-/),
  'lista de códigos mostra quem gerou e quem usou, nunca o código', item);
const nova = await req('POST', '/api/fluxgk/admin/contas', admin.t, { email: `criada.${sfx}@ci.local`, senha: 'senha-criada-123', plano: 'basic', dias: 0 });
ok(nova.s === 200 && nova.j.plano === 'basic' && nova.j.acessoAte.startsWith('9999'), 'Admin cria conta com e-mail e senha (T-17)', nova);
const entra = await req('POST', '/api/collections/users/auth-with-password', null, { identity: `criada.${sfx}@ci.local`, password: 'senha-criada-123' });
ok(entra.s === 200, 'conta criada pelo Admin entra', entra.s);
const dup = await req('POST', '/api/fluxgk/admin/contas', admin.t, { email: `criada.${sfx}@ci.local`, senha: 'senha-criada-123', plano: 'basic' });
ok(dup.s === 409, 'e-mail repetido: 409', dup.s);
const muda = await req('PATCH', `/api/fluxgk/admin/contas/${nova.j.id}`, admin.t, { plano: 'advanced' });
ok(muda.s === 200 && muda.j.plano === 'advanced' && muda.j.acessoAte.startsWith('9999'), 'Admin troca o plano e mantém o prazo', muda.j);
const desat = await req('PATCH', `/api/fluxgk/admin/contas/${nova.j.id}`, admin.t, { ativo: false });
ok(desat.s === 200 && desat.j.modulos.length === 0, 'Admin desativa a conta', desat.j);
const auto = await req('PATCH', `/api/fluxgk/admin/contas/${admin.id}`, admin.t, { role: 'tecnico' });
ok(auto.s === 400, 'Admin não tira o próprio papel de admin', auto.s);
const ev = await req('GET', '/api/fluxgk/admin/eventos?tipo=admin', admin.t);
ok(ev.s === 200 && ev.j.itens.some((i) => i.tipo === 'admin.cortesia') && ev.j.itens.some((i) => i.tipo === 'admin.conta.criada'),
  'ações do Admin ficam no histórico', ev.j.itens.map((i) => i.tipo));
const rej = await req('GET', '/api/fluxgk/admin/eventos?tipo=webhook.rejeitado', admin.t);
ok(rej.j.itens.length >= 2, 'webhooks rejeitados ficam no histórico', rej.j.itens.length);

/* ----------------------------- autoavaliação com plano vencido ----------------------------- */
const venc = await conta(`venc.${sfx}@ci.local`, { acessoAte: '2020-01-01 00:00:00.000Z' });
const tk = crypto.randomBytes(24).toString('hex');
await req('POST', '/api/collections/autoavaliacao_links/records', su,
  { owner: venc.id, base: `users/${venc.id}/data/c/t`, playerId: 'p1', playerName: 'Rui', clubName: 'CI', token: tk, ativo: true });
const av = await req('POST', `/api/fluxgk/auto/${tk}`, null, { humor: 3, sono: 3, alimentacao: 3 });
ok(av.s === 403, 'autoavaliação recusa quando o plano do técnico venceu', av);

/* ------------------------------- exclusão de clube por inteiro ------------------------------- */
const sub = await conta(`sub.${sfx}@ci.local`, { plano: 'basic', modulos: ['data', 'planner'], acessoAte: '2099-01-01 00:00:00.000Z' });
for (const p of ['data/cx/t1/xg/games', 'data/cx/t1/load/players/p1', 'data/cx/t2/stats/games/1', 'data/cy/t1/load/players/p9'])
  await req('POST', '/api/collections/nodes/records', su, { owner: sub.id, path: `users/${sub.id}/${p}`, data: { v: 1 } });
const alheia = await req('POST', '/api/fluxgk/apagar-subarvore', tec.t, { path: `users/${sub.id}/data/cx` });
ok(alheia.s === 400, 'ninguém apaga a subárvore de outro', alheia.s);
const larga = await req('POST', '/api/fluxgk/apagar-subarvore', sub.t, { path: `users/${sub.id}/data` });
ok(larga.s === 400, 'não apaga acima de um clube', larga.s);
const ap = await req('POST', '/api/fluxgk/apagar-subarvore', sub.t, { path: `users/${sub.id}/data/cx` });
const resta = (await req('GET', `/api/collections/nodes/records?filter=${encodeURIComponent(`owner="${sub.id}"`)}`, su)).j.items.map((i) => i.path);
ok(ap.s === 200 && ap.j.apagados === 3 && resta.length === 1 && resta[0].includes('/cy/'),
  'excluir o clube apaga também os módulos fora do plano, e só aquele clube', { ap: ap.j, resta });

falso.close();
fim('assinatura');
