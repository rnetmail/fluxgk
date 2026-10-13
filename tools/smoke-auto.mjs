#!/usr/bin/env node
/* FluxGK · fumaça da autoavaliação do goleiro (pb_hooks/autoavaliacao.pb.js + coleção autoavaliacao_links)
 * contra um PocketBase de verdade. Confere: o técnico cria o link; outra conta não o vê; o link público
 * mostra goleiro e clube; resposta válida grava na árvore do técnico (uma por dia, substitui); resposta
 * inválida é recusada; código errado e link revogado dão 404.
 * Uso: node tools/smoke-auto.mjs http://127.0.0.1:8090 */
import crypto from 'node:crypto';
const U = (process.argv[2] || 'http://127.0.0.1:8090').replace(/\/$/, '');
let n = 0, falhas = 0;
const ok = (c, nome, det) => { n++; if (!c) falhas++; console.log(`${c ? 'ok  ' : 'FALHOU'} ${String(n).padStart(2)} · ${nome}${!c && det ? ' → ' + det : ''}`); };
async function req(m, p, t, b) {
  const r = await fetch(U + p, { method: m, headers: { 'content-type': 'application/json', ...(t ? { Authorization: t } : {}) }, body: b ? JSON.stringify(b) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { s: r.status, j };
}
async function conta(email) {
  const senha = 'senha-auto-123456';
  await req('POST', '/api/collections/users/records', null, { email, password: senha, passwordConfirm: senha });
  const r = await req('POST', '/api/collections/users/auth-with-password', null, { identity: email, password: senha });
  return { t: r.j.token, id: r.j.record.id };
}
const sufixo = Date.now().toString(36);
const tec = await conta(`tecnico.${sufixo}@ci.local`), outro = await conta(`outro.${sufixo}@ci.local`);
const base = `users/${tec.id}/data/clube/t2026`;
const token = crypto.randomBytes(24).toString('hex');
const cria = await req('POST', '/api/collections/autoavaliacao_links/records', tec.t,
  { owner: tec.id, base, playerId: 'p_1', playerName: 'Rui', clubName: 'Clube CI', token, ativo: true });
ok(cria.s === 200, 'técnico cria o link', `${cria.s} ${JSON.stringify(cria.j)}`);
const alheio = await req('GET', '/api/collections/autoavaliacao_links/records', outro.t);
ok(alheio.s === 200 && alheio.j.items.length === 0, 'outra conta não vê o link', JSON.stringify(alheio.j));
const anon = await req('GET', '/api/collections/autoavaliacao_links/records');
ok(!(anon.j && anon.j.items && anon.j.items.length), 'sem login não lista os links', JSON.stringify(anon.j));
const forjado = await req('POST', '/api/collections/autoavaliacao_links/records', outro.t,
  { owner: tec.id, base, playerId: 'p_x', token: crypto.randomBytes(24).toString('hex'), ativo: true });
ok(forjado.s >= 400, 'ninguém cria link em nome de outro técnico', forjado.s);

const g = await req('GET', `/api/fluxgk/auto/${token}`);
ok(g.s === 200 && g.j.goleiro === 'Rui' && g.j.clube === 'Clube CI' && g.j.resposta === null, 'link público mostra goleiro e clube', JSON.stringify(g.j));
ok(!JSON.stringify(g.j).includes(tec.id) && !JSON.stringify(g.j).includes('users/'), 'link público não expõe o técnico nem o caminho');
const p1 = await req('POST', `/api/fluxgk/auto/${token}`, null, { humor: 4, sono: 3, alimentacao: 5, obs: 'dormi tarde' });
ok(p1.s === 200 && /^\d{4}-\d{2}-\d{2}$/.test(p1.j.data), 'resposta válida é aceita', JSON.stringify(p1.j));
const nos = await req('GET', `/api/collections/nodes/records?filter=${encodeURIComponent(`path~"load/auto"`)}`, tec.t);
const no = nos.j.items && nos.j.items[0];
ok(no && no.path === `${base}/load/auto/p_1/${p1.j.data}` && no.data.v.humor === 4 && no.data.v.obs === 'dormi tarde',
   'resposta gravada na árvore do técnico', JSON.stringify(no));
const p2 = await req('POST', `/api/fluxgk/auto/${token}`, null, { humor: 2, sono: 2, alimentacao: 2 });
const nos2 = await req('GET', `/api/collections/nodes/records?filter=${encodeURIComponent(`path~"load/auto"`)}`, tec.t);
ok(p2.s === 200 && nos2.j.items.length === 1 && nos2.j.items[0].data.v.humor === 2 && !nos2.j.items[0].data.v.obs,
   'responder de novo no mesmo dia substitui', JSON.stringify(nos2.j.items));
const g2 = await req('GET', `/api/fluxgk/auto/${token}`);
ok(g2.j.resposta && g2.j.resposta.humor === 2, 'link mostra a resposta de hoje', JSON.stringify(g2.j));
const ruim = await req('POST', `/api/fluxgk/auto/${token}`, null, { humor: 7, sono: 3, alimentacao: 3 });
ok(ruim.s === 400, 'nota fora de 1..5 é recusada', ruim.s);
const longa = await req('POST', `/api/fluxgk/auto/${token}`, null, { humor: 3, sono: 3, alimentacao: 3, obs: 'x'.repeat(501) });
ok(longa.s === 400, 'observação longa demais é recusada', longa.s);
const errado = await req('GET', `/api/fluxgk/auto/${'0'.repeat(48)}`);
ok(errado.s === 404, 'código inexistente: 404', errado.s);
const lixo = await req('GET', `/api/fluxgk/auto/..%2F..%2Fusers`);
ok(lixo.s === 404, 'código com formato errado: 404', lixo.s);
await req('PATCH', `/api/collections/autoavaliacao_links/records/${cria.j.id}`, tec.t, { ativo: false });
const revog = await req('POST', `/api/fluxgk/auto/${token}`, null, { humor: 3, sono: 3, alimentacao: 3 });
ok(revog.s === 404, 'link revogado: 404', revog.s);

console.log(`\n${n - falhas}/${n} verificações passaram.`);
process.exit(falhas ? 1 : 0);
