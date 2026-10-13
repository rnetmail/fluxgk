/// <reference path="../pb_data/types.d.ts" />
/// FluxGK · autoavaliação do goleiro, rotas PÚBLICAS (sem login): o código do link é a credencial.
///
///   GET  /api/fluxgk/auto/{token}   → { goleiro, clube, hoje, resposta? }   (resposta de hoje, se houver)
///   POST /api/fluxgk/auto/{token}   { humor, sono, alimentacao: 1..5, obs?: texto ≤ 500 } → 200 { ok, data }
///
/// A resposta vai para a árvore do técnico dono do link, em `<base>/load/auto/<playerId>/<AAAA-MM-DD>`
/// (coleção `nodes`, mesmo formato do adaptador fluxdb: data = {v: valor}). Uma por dia: responder de novo
/// substitui. O tempo real do PocketBase entrega a gravação ao Load Control aberto do técnico.
/// Link inexistente ou revogado: 404, sem dizer qual dos dois.

routerAdd('GET', '/api/fluxgk/auto/{token}', (e) => {
  const a = require(`${__hooks}/fluxgk_autoavaliacao.js`);
  const link = a.acharLink(e.request.pathValue('token'));
  if (!link) return e.json(404, { message: 'Link inválido ou desativado.' });
  const hoje = a.hoje();
  const atual = a.lerResposta(link, hoje);
  return e.json(200, { goleiro: link.getString('playerName'), clube: link.getString('clubName'), hoje: hoje, resposta: atual });
});

routerAdd('POST', '/api/fluxgk/auto/{token}', (e) => {
  const a = require(`${__hooks}/fluxgk_autoavaliacao.js`);
  const link = a.acharLink(e.request.pathValue('token'));
  if (!link) return e.json(404, { message: 'Link inválido ou desativado.' });
  const b = e.requestInfo().body || {};
  const v = a.validar(b);
  if (v.erro) return e.json(400, { message: v.erro });
  const data = a.hoje();
  a.gravarResposta(link, data, v.resposta);
  return e.json(200, { ok: true, data: data });
});
