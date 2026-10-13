#!/usr/bin/env node
/* FluxGK · teste da mescla de adversários (D-17), a mesma função nos três módulos que gravam no
 * cadastro do clube (Estatística, Minutagem, xG). Extrai `fluxgkMesclarAdversarios` de cada página,
 * confere que as três cópias são idênticas e roda os casos. Uso: node tools/test-adversarios.mjs */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGINAS = ['mod_stats.html', 'mod_minutes.html', 'mod_xg.html'];
let n = 0, falhas = 0;
const ok = (c, nome, det) => { n++; if (!c) falhas++; console.log(`${c ? 'ok  ' : 'FALHOU'} ${String(n).padStart(2)} · ${nome}${!c && det ? ' → ' + det : ''}`); };

function extrai(pag) {
  const html = fs.readFileSync(path.join(RAIZ, pag), 'utf8');
  const i = html.indexOf('function fluxgkMesclarAdversarios(');
  if (i < 0) return null;
  let prof = 0, j = html.indexOf('{', i);
  for (let k = j; k < html.length; k++) {
    if (html[k] === '{') prof++;
    else if (html[k] === '}' && --prof === 0) return html.slice(i, k + 1);
  }
  return null;
}
const fontes = PAGINAS.map(extrai);
PAGINAS.forEach((p, i) => ok(!!fontes[i], `${p} tem a função`));
ok(fontes.every(f => f === fontes[0]), 'as três cópias são idênticas');
const ctx = {}; vm.runInNewContext(fontes[0] + '\nthis.f = fluxgkMesclarAdversarios;', ctx);
const f = ctx.f;
const J = x => JSON.stringify(x);

const nuvem = {
  'leoes': { id: 'leoes', name: 'Leões', badge: 'data:esc-leoes' },
  '171': { id: '171', name: 'Tigres', gk: 'Rui', badge: 'data:esc-tigres' },
};
// Minutagem regrava sem escudo: nada muda (antes apagava os escudos)
let u = f(nuvem, [{ name: 'Leões' }, { name: 'Tigres' }], []);
ok(J(u) === '{}', 'lista igual, sem escudo: não grava nada', J(u));
// nome com outra caixa casa com o mesmo registro
u = f(nuvem, [{ name: 'leões' }], []);
ok(Object.keys(u).length === 1 && u.leoes && u.leoes.badge === 'data:esc-leoes', 'casa pelo nome sem diferença de maiúsculas', J(u));
// adversário novo: id pelo nome
u = f(nuvem, [{ name: 'Águias FC', badge: 'data:x' }], []);
ok(u['-guias-fc'] && u['-guias-fc'].badge === 'data:x' && Object.keys(u).length === 1, 'novo adversário com id pelo nome', J(u));
// xG: id próprio, img vira badge e gk é mantido
u = f(nuvem, [{ id: '999', name: 'Falcões', img: 'data:f', gk: 'Zé' }], []);
ok(u['999'] && u['999'].badge === 'data:f' && !('img' in u['999']) && u['999'].gk === 'Zé', 'xG: img vira badge, gk mantido', J(u));
// xG atualizando um que a Estatística criou: mantém o id da nuvem
u = f(nuvem, [{ id: '555', name: 'Leões', img: 'data:novo' }], []);
ok(u.leoes && u.leoes.badge === 'data:novo' && !u['555'], 'mesmo nome de outro módulo: atualiza o registro existente', J(u));
// só apaga o que foi apagado aqui
u = f(nuvem, [{ name: 'Leões' }], ['Tigres']);
ok(J(u) === J({ '171': null }), 'apaga só o que este módulo apagou', J(u));
u = f(nuvem, [], []);
ok(J(u) === '{}', 'lista local vazia não apaga a nuvem', J(u));
// campos de outro módulo sobrevivem
u = f(nuvem, [{ name: 'Tigres', badge: 'data:t2' }], []);
ok(u['171'] && u['171'].gk === 'Rui' && u['171'].badge === 'data:t2', 'campo de outro módulo (gk) sobrevive', J(u));

console.log(`\n${n - falhas}/${n} verificações passaram.`);
process.exit(falhas ? 1 : 0);
