#!/usr/bin/env node
/* FluxGK · regras de `nodes` por plano (feature 001, risco R-01) contra um PocketBase de verdade.
 *
 * Para cada conta (basic, intermediate, advanced, pro, vencida, sem plano) × cada caminho de módulo de
 * pb_hooks/fluxgk_acesso.js (PREFIXOS) × criar / listar / ver / alterar / apagar, confere o resultado esperado:
 * liberado só se o módulo está no plano E o acesso não venceu. Caminhos do hub (perfil, clube, adversários)
 * ficam sempre liberados para o dono. Apagar é sempre do dono (excluir clube apaga tudo, RN-05). Outra conta
 * nunca vê nada. O tempo real (SSE) não entrega evento de módulo bloqueado.
 * Uso: node tools/test-planos-regras.mjs http://127.0.0.1:8090 */
import { cliente, placar } from './pb-ci.mjs';

const { req, superusuario, conta, U } = cliente(process.argv[2]);
const { ok, fim } = placar();

/* caminho (relativo a users/<id>/) → módulo; null = do hub, sempre liberado */
const CAMINHOS = [
  ['data/c1/t1/planner/sessions/1', 'planner'], ['library/exercises/9', 'planner'],
  ['data/c1/t1/periodization', 'period'],
  ['data/c1/t1/xg/games', 'xg'], ['xg-misc/k', 'xg'],
  ['data/c1/t1/stats/games/1', 'stats'],
  ['data/c1/t1/minutes/games/1', 'minutes'],
  ['data/c1/t1/load/players/p1', 'data'],
  ['data/c1/t1/profile/gk/p1', 'profile'], ['library/gkCriteria', 'profile'],
  ['scouting/goalkeepers/g1', 'scouting'],
  ['data/c1/t1/video', 'video'],
  ['profile', null], ['active', null], ['clubs/c1/meta', null], ['clubs/c1/opponents/o1', null],
];
const PLANOS = {
  basic: ['data', 'planner'],
  intermediate: ['data', 'planner', 'period', 'profile', 'minutes'],
  advanced: ['planner', 'period', 'xg', 'stats', 'minutes', 'video', 'data', 'profile', 'scouting'],
};
PLANOS.pro = PLANOS.advanced.concat(['inteligencia']);
const futuro = '2099-01-01 00:00:00.000Z', passado = '2020-01-01 00:00:00.000Z';
const CONTAS = {
  basic: { plano: 'basic', modulos: PLANOS.basic, acessoAte: futuro },
  intermediate: { plano: 'intermediate', modulos: PLANOS.intermediate, acessoAte: futuro },
  advanced: { plano: 'advanced', modulos: PLANOS.advanced, acessoAte: futuro },
  pro: { plano: 'pro', modulos: PLANOS.pro, acessoAte: futuro },
  vencida: { plano: 'pro', modulos: PLANOS.pro, acessoAte: passado },
  semplano: { plano: '', modulos: [], acessoAte: '' },
};
const libera = (nome, mod) => mod === null || (CONTAS[nome].modulos.includes(mod) && CONTAS[nome].acessoAte === futuro);
const enc = encodeURIComponent;

const su = await superusuario();
const sfx = Date.now().toString(36);
const contas = {};
for (const nome of Object.keys(CONTAS)) contas[nome] = await conta(`${nome}.${sfx}@ci.local`, { origemPlano: 'pagamento', ...CONTAS[nome] });
const intrusa = await conta(`intrusa.${sfx}@ci.local`);

