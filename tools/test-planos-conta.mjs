#!/usr/bin/env node
/* FluxGK · proteção da conta (feature 001, D-09): o técnico não grava o próprio plano, e ninguém se cadastra
 * pela API sem passar pelo Google (OAuth2) ou pelo Admin.
 * Uso: node tools/test-planos-conta.mjs http://127.0.0.1:8090 */
import { cliente, placar } from './pb-ci.mjs';

const { req, conta } = cliente(process.argv[2]);
const { ok, fim } = placar();
const sfx = Date.now().toString(36);

const anon = await req('POST', '/api/collections/users/records', null,
  { email: `anon.${sfx}@ci.local`, password: 'senha-anon-123456', passwordConfirm: 'senha-anon-123456' });
ok(anon.s >= 400, 'cadastro anônimo pela API é recusado', anon.s);
const anonPlano = await req('POST', '/api/collections/users/records', null,
  { email: `anon2.${sfx}@ci.local`, password: 'senha-anon-123456', passwordConfirm: 'senha-anon-123456', plano: 'pro', acessoAte: '2099-01-01 00:00:00.000Z' });
ok(anonPlano.s >= 400, 'cadastro anônimo com plano também', anonPlano.s);

const c = await conta(`basic.${sfx}@ci.local`, { plano: 'basic', modulos: ['data', 'planner'], acessoAte: '2099-01-01 00:00:00.000Z', origemPlano: 'pagamento' });
const tentativas = {
  plano: 'pro', modulos: ['xg'], acessoAte: '2100-01-01 00:00:00.000Z', origemPlano: 'cortesia', role: 'admin',
  testeUsado: false, assinaturaId: 'sub_x', clientePagamentoId: 'cus_x', tentativasCodigo: 0, tentativasDesde: '',
  termosVersao: 99, termosAceitosEm: '2026-01-01 00:00:00.000Z',
};
for (const [campo, valor] of Object.entries(tentativas)) {
  const r = await req('PATCH', `/api/collections/users/records/${c.id}`, c.t, { [campo]: valor });
  ok(r.s >= 400, `técnico não grava ${campo} na própria conta`, r.s);
}
const nome = await req('PATCH', `/api/collections/users/records/${c.id}`, c.t, { name: 'Técnico CI' });
ok(nome.s === 200 && nome.j.name === 'Técnico CI', 'técnico continua alterando o próprio nome', nome.s);
const eu = await req('GET', `/api/collections/users/records/${c.id}`, c.t);
ok(eu.j && eu.j.plano === 'basic' && JSON.stringify(eu.j.modulos) === JSON.stringify(['data', 'planner']) && eu.j.role === 'tecnico',
  'o plano da conta continua o que o servidor gravou', eu.j);

const outra = await conta(`outra.${sfx}@ci.local`);
const alheia = await req('PATCH', `/api/collections/users/records/${c.id}`, outra.t, { name: 'invasor' });
ok(alheia.s === 404, 'ninguém altera a conta de outro', alheia.s);
const lista = await req('GET', '/api/collections/users/records', outra.t);
ok(lista.j && lista.j.items && lista.j.items.length === 1 && lista.j.items[0].id === outra.id, 'cada um só lista a si', lista.j);

const metodos = await req('GET', '/api/collections/users/auth-methods');
ok(metodos.s === 200 && metodos.j.password && metodos.j.password.enabled === true, 'e-mail e senha continuam ligados', metodos.j);

const planos = await req('GET', '/api/collections/planos_config/records');
ok(planos.s === 200, 'tabela de preços é pública para leitura', planos.s);
for (const col of ['codigos_ativacao', 'eventos_pagamento', 'testes_usados']) {
  const r = await req('GET', `/api/collections/${col}/records`, c.t);
  ok(r.s === 403 || (r.j && r.j.items && r.j.items.length === 0 && r.s !== 200), `${col} não é legível pelo técnico`, r.s);
}

fim('proteção da conta');
