/// FluxGK · Termos de uso, Política de Privacidade, aceite e exclusão da conta (feature 001, RN-P17 a RN-P20).
///
/// Os dados do responsável pelos dados são parâmetros do Admin (`config_legal`, um registro). "Publicar" sobe a
/// versão e a data de vigência; a partir daí toda conta precisa aceitar a versão nova (o hub mostra a tela de aceite).
/// Versão 0 = ainda não publicado: ninguém é cobrado de aceite.

const CAMPOS = ['nomeResponsavel', 'documento', 'endereco', 'cidadeUf', 'emailContato', 'encarregadoNome', 'encarregadoEmail'];

function registro(app) {
  try { return app.findFirstRecordByFilter('config_legal', "id != ''"); }
  catch (_) { const r = new Record(app.findCollectionByNameOrId('config_legal')); r.set('versao', 0); return r; }
}

/** O que qualquer pessoa lê (páginas públicas e hub). */
function publico(app) {
  const r = registro(app);
  const I = require(`${__hooks}/fluxgk_integracoes.js`);
  const integ = I.resumo(app);
  return {
    publicado: r.getInt('versao') > 0, versao: r.getInt('versao'), vigenciaDesde: r.getString('vigenciaDesde'),
    responsavel: { nome: r.getString('nomeResponsavel'), documento: r.getString('documento'), endereco: r.getString('endereco'),
      cidadeUf: r.getString('cidadeUf'), email: r.getString('emailContato') },
    encarregado: { nome: r.getString('encarregadoNome'), email: r.getString('encarregadoEmail') || r.getString('emailContato') },
    /* para a política citar só os serviços que de fato recebem dados */
    servicos: { pagamento: integ.provedorAtivo || null, google: integ.google.ligado },
  };
}

/** Grava os dados; `publicar` sobe a versão (exige nome, e-mail e cidade/UF). Devolve o registro. */
function gravar(app, b, adminId) {
  const r = registro(app);
  CAMPOS.forEach(function (c) { if (b[c] !== undefined && b[c] !== null) r.set(c, String(b[c]).trim().slice(0, 300)); });
  if (b.publicar) {
    if (!r.getString('nomeResponsavel') || !r.getString('emailContato') || !r.getString('cidadeUf')) throw new Error('faltam_dados');
    r.set('versao', r.getInt('versao') + 1);
    r.set('vigenciaDesde', new Date().toISOString().replace('T', ' '));
  }
  if (adminId) r.set('atualizadoPor', adminId);
  app.save(r);
  return r;
}

/** Aceite da versão em vigor pela conta logada. */
function aceitar(app, contaId, versao) {
  const atual = registro(app).getInt('versao');
  if (!(atual > 0)) throw new Error('nada_publicado');
  if (Number(versao) !== atual) throw new Error('versao_desatualizada');
  const u = app.findRecordById('users', contaId);
  u.set('termosVersao', atual);
  u.set('termosAceitosEm', new Date().toISOString().replace('T', ' '));
  app.save(u);
  return { versao: atual, aceitoEm: u.getString('termosAceitosEm') };
}

/** Exclusão pelo titular (LGPD, art. 18): confirma o e-mail e apaga a conta; os nós e os links vão em cascata. */
function excluirConta(app, contaId, emailConfirmado) {
  const u = app.findRecordById('users', contaId);
  if (String(emailConfirmado || '').trim().toLowerCase() !== String(u.email() || '').toLowerCase()) throw new Error('email_nao_confere');
  app.runInTransaction(function (tx) {
    /* referências sem cascata: soltam a conta, o histórico fica sem dado pessoal */
    tx.findRecordsByFilter('codigos_ativacao', 'usadoPor = {:u} || criadoPor = {:u}', '', 0, 0, { u: contaId }).forEach(function (c) {
      if (c.getString('usadoPor') === contaId) c.set('usadoPor', '');
      if (c.getString('criadoPor') === contaId) c.set('criadoPor', '');
      tx.save(c);
    });
    tx.findRecordsByFilter('eventos_pagamento', 'conta = {:u} || criadoPor = {:u}', '', 0, 0, { u: contaId }).forEach(function (e) {
      if (e.getString('conta') === contaId) e.set('conta', '');
      if (e.getString('criadoPor') === contaId) e.set('criadoPor', '');
      tx.save(e);
    });
    const ev = new Record(tx.findCollectionByNameOrId('eventos_pagamento'));
    ev.set('tipo', 'conta.excluida'); ev.set('resultado', 'ok'); ev.set('detalhe', 'conta excluída pelo titular');
    tx.save(ev);
    tx.delete(tx.findRecordById('users', contaId));
  });
}

module.exports = { CAMPOS: CAMPOS, publico: publico, gravar: gravar, aceitar: aceitar, excluirConta: excluirConta, registro: registro };
