#!/usr/bin/env node
/* FluxGK · teste da reconciliação do Load Control com a nuvem (fluxgkReconciliarCarga, mod_data.html).
 * Substituiu o rtPushAll, que enviava a cópia do navegador antes de ler: desfazia alterações de outro
 * aparelho e apagava foto e status dos goleiros. Uso: node tools/test-carga.mjs */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(RAIZ, 'mod_data.html'), 'utf8');
let n = 0, falhas = 0;
const ok = (c, nome, det) => { n++; if (!c) falhas++; console.log(`${c ? 'ok  ' : 'FALHOU'} ${String(n).padStart(2)} · ${nome}${!c && det ? ' → ' + det : ''}`); };
const i = html.indexOf('function fluxgkReconciliarCarga(');
let prof = 0, fim = -1;
for (let k = html.indexOf('{', i); k < html.length; k++) { if (html[k] === '{') prof++; else if (html[k] === '}' && --prof === 0) { fim = k + 1; break; } }
ok(i >= 0 && fim > 0, 'mod_data.html tem a função');
const ctx = {}; vm.runInNewContext(html.slice(i, fim) + '\nthis.f = fluxgkReconciliarCarga;', ctx);
const f = ctx.f, J = x => JSON.stringify(x);

// 1. foto e status do servidor sobrevivem a um goleiro local "magro" (o bug do rtPushAll)
let r = f({ players: { p_1: { name: 'Rui', id: 'p_1' } }, sessions: [] },
          { players: { p_1: { name: 'Rui', id: 'p_1', photo: 'data:foto', status: 'lesao', statusDesde: '2026-10-01' } } }, {}, true);
ok(r.players.p_1.photo === 'data:foto' && r.players.p_1.status === 'lesao', 'foto e status da nuvem são mantidos', J(r.players));
ok(r.gravarPlayers.length === 0, 'goleiro igual não é regravado', J(r.gravarPlayers));

// 2. registro novo deste aparelho sobe; 3. registro já sincronizado que sumiu da nuvem sai daqui
const P = { players: { p_1: { name: 'Rui', id: 'p_1' } } };
r = f({ players: { p_1: { name: 'Rui', id: 'p_1', _sync: 1 } }, sessions: [
      { id: 'pre_1', _pk: 'p_1', ts: 100 },
      { id: 'pre_2', _pk: 'p_1', ts: 90, _sync: 90 }] }, P, {}, true);
ok(r.gravarSessoes.map(s => s.id).join() === 'pre_1', 'registro novo deste aparelho sobe', J(r.gravarSessoes));
ok(!r.sessions.some(s => s.id === 'pre_2'), 'registro apagado em outro aparelho sai daqui', J(r.sessions));

// 4. nuvem mais recente vence; 5. local mais recente sobe
const R4 = { players: P.players, sessions: { p_1: { pre_3: { id: 'pre_3', ts: 100, mt: 300, sono: 5 } } } };
r = f({ players: P.players, sessions: [{ id: 'pre_3', _pk: 'p_1', ts: 100, mt: 200, sono: 2, _sync: 100 }] }, R4, {}, true);
ok(r.sessions[0].sono === 5 && r.gravarSessoes.length === 0, 'alteração mais recente da nuvem vence', J(r.sessions));
r = f({ players: P.players, sessions: [{ id: 'pre_3', _pk: 'p_1', ts: 100, mt: 400, sono: 1, _sync: 100 }] }, R4, {}, true);
ok(r.sessions[0].sono === 1 && r.gravarSessoes.length === 1, 'alteração local mais recente sobe', J(r.gravarSessoes));

// 6. apagado aqui sem conexão: apaga na nuvem; 7. novo na nuvem: entra aqui
const R6 = { players: P.players, sessions: { p_1: { pre_4: { id: 'pre_4', ts: 50 }, pre_5: { id: 'pre_5', ts: 60 } } } };
r = f({ players: P.players, sessions: [] }, R6, { sessions: { pre_4: 1 } }, true);
ok(r.apagarSessoes.map(s => s.id).join() === 'pre_4', 'exclusão feita sem conexão chega à nuvem', J(r.apagarSessoes));
ok(r.sessions.map(s => s.id).join() === 'pre_5', 'registro novo da nuvem entra aqui', J(r.sessions));

// 8. igual nos dois lados com gravação em voo: não confirma; 9. sem voo: confirma
const L8 = { players: P.players, sessions: [{ id: 'pre_6', _pk: 'p_1', ts: 70 }] };
const R8 = { players: P.players, sessions: { p_1: { pre_6: { id: 'pre_6', ts: 70 } } } };
r = f(L8, R8, {}, false);
ok(!r.sessions[0]._sync, 'com gravação em voo, igual não vira sincronizado', J(r.sessions));
r = f(L8, R8, {}, true);
ok(r.sessions[0]._sync === 70, 'sem gravação em voo, igual vira sincronizado', J(r.sessions));

// 10. goleiro apagado aqui: apaga na nuvem com os registros dele
r = f({ players: {}, sessions: [] },
      { players: { p_2: { name: 'Ze', id: 'p_2' } }, sessions: { p_2: { pre_7: { id: 'pre_7', ts: 1 } } } },
      { players: { p_2: 1 } }, true);
ok(r.apagarPlayers.join() === 'p_2' && r.apagarSessoes.map(s => s.id).join() === 'pre_7' && !r.players.p_2,
   'goleiro apagado aqui é apagado na nuvem, com os registros', J(r));

// 11. goleiro apagado em outro aparelho: registros locais dele não sobem
r = f({ players: { p_3: { name: 'Bia', id: 'p_3', _sync: 1 } }, sessions: [{ id: 'pre_8', _pk: 'p_3', ts: 5 }] },
      { players: {}, sessions: {} }, {}, true);
ok(!r.players.p_3 && r.gravarSessoes.length === 0 && r.sessions.length === 0, 'goleiro apagado em outro aparelho leva os registros', J(r));

// 12. goleiro novo deste aparelho sobe com foto e status
r = f({ players: { p_4: { name: 'Leo', id: 'p_4', photo: 'data:x', status: 'convocado' } }, sessions: [] }, {}, {}, true);
ok(r.gravarPlayers.length === 1 && r.gravarPlayers[0].campos.photo === 'data:x' && r.gravarPlayers[0].campos.status === 'convocado',
   'goleiro novo sobe com foto e status, sem apagar nada', J(r.gravarPlayers));

console.log(`\n${n - falhas}/${n} verificações passaram.`);
process.exit(falhas ? 1 : 0);
