/// <reference path="../pb_data/types.d.ts" />
/// FluxGK · rotas do Administrador (feature 001; inclui a T-17 da extração: cadastro de contas pelo Admin).
/// Admin = role admin na conta, e-mail em FLUXGK_ADMINS ou superusuário (fluxgk_acesso.js#ehAdmin). Senão 403.
/// Toda rota que muda algo grava um evento `admin.*` em eventos_pagamento, com quem fez.
///
///   GET   /api/fluxgk/admin/contas?q=&pagina=            contas com plano, vencimento e origem
///   POST  /api/fluxgk/admin/contas                       {email, senha, plano, dias}  cria conta (dias 0 = sem vencimento)
///   PATCH /api/fluxgk/admin/contas/{id}                  {plano?, dias?, role?, ativo?}
///   POST  /api/fluxgk/admin/codigos                      {plano, dias, motivo} → {codigo} (cortesia; mostrado uma vez)
///   GET   /api/fluxgk/admin/codigos?estado=livre|usado
///   PUT   /api/fluxgk/admin/precos/{plano}               {mensalCentavos, anualCentavos}
///   GET   /api/fluxgk/admin/eventos?conta=&tipo=
///   GET   /api/fluxgk/admin/integracoes                  provedor ativo, chaves (só "definida · final"), Google
///   PUT   /api/fluxgk/admin/integracoes                  {provedorAtivo?, urlPublica?, stripeSecretKey?, …, googleClientId?, googleClientSecret?}
///                                                        feature 003: stripePublicKey?, mpPublicKey?, stripeModo?, mpModo? (transparente|pagina);
///                                                        o padrão (provedorAtivo) só aceita gateway com credencial → 400 gateway_sem_credencial
///   POST  /api/fluxgk/admin/integracoes/testar           {provedor} → confere as credenciais no provedor
///   POST  /api/fluxgk/apagar-subarvore                   (técnico) {path}: clube/temporada inteiros, ver fluxgk_subarvore.js


routerAdd('GET', '/api/fluxgk/admin/contas', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  if (!R.adm(e)) return e.json(403, { message: 'Só administradores.' });
  const q = String(e.request.url.query().get('q') || '').trim();
  const pag = Math.max(1, Number(e.request.url.query().get('pagina') || 1));
  const filtro = q ? 'email ~ {:q} || name ~ {:q}' : '';
  const itens = $app.findRecordsByFilter('users', filtro, '-created', 50, (pag - 1) * 50, { q: q });
  return e.json(200, { pagina: pag, itens: itens.map(R.visao) });
});

routerAdd('POST', '/api/fluxgk/admin/contas', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  if (!R.adm(e)) return e.json(403, { message: 'Só administradores.' });
  const A = require(`${__hooks}/fluxgk_acesso.js`);
  const b = e.requestInfo().body || {};
  const email = String(b.email || '').trim().toLowerCase(), senha = String(b.senha || ''), plano = String(b.plano || '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return e.json(400, { message: 'E-mail inválido.' });
  if (senha.length < 8) return e.json(400, { message: 'A senha precisa de pelo menos 8 caracteres.' });
  if (!A.PLANOS[plano]) return e.json(400, { message: 'Plano inválido.' });
  try { $app.findAuthRecordByEmail('users', email); return e.json(409, { message: 'Já existe conta com este e-mail.' }); } catch (_) {}
  const u = new Record($app.findCollectionByNameOrId('users'));
  u.setEmail(email); u.setPassword(senha); u.set('verified', true);
  u.set('role', b.role === 'admin' ? 'admin' : 'tecnico'); u.set('testeUsado', true);
  A.aplicarPlano(u, plano, R.ate(b.dias), 'cortesia');
  $app.save(u);
  R.registra(e, 'admin.conta.criada', email + ' · ' + plano + ' · ' + (Number(b.dias) > 0 ? b.dias + ' dias' : 'sem vencimento'), u.id);
  return e.json(200, R.visao(u));
});

