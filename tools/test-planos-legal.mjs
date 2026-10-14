#!/usr/bin/env node
/* FluxGK · Termos, Privacidade, aceite e exclusão da conta (feature 001, RN-P17 a RN-P20).
 * Confere: a rota pública começa sem nada publicado; só o Admin grava; publicar exige nome, e-mail e cidade/UF e sobe
 * a versão; o aceite grava versão e data e o técnico não grava o aceite direto na conta; versão nova pede aceite de
 * novo; excluir a conta exige o e-mail certo e apaga a conta, os nós e os links, soltando as referências.
 * Uso: node tools/test-planos-legal.mjs http://127.0.0.1:8090 */
import { cliente, placar } from './pb-ci.mjs';

const { req, superusuario, conta } = cliente(process.argv[2]);
const { ok, fim } = placar();
const sfx = Date.now().toString(36);
const su = await superusuario();
const admin = await conta(`admin-legal.${sfx}@ci.local`, { role: 'admin' });
const tec = await conta(`tec-legal.${sfx}@ci.local`);

const p0 = await req('GET', '/api/fluxgk/legal');
ok(p0.s === 200 && typeof p0.j.publicado === 'boolean' && p0.j.responsavel && p0.j.servicos, 'rota pública responde sem login', p0.j);
const v0 = p0.j.versao;

ok((await req('PUT', '/api/fluxgk/admin/legal', tec.t, { nomeResponsavel: 'x' })).s === 403, 'técnico não grava os dados legais');
ok((await req('GET', '/api/fluxgk/admin/legal', tec.t)).s === 403, 'técnico não abre a edição dos dados legais');
const incompleto = await req('PUT', '/api/fluxgk/admin/legal', admin.t, { nomeResponsavel: '', emailContato: '', cidadeUf: '', publicar: true });
ok(incompleto.s === 400, 'publicar sem nome, e-mail e cidade/UF: 400', incompleto.s);
const rascunho = await req('PUT', '/api/fluxgk/admin/legal', admin.t, {
  nomeResponsavel: 'Responsável CI', documento: '00.000.000/0001-00', endereco: 'Rua CI, 1', cidadeUf: 'Salvador/BA',
  emailContato: 'privacidade@ci.local', encarregadoNome: 'Encarregado CI',
});
ok(rascunho.s === 200 && rascunho.j.versao === v0 && rascunho.j.responsavel.nome === 'Responsável CI', 'salvar sem publicar não muda a versão', rascunho.j);
const pub = await req('PUT', '/api/fluxgk/admin/legal', admin.t, { publicar: true });
ok(pub.s === 200 && pub.j.publicado && pub.j.versao === v0 + 1 && pub.j.vigenciaDesde, 'publicar sobe a versão e marca a vigência', pub.j);
const p1 = await req('GET', '/api/fluxgk/legal');
ok(p1.j.responsavel.cidadeUf === 'Salvador/BA' && p1.j.encarregado.email === 'privacidade@ci.local', 'página pública mostra o responsável (encarregado usa o e-mail de contato)', p1.j);

const direto = await req('PATCH', `/api/collections/users/records/${tec.id}`, tec.t, { termosVersao: 99 });
ok(direto.s >= 400, 'técnico não grava o aceite direto na conta', direto.s);
ok((await req('POST', '/api/fluxgk/termos/aceitar', null, { versao: p1.j.versao })).s === 401, 'aceitar sem login: 401');
ok((await req('POST', '/api/fluxgk/termos/aceitar', tec.t, { versao: p1.j.versao - 1 })).s === 409, 'aceitar versão velha: 409');
const ac = await req('POST', '/api/fluxgk/termos/aceitar', tec.t, { versao: p1.j.versao });
const eu = (await req('GET', `/api/collections/users/records/${tec.id}`, su)).j;
ok(ac.s === 200 && eu.termosVersao === p1.j.versao && eu.termosAceitosEm, 'aceite grava versão e data na conta', eu);
await req('PUT', '/api/fluxgk/admin/legal', admin.t, { endereco: 'Rua CI, 2', publicar: true });
const p2 = await req('GET', '/api/fluxgk/legal');
ok(p2.j.versao === p1.j.versao + 1 && eu.termosVersao < p2.j.versao, 'versão nova: o aceite antigo deixa de valer', { conta: eu.termosVersao, atual: p2.j.versao });
const ev = await req('GET', '/api/fluxgk/admin/eventos?tipo=admin.legal', admin.t);
ok(ev.j.itens.some((i) => i.detalhe.includes('publicados na versão')), 'publicações ficam no histórico', ev.j.itens.map((i) => i.detalhe));

/* exclusão da conta pelo titular */
const sai = await conta(`sai.${sfx}@ci.local`, { plano: 'pro' });
await req('POST', '/api/collections/nodes/records', su, { owner: sai.id, path: `users/${sai.id}/data/c/t/load/players/p1`, data: { v: 1 } });
await req('POST', '/api/collections/autoavaliacao_links/records', su, { owner: sai.id, base: `users/${sai.id}/data/c/t`, playerId: 'p1', token: 'a'.repeat(48), ativo: true });
const cort = await req('POST', '/api/fluxgk/admin/codigos', admin.t, { plano: 'basic', dias: 10, motivo: 'teste exclusão' });
await req('POST', '/api/fluxgk/ativar', sai.t, { codigo: cort.j.codigo });
ok((await req('POST', '/api/fluxgk/conta/excluir', sai.t, { email: 'outro@ci.local' })).s === 400, 'excluir com e-mail errado: 400');
const ex = await req('POST', '/api/fluxgk/conta/excluir', sai.t, { email: `SAI.${sfx}@ci.local` });
ok(ex.s === 200 && ex.j.excluida, 'excluir com o próprio e-mail (qualquer caixa): 200', ex);
const some = await req('GET', `/api/collections/users/records/${sai.id}`, su);
const nos = await req('GET', `/api/collections/nodes/records?filter=${encodeURIComponent(`owner="${sai.id}"`)}`, su);
const links = await req('GET', `/api/collections/autoavaliacao_links/records?filter=${encodeURIComponent(`owner="${sai.id}"`)}`, su);
ok(some.s === 404 && nos.j.totalItems === 0 && links.j.totalItems === 0, 'a conta, os nós e os links somem', { conta: some.s, nos: nos.j.totalItems, links: links.j.totalItems });
const cods = await req('GET', '/api/fluxgk/admin/codigos', admin.t);
const item = cods.j.itens.find((i) => i.motivo === 'teste exclusão');
ok(item && item.usadoPor === '', 'o código usado pela conta excluída fica sem dado pessoal', item);
ok((await req('POST', '/api/collections/users/auth-with-password', null, { identity: `sai.${sfx}@ci.local`, password: sai.senha })).s === 400, 'a conta excluída não entra mais');

fim('documentos legais e conta');
