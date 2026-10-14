/// <reference path="../pb_data/types.d.ts" />
/// FluxGK · rotas dos documentos legais e da conta do titular (feature 001, RN-P17 a RN-P20).
///   GET  /api/fluxgk/legal               público  → dados do responsável, versão e vigência
///   GET  /api/fluxgk/admin/legal         Admin    → idem, para editar
///   PUT  /api/fluxgk/admin/legal         Admin    {campos…, publicar?} → publicar sobe a versão
///   POST /api/fluxgk/termos/aceitar      logado   {versao} → grava o aceite
///   POST /api/fluxgk/conta/excluir       logado   {email} → apaga a conta e todos os dados

routerAdd('GET', '/api/fluxgk/legal', (e) => {
  return e.json(200, require(`${__hooks}/fluxgk_legal.js`).publico($app));
});

routerAdd('GET', '/api/fluxgk/admin/legal', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  if (!R.adm(e)) return e.json(403, { message: 'Só administradores.' });
  return e.json(200, require(`${__hooks}/fluxgk_legal.js`).publico($app));
});

routerAdd('PUT', '/api/fluxgk/admin/legal', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  if (!R.adm(e)) return e.json(403, { message: 'Só administradores.' });
  const L = require(`${__hooks}/fluxgk_legal.js`);
  const b = e.requestInfo().body || {};
  try {
    const r = L.gravar($app, b, R.quemId(e));
    R.registra(e, 'admin.legal', b.publicar ? 'documentos publicados na versão ' + r.getInt('versao') : 'dados legais salvos');
    return e.json(200, L.publico($app));
  } catch (err) {
    if (String(err && err.message).indexOf('faltam_dados') >= 0) return e.json(400, { message: 'Para publicar, preencha nome, e-mail de contato e cidade/UF.' });
    throw err;
  }
});

routerAdd('POST', '/api/fluxgk/termos/aceitar', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  const conta = R.contaLogada(e);
  if (!conta) return e.json(401, { message: 'Entre na sua conta.' });
  const b = e.requestInfo().body || {};
  try { return e.json(200, require(`${__hooks}/fluxgk_legal.js`).aceitar($app, conta.id, b.versao)); }
  catch (err) {
    const m = String(err && err.message);
    if (m.indexOf('versao_desatualizada') >= 0) return e.json(409, { message: 'Os documentos mudaram. Recarregue a página.' });
    if (m.indexOf('nada_publicado') >= 0) return e.json(400, { message: 'Nada a aceitar.' });
    throw err;
  }
});

routerAdd('POST', '/api/fluxgk/conta/excluir', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  const conta = R.contaLogada(e);
  if (!conta) return e.json(401, { message: 'Entre na sua conta.' });
  const b = e.requestInfo().body || {};
  try { require(`${__hooks}/fluxgk_legal.js`).excluirConta($app, conta.id, b.email); return e.json(200, { excluida: true }); }
  catch (err) {
    if (String(err && err.message).indexOf('email_nao_confere') >= 0) return e.json(400, { message: 'O e-mail não confere com o da conta.' });
    throw err;
  }
});