routerAdd('PATCH', '/api/fluxgk/admin/contas/{id}', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  if (!R.adm(e)) return e.json(403, { message: 'Só administradores.' });
  const A = require(`${__hooks}/fluxgk_acesso.js`);
  let u;
  try { u = $app.findRecordById('users', e.request.pathValue('id')); } catch (_) { return e.json(404, { message: 'Conta não encontrada.' }); }
  const b = e.requestInfo().body || {};
  const feito = [];
  if (b.plano !== undefined) {
    if (!A.PLANOS[b.plano]) return e.json(400, { message: 'Plano inválido.' });
    /* sem `dias`, mantém o prazo atual (conta sem prazo ou sem vencimento fica sem vencimento) */
    let a;
    if (b.dias !== undefined) a = R.ate(b.dias);
    else {
      const cur = u.getDateTime('acessoAte');
      a = (!cur || cur.isZero() || u.getString('acessoAte').indexOf('9999') === 0) ? A.SEM_VENCIMENTO : cur.unix() * 1000;
    }
    A.aplicarPlano(u, String(b.plano), a, 'cortesia');
    feito.push('plano ' + b.plano);
  } else if (b.dias !== undefined) {
    const a = R.ate(b.dias);
    u.set('acessoAte', a === A.SEM_VENCIMENTO ? a : A.dataPb(a)); feito.push('prazo ' + b.dias + ' dias');
  }
  if (b.role !== undefined) {
    if (b.role !== 'admin' && b.role !== 'tecnico') return e.json(400, { message: 'Papel inválido.' });
    if (b.role !== 'admin' && u.id === R.quemId(e)) return e.json(400, { message: 'Você não pode tirar o seu próprio papel de admin.' });
    u.set('role', b.role); feito.push('role ' + b.role);
  }
  if (b.ativo === false) { u.set('modulos', []); u.set('acessoAte', A.dataPb(Date.now() - 1000)); feito.push('desativada'); }
  if (!feito.length) return e.json(400, { message: 'Nada para mudar.' });
  $app.save(u);
  R.registra(e, 'admin.conta.alterada', u.email() + ' · ' + feito.join(', '), u.id);
  return e.json(200, R.visao(u));
});

routerAdd('POST', '/api/fluxgk/admin/codigos', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  if (!R.adm(e)) return e.json(403, { message: 'Só administradores.' });
  const A = require(`${__hooks}/fluxgk_acesso.js`);
  const C = require(`${__hooks}/fluxgk_codigos.js`);
  const b = e.requestInfo().body || {};
  const plano = String(b.plano || ''), dias = Math.max(0, Math.round(Number(b.dias || 0))), motivo = String(b.motivo || '').trim();
  if (!A.PLANOS[plano]) return e.json(400, { message: 'Plano inválido.' });
  if (!motivo) return e.json(400, { message: 'Informe o motivo da cortesia.' });
  const dados = { plano: plano, ciclo: 'cortesia', origem: 'cortesia', diasCortesia: dias, motivo: motivo.slice(0, 200) };
  const q = R.quemId(e); if (q) dados.criadoPor = q;
  const g = C.gerar($app, dados);
  R.registra(e, 'admin.cortesia', plano + ' · ' + (dias ? dias + ' dias' : 'sem vencimento') + ' · ' + motivo + ' · final ' + g.registro.getString('final'));
  return e.json(200, { codigo: g.codigo, plano: plano, dias: dias });
});

routerAdd('GET', '/api/fluxgk/admin/codigos', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  if (!R.adm(e)) return e.json(403, { message: 'Só administradores.' });
  const est = String(e.request.url.query().get('estado') || '');
  const filtro = est === 'livre' ? "usadoPor = ''" : est === 'usado' ? "usadoPor != ''" : '';
  const itens = $app.findRecordsByFilter('codigos_ativacao', filtro, '-created', 200, 0);
  return e.json(200, { itens: itens.map((r) => {
    let usadoPor = '';
    if (r.getString('usadoPor')) { try { usadoPor = $app.findRecordById('users', r.getString('usadoPor')).email(); } catch (_) {} }
    let criadoPor = '';
    if (r.getString('criadoPor')) { try { criadoPor = $app.findRecordById('users', r.getString('criadoPor')).email(); } catch (_) {} }
    return { final: r.getString('final'), plano: r.getString('plano'), ciclo: r.getString('ciclo'), origem: r.getString('origem'),
      motivo: r.getString('motivo'), dias: r.getInt('diasCortesia'), usadoPor: usadoPor, usadoEm: r.getString('usadoEm'),
      criadoPor: criadoPor, criado: r.getString('created') };
  }) });
});

