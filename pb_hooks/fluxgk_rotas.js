/// FluxGK · ajudas das rotas da feature 001 (o JSVM isola cada handler: função no topo de um .pb.js não existe
/// dentro do handler, então elas moram aqui e cada handler faz `require`).

function adm(e) {
  const A = require(`${__hooks}/fluxgk_acesso.js`);
  return A.ehAdmin(e);
}
function quemId(e) { return e.auth && e.auth.collection().name === 'users' ? e.auth.id : ''; }
function registra(e, tipo, detalhe, conta) {
  const r = new Record($app.findCollectionByNameOrId('eventos_pagamento'));
  r.set('tipo', tipo); r.set('resultado', 'ok'); r.set('detalhe', String(detalhe).slice(0, 2000));
  if (conta) r.set('conta', conta);
  const q = quemId(e); if (q) r.set('criadoPor', q);
  $app.save(r);
}
function visao(u) {
  return {
    id: u.id, email: u.email(), nome: u.getString('name'), plano: u.getString('plano'), modulos: u.get('modulos'),
    acessoAte: u.getString('acessoAte'), origem: u.getString('origemPlano'), role: u.getString('role'),
    assinatura: !!u.getString('assinaturaId'), criada: u.getString('created'),
  };
}
function ate(dias) {
  const A = require(`${__hooks}/fluxgk_acesso.js`);
  const d = Math.round(Number(dias || 0));
  return d > 0 ? Date.now() + d * 86400 * 1000 : A.SEM_VENCIMENTO;
}

function erroJson(e, err) {
  if (err && err.status && err.chave) return e.json(err.status, { message: err.message, data: { codigo: err.chave } });
  console.log('[assinatura] erro: ' + (err && err.message));
  return e.json(500, { message: 'Erro interno.' });
}

function contaLogada(e) {
  return e.auth && e.auth.collection().name === 'users' ? e.auth : null;
}

module.exports = { adm: adm, quemId: quemId, registra: registra, visao: visao, ate: ate, erroJson: erroJson, contaLogada: contaLogada };
