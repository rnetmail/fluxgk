/// <reference path="../pb_data/types.d.ts" />
/// FluxGK · rotas de versão (Configurações → Versões, só administrador). Lógica em fluxgk_versoes.js.
///
///   GET  /api/fluxgk/versoes            painel: no ar, nova em HML, versões publicadas, histórico
///   POST /api/fluxgk/versoes/implantar  { acao: 'nova' | 'existente', versao? } → dispara o workflow

routerAdd('GET', '/api/fluxgk/versoes', (e) => {
  const v = require(`${__hooks}/fluxgk_versoes.js`);
  if (!v.ehAdmin(e)) return e.json(403, { message: 'Só administradores veem as versões.' });
  try {
    const forcar = String(e.request.url.query().get('atualizar') || '') === '1';
    return e.json(200, Object.assign({ noAr: v.noAr() }, v.painel(forcar)));
  } catch (err) {
    return e.json(502, { message: String(err && err.message || err), noAr: v.noAr() });
  }
}, $apis.requireAuth());

routerAdd('POST', '/api/fluxgk/versoes/implantar', (e) => {
  const v = require(`${__hooks}/fluxgk_versoes.js`);
  if (!v.ehAdmin(e)) return e.json(403, { message: 'Só administradores trocam de versão.' });
  const body = e.requestInfo().body || {};
  try {
    const r = v.implantar(e, String(body.acao || ''), String(body.versao || ''));
    console.log('[fluxgk] troca de versão pedida', JSON.stringify(r));
    return e.json(202, r);
  } catch (err) {
    return e.json(409, { message: String(err && err.message || err) });
  }
}, $apis.requireAuth());