for (const [nome, c] of Object.entries(contas)) {
  for (const [rel, mod] of CAMINHOS) {
    const path = `users/${c.id}/${rel}`, quer = libera(nome, mod), rot = `${nome} · ${rel}`;
    /* criar pelo próprio técnico */
    const cr = await req('POST', '/api/collections/nodes/records', c.t, { owner: c.id, path, data: { v: 1 } });
    ok((cr.s === 200) === quer, `${rot} · criar ${quer ? 'liberado' : 'recusado'}`, cr.s);
    /* nó gravado pelo servidor (existe mesmo quando bloqueado), para testar leitura/alteração/exclusão */
    let id = cr.s === 200 ? cr.j.id : null;
    if (!id) {
      const s = await req('POST', '/api/collections/nodes/records', su, { owner: c.id, path, data: { v: 1 } });
      id = s.j && s.j.id;
    }
    const li = await req('GET', `/api/collections/nodes/records?filter=${enc(`path="${path}"`)}`, c.t);
    ok((li.j && li.j.items && li.j.items.length === 1) === quer, `${rot} · listar ${quer ? 'vê' : 'não vê'}`, li.j);
    const vi = await req('GET', `/api/collections/nodes/records/${id}`, c.t);
    ok((vi.s === 200) === quer, `${rot} · ver ${quer ? 'liberado' : 'recusado'}`, vi.s);
    const up = await req('PATCH', `/api/collections/nodes/records/${id}`, c.t, { data: { v: 2 } });
    ok((up.s === 200) === quer, `${rot} · alterar ${quer ? 'liberado' : 'recusado'}`, up.s);
    const al = await req('GET', `/api/collections/nodes/records/${id}`, intrusa.t);
    ok(al.s === 404, `${rot} · outra conta não vê`, al.s);
    const de = await req('DELETE', `/api/collections/nodes/records/${id}`, c.t);
    ok(de.s === 204, `${rot} · apagar é sempre do dono`, de.s);
  }
}

/* o técnico não cria nó em nome de outro, mesmo com plano */
const forja = await req('POST', '/api/collections/nodes/records', intrusa.t, { owner: contas.pro.id, path: `users/${contas.pro.id}/profile`, data: { v: 1 } });
ok(forja.s >= 400, 'ninguém grava nó em nome de outro técnico', forja.s);

/* tempo real: a conta basic recebe evento de Load Control (liberado) e não de xG (bloqueado) */
async function ouvir(token, ms) {
  const ctl = new AbortController(), eventos = [];
  const r = await fetch(U + '/api/realtime', { signal: ctl.signal });
  const leitor = r.body.getReader(), dec = new TextDecoder();
  let buf = '', clientId = null, pronto;
  const conectado = new Promise((res) => { pronto = res; });
  (async () => {
    try {
      for (;;) {
        const { value, done } = await leitor.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let k;
        while ((k = buf.indexOf('\n\n')) >= 0) {
          const bloco = buf.slice(0, k); buf = buf.slice(k + 2);
          const ev = /event:(.*)/.exec(bloco), da = /data:(.*)/.exec(bloco);
          if (!ev) continue;
          const nomeEv = ev[1].trim(), dado = da ? JSON.parse(da[1]) : null;
          if (nomeEv === 'PB_CONNECT') { clientId = dado.clientId; pronto(); } else eventos.push(dado);
        }
      }
    } catch {}
  })();
  await conectado;
  const sub = await req('POST', '/api/realtime', token, { clientId, subscriptions: ['nodes/*'] });
  return { sub: sub.s, eventos, parar: () => ctl.abort(), espera: () => new Promise((res) => setTimeout(res, ms)) };
}
const b = contas.basic;
const rt = await ouvir(b.t, 1500);
ok(rt.sub === 204, 'tempo real: conta basic assina nodes', rt.sub);
await req('POST', '/api/collections/nodes/records', su, { owner: b.id, path: `users/${b.id}/data/c1/t1/load/players/rt`, data: { v: 1 } });
await req('POST', '/api/collections/nodes/records', su, { owner: b.id, path: `users/${b.id}/data/c1/t1/xg/rt`, data: { v: 1 } });
await rt.espera(); rt.parar();
const paths = rt.eventos.map((e) => e && e.record && e.record.path);
ok(paths.some((p) => p && p.includes('/load/')), 'tempo real: evento do módulo liberado chega', paths);
ok(!paths.some((p) => p && p.includes('/xg/')), 'tempo real: evento do módulo bloqueado não chega', paths);

fim('regras de nodes por plano');
