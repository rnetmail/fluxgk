#!/usr/bin/env node
/* FluxGK · fumaça das rotas de versão (pb_hooks/versoes.pb.js) contra um PocketBase de verdade.
 *
 * O PocketBase precisa estar com AMBIENTE=hml, FLUXGK_ADMINS=chefe@ci.local e o superusuário
 * ci@ci.local / ci-senha-123456 (é como o CI sobe). Confere: sem login → 401; conta comum → 403;
 * admin e superusuário → painel com versões publicadas; e que fora de PRD a troca é recusada.
 *
 * Uso: node tools/smoke-versoes.mjs http://127.0.0.1:8090
 */
const U = (process.argv[2] || 'http://127.0.0.1:8090').replace(/\/$/, '');
const SENHA = 'senha-ci-123456';
let n = 0, falhas = 0;
function ok(cond, nome, det) {
  n++;
  if (!cond) falhas++;
  console.log(`${cond ? 'ok  ' : 'FALHOU'} ${String(n).padStart(2)} · ${nome}${!cond && det ? ' → ' + det : ''}`);
}
async function req(metodo, caminho, token, corpo) {
  const r = await fetch(U + caminho, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(token ? { Authorization: token } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, j };
}
async function token(colecao, email, senha) {
  const r = await req('POST', `/api/collections/${colecao}/auth-with-password`, null, { identity: email, password: senha });
  return r.j && r.j.token;
}
async function conta(email) {
  await req('POST', '/api/collections/users/records', null, { email, password: SENHA, passwordConfirm: SENHA });
  return token('users', email, SENHA);
}

const semLogin = await req('GET', '/api/fluxgk/versoes');
ok(semLogin.status === 401, 'sem login: 401', semLogin.status);

const comum = await conta('comum@ci.local');
const rc = await req('GET', '/api/fluxgk/versoes', comum);
ok(rc.status === 403, 'conta comum: 403 no painel', rc.status);
const rci = await req('POST', '/api/fluxgk/versoes/implantar', comum, { acao: 'nova' });
ok(rci.status === 403, 'conta comum: 403 ao implantar', rci.status);

const chefe = await conta('chefe@ci.local');
const ra = await req('GET', '/api/fluxgk/versoes', chefe);
ok(ra.status === 200, 'admin por e-mail: 200', `${ra.status} ${JSON.stringify(ra.j)}`);
ok(ra.j && Array.isArray(ra.j.versoes) && ra.j.versoes.length > 0, 'painel lista versões publicadas', JSON.stringify(ra.j && ra.j.versoes));
ok(ra.j && ra.j.versoes.every(v => /^1\.\d{4}\.\d{3}$/.test(v.versao)), 'versões no formato 1.<ano>.<seq>');
ok(ra.j && ra.j.ambiente === 'hml' && ra.j.podeTrocar === false, 'em HML o painel não oferece troca', JSON.stringify(ra.j && { a: ra.j.ambiente, p: ra.j.podeTrocar }));
const rai = await req('POST', '/api/fluxgk/versoes/implantar', chefe, { acao: 'existente', versao: '1.2026.001' });
ok(rai.status === 409 && /produção/.test(rai.j && rai.j.message), 'em HML a troca é recusada', `${rai.status} ${JSON.stringify(rai.j)}`);

const su = await token('_superusers', 'ci@ci.local', 'ci-senha-123456');
const rs = await req('GET', '/api/fluxgk/versoes', su);
ok(rs.status === 200, 'superusuário: 200', rs.status);

console.log(`\n${n - falhas}/${n} verificações passaram.`);
process.exit(falhas ? 1 : 0);