routerAdd('PUT', '/api/fluxgk/admin/precos/{plano}', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  if (!R.adm(e)) return e.json(403, { message: 'Só administradores.' });
  const P = require(`${__hooks}/fluxgk_assinatura.js`);
  const b = e.requestInfo().body || {};
  const plano = e.request.pathValue('plano');
  try {
    const r = P.definirPrecos($app, plano, b.mensalCentavos, b.anualCentavos, R.quemId(e));
    R.registra(e, 'admin.precos', plano + ' · mensal ' + r.getInt('precoMensalCentavos') + ' · anual ' + r.getInt('precoAnualCentavos'));
    return e.json(200, { plano: plano, mensalCentavos: r.getInt('precoMensalCentavos'), anualCentavos: r.getInt('precoAnualCentavos') });
  } catch (err) {
    if (err && err.status) return e.json(err.status, { message: err.message, data: { codigo: err.chave } });
    throw err;
  }
});

routerAdd('GET', '/api/fluxgk/admin/eventos', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  if (!R.adm(e)) return e.json(403, { message: 'Só administradores.' });
  const conta = String(e.request.url.query().get('conta') || ''), tipo = String(e.request.url.query().get('tipo') || '');
  const partes = [];
  if (conta) partes.push('conta = {:c}');
  if (tipo) partes.push('tipo ~ {:t}');
  const itens = $app.findRecordsByFilter('eventos_pagamento', partes.join(' && '), '-created', 200, 0, { c: conta, t: tipo });
  return e.json(200, { itens: itens.map((r) => ({
    tipo: r.getString('tipo'), resultado: r.getString('resultado'), detalhe: r.getString('detalhe'), conta: r.getString('conta'),
    valorCentavos: r.getInt('valorCentavos'), criado: r.getString('created'),
  })) });
});

routerAdd('POST', '/api/fluxgk/apagar-subarvore', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  if (!e.auth || e.auth.collection().name !== 'users') return e.json(401, { message: 'Entre na sua conta.' });
  const S = require(`${__hooks}/fluxgk_subarvore.js`);
  const b = e.requestInfo().body || {};
  try { return e.json(200, { apagados: S.apagar($app, e.auth.id, String(b.path || '')) }); }
  catch (err) {
    if (String(err && err.message).indexOf('caminho_invalido') >= 0) return e.json(400, { message: 'Caminho inválido.' });
    throw err;
  }
});

routerAdd('GET', '/api/fluxgk/admin/integracoes', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  if (!R.adm(e)) return e.json(403, { message: 'Só administradores.' });
  return e.json(200, require(`${__hooks}/fluxgk_integracoes.js`).resumo($app));
});

routerAdd('PUT', '/api/fluxgk/admin/integracoes', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  if (!R.adm(e)) return e.json(403, { message: 'Só administradores.' });
  const I = require(`${__hooks}/fluxgk_integracoes.js`);
  const P = require(`${__hooks}/fluxgk_assinatura.js`);
  const b = e.requestInfo().body || {};
  let mudou;
  try { mudou = I.gravar($app, b, R.quemId(e)); }
  catch (err) {
    const m = String(err && err.message);
    if (m.indexOf('provedor_invalido') >= 0) return e.json(400, { message: 'Provedor inválido.' });
    if (m.indexOf('url_invalida') >= 0) return e.json(400, { message: 'Endereço público inválido.' });
    if (m.indexOf('gateway_sem_credencial') >= 0) return e.json(400, { message: 'Configure o gateway antes de torná-lo padrão.', data: { codigo: 'gateway_sem_credencial' } });
    if (m.indexOf('chave_publica_invalida') >= 0) return e.json(400, { message: 'Chave pública inválida para este gateway.', data: { codigo: 'chave_publica_invalida' } });
    if (m.indexOf('modo_invalido') >= 0) return e.json(400, { message: 'Modo de checkout inválido.', data: { codigo: 'modo_invalido' } });
    throw err;
  }
  /* nunca registra valor de chave no histórico: só o que mudou */
  R.registra(e, 'admin.integracoes', mudou.join(', ') || 'nada');
  let criados = 0, aviso = '';
  if (b.provedorAtivo) {
    try { criados = P.sincronizarPrecos($app); } catch (err) { aviso = 'Os preços ainda não foram criados no provedor: ' + (err && err.message); }
  }
  return e.json(200, Object.assign(I.resumo($app), { precosCriados: criados, aviso: aviso }));
});

routerAdd('POST', '/api/fluxgk/admin/integracoes/testar', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  if (!R.adm(e)) return e.json(403, { message: 'Só administradores.' });
  const P = require(`${__hooks}/fluxgk_assinatura.js`);
  const b = e.requestInfo().body || {};
  const prov = b.provedor === 'mercadopago' ? 'mercadopago' : 'stripe';
  try { return e.json(200, P.testar(prov)); }
  catch (err) { return e.json(200, { ok: false, erro: (err && err.message) || 'falhou' }); }
});
