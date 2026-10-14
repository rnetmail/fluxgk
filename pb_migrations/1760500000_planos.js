/// FluxGK · pagamento, códigos de ativação e planos (feature 001, decisões D-09 e D-21 do dono).
///
/// EXPANDE, sem tocar na árvore `nodes`:
///   1. `users` ganha o plano da conta: plano, modulos, acessoAte, origemPlano, role, testeUsado,
///      assinaturaId, clientePagamentoId, tentativasCodigo, tentativasDesde. Só o SERVIDOR grava esses campos.
///      Toda conta existente vira plano pro, sem vencimento, origem `legado` (RN-P12): ninguém perde acesso.
///      E-mails de FLUXGK_ADMINS ganham role = admin.
///   2. Regras: `users` deixa de aceitar cadastro anônimo (só OAuth2 Google ou o Admin pelo servidor) e o cliente
///      não envia campo de plano; `nodes` só deixa ler/gravar o caminho de um módulo que está no plano e dentro do
///      prazo. As regras de `nodes` são geradas de pb_hooks/fluxgk_acesso.js (PREFIXOS). Delete continua livre
///      para o dono: excluir clube/temporada apaga tudo (RN-05).
///   3. Coleções só do servidor: codigos_ativacao, planos_config (leitura pública), eventos_pagamento, testes_usados.
///   4. Rate limit das rotas de código e checkout; OAuth2 Google ligado se GOOGLE_CLIENT_ID/SECRET existirem.
///
/// Compatível com a versão anterior: o código antigo ignora os campos novos, e as regras novas não tiram nada de
/// conta antiga (todas pro). O `down` devolve as regras do init e remove as coleções novas; os campos de `users`
/// ficam (remover campo apaga dado — isso é contração, numa versão futura).

function acesso() {
  const dirs = [];
  try { if (typeof __hooks !== 'undefined') dirs.push(__hooks); } catch (_) {}
  dirs.push('/pb/pb_hooks');
  for (let i = 0; i < dirs.length; i++) {
    try { return require(dirs[i] + '/fluxgk_acesso.js'); } catch (_) { /* tenta o próximo */ }
  }
  throw new Error('planos: não achei pb_hooks/fluxgk_acesso.js');
}

migrate(
  function (app) {
    const A = acesso();
    const users = app.findCollectionByNameOrId('users');

    /* ------------------------------ 1. campos da conta ------------------------------ */
    const add = function (f) { if (!users.fields.getByName(f.name)) users.fields.add(f); };
    add(new SelectField({ name: 'plano', values: ['basic', 'intermediate', 'advanced', 'pro'], maxSelect: 1 }));
    add(new SelectField({ name: 'modulos', values: A.MODULOS, maxSelect: A.MODULOS.length }));
    add(new DateField({ name: 'acessoAte' }));
    add(new SelectField({ name: 'origemPlano', values: ['teste', 'pagamento', 'cortesia', 'legado'], maxSelect: 1 }));
    add(new SelectField({ name: 'role', values: ['tecnico', 'admin'], maxSelect: 1 }));
    add(new BoolField({ name: 'testeUsado' }));
    add(new TextField({ name: 'assinaturaId', max: 255 }));
    add(new TextField({ name: 'clientePagamentoId', max: 255 }));
    add(new NumberField({ name: 'tentativasCodigo', onlyInt: true, min: 0 }));
    add(new DateField({ name: 'tentativasDesde' }));

    /* ---------------------------------- 2. regras ----------------------------------- */
    const protegido = A.semCamposProtegidos();
    users.createRule = '@request.context = "oauth2" && ' + protegido;
    users.updateRule = 'id = @request.auth.id && ' + protegido;
    users.listRule = 'id = @request.auth.id';
    users.viewRule = 'id = @request.auth.id';
    users.deleteRule = 'id = @request.auth.id';

    /* ---------------------------- 4b. OAuth2 do Google ------------------------------ */
    const gid = String($os.getenv('GOOGLE_CLIENT_ID') || '').trim();
    const gsec = String($os.getenv('GOOGLE_CLIENT_SECRET') || '').trim();
    if (gid && gsec) {
      users.oauth2.enabled = true;
      users.oauth2.providers = [{ name: 'google', clientId: gid, clientSecret: gsec }];
      users.oauth2.mappedFields.name = 'name';
    }
    app.save(users);

    /* contas existentes: pro, sem vencimento, legado */
    const admins = A.admins();
    const todas = app.findAllRecords('users');
    for (let i = 0; i < todas.length; i++) {
      const u = todas[i];
      if (u.getString('plano')) continue;                    /* migration reaplicada: não mexe */
      u.set('plano', 'pro');
      u.set('modulos', A.modulosDoPlano('pro'));
      u.set('acessoAte', A.SEM_VENCIMENTO);
      u.set('origemPlano', 'legado');
      u.set('testeUsado', true);
      u.set('role', admins.indexOf(String(u.email() || '').toLowerCase()) >= 0 ? 'admin' : 'tecnico');
      app.saveNoValidate(u);
    }

    const nodes = app.findCollectionByNameOrId('nodes');
    const regra = A.regraNodes();
    nodes.listRule = regra;
    nodes.viewRule = regra;
    nodes.createRule = regra;
    nodes.updateRule = regra;
    nodes.deleteRule = 'owner = @request.auth.id';
    app.save(nodes);

    /* ------------------------------- 3. coleções novas ------------------------------ */
    const so = null;                                         /* null = só superusuário / servidor */
    app.save(new Collection({
      type: 'base', name: 'codigos_ativacao',
      listRule: so, viewRule: so, createRule: so, updateRule: so, deleteRule: so,
      fields: [
        { name: 'hash', type: 'text', required: true, max: 64, pattern: '^[a-f0-9]{64}$' },
        { name: 'final', type: 'text', max: 4 },
        { name: 'plano', type: 'select', required: true, values: ['basic', 'intermediate', 'advanced', 'pro'], maxSelect: 1 },
        { name: 'ciclo', type: 'select', required: true, values: ['mensal', 'anual', 'cortesia'], maxSelect: 1 },
        { name: 'diasCortesia', type: 'number', onlyInt: true, min: 0 },
        { name: 'origem', type: 'select', required: true, values: ['pagamento', 'cortesia'], maxSelect: 1 },
        { name: 'sessaoPagamento', type: 'text', max: 255 },
        { name: 'assinaturaId', type: 'text', max: 255 },
        { name: 'clientePagamentoId', type: 'text', max: 255 },
        { name: 'acessoAte', type: 'date' },
        { name: 'codigoClaro', type: 'text', max: 32 },
        { name: 'motivo', type: 'text', max: 200 },
        { name: 'criadoPor', type: 'relation', collectionId: users.id, maxSelect: 1, cascadeDelete: false },
        { name: 'usadoPor', type: 'relation', collectionId: users.id, maxSelect: 1, cascadeDelete: false },
        { name: 'usadoEm', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX `idx_codigo_hash` ON `codigos_ativacao` (`hash`)',
        "CREATE UNIQUE INDEX `idx_codigo_sessao` ON `codigos_ativacao` (`sessaoPagamento`) WHERE `sessaoPagamento` != ''",
      ],
    }));

    app.save(new Collection({
      type: 'base', name: 'planos_config',
      listRule: '', viewRule: '', createRule: so, updateRule: so, deleteRule: so,
      fields: [
        { name: 'plano', type: 'select', required: true, values: ['basic', 'intermediate', 'advanced', 'pro'], maxSelect: 1 },
        { name: 'nomeExibido', type: 'text', max: 60 },
        { name: 'precoMensalCentavos', type: 'number', onlyInt: true, min: 0 },
        { name: 'precoAnualCentavos', type: 'number', onlyInt: true, min: 0 },
        { name: 'priceMensalId', type: 'text', max: 255, hidden: true },
        { name: 'priceAnualId', type: 'text', max: 255, hidden: true },
        { name: 'ativo', type: 'bool' },
        { name: 'atualizadoPor', type: 'relation', collectionId: users.id, maxSelect: 1, cascadeDelete: false, hidden: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX `idx_planos_config_plano` ON `planos_config` (`plano`)'],
    }));

    app.save(new Collection({
      type: 'base', name: 'eventos_pagamento',
      listRule: so, viewRule: so, createRule: so, updateRule: so, deleteRule: so,
      fields: [
        { name: 'eventoId', type: 'text', max: 255 },
        { name: 'tipo', type: 'text', required: true, max: 80 },
        { name: 'conta', type: 'relation', collectionId: users.id, maxSelect: 1, cascadeDelete: false },
        { name: 'assinaturaId', type: 'text', max: 255 },
        { name: 'valorCentavos', type: 'number', onlyInt: true },
        { name: 'meio', type: 'text', max: 20 },
        { name: 'resultado', type: 'select', values: ['ok', 'ignorado', 'erro'], maxSelect: 1 },
        { name: 'detalhe', type: 'text', max: 2000 },
        { name: 'criadoPor', type: 'relation', collectionId: users.id, maxSelect: 1, cascadeDelete: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_evento_id` ON `eventos_pagamento` (`eventoId`) WHERE `eventoId` != ''",
        'CREATE INDEX `idx_evento_conta` ON `eventos_pagamento` (`conta`, `created`)',
      ],
    }));

    app.save(new Collection({
      type: 'base', name: 'testes_usados',
      listRule: so, viewRule: so, createRule: so, updateRule: so, deleteRule: so,
      fields: [
        { name: 'emailHash', type: 'text', required: true, max: 64, pattern: '^[a-f0-9]{64}$' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: ['CREATE UNIQUE INDEX `idx_teste_email` ON `testes_usados` (`emailHash`)'],
    }));

    /* --------------------------------- 4a. rate limit -------------------------------- */
    const s = app.settings();
    const regras = (s.rateLimits.rules || []).filter(function (r) {
      return r.label !== 'POST /api/fluxgk/ativar' && r.label !== 'POST /api/fluxgk/checkout';
    });
    regras.push({ label: 'POST /api/fluxgk/ativar', audience: '', duration: 3600, maxRequests: 30 });
    regras.push({ label: 'POST /api/fluxgk/checkout', audience: '', duration: 3600, maxRequests: 20 });
    s.rateLimits.rules = regras;
    /* NÃO liga o rate limit global (hoje desligado: ligar muda o login de todo mundo). Se o dono ligar no painel,
       estas regras passam a valer; o limite por conta do código (10 erros/hora) é do próprio hook e vale sempre. */
    app.save(s);
  },
  function (app) {
    ['codigos_ativacao', 'planos_config', 'eventos_pagamento', 'testes_usados'].forEach(function (n) {
      try { app.delete(app.findCollectionByNameOrId(n)); } catch (_) { /* já não existe */ }
    });
    const users = app.findCollectionByNameOrId('users');
    users.createRule = '';
    users.updateRule = 'id = @request.auth.id';
    app.save(users);
    const nodes = app.findCollectionByNameOrId('nodes');
    const dono = 'owner = @request.auth.id';
    nodes.listRule = dono; nodes.viewRule = dono; nodes.createRule = dono; nodes.updateRule = dono; nodes.deleteRule = dono;
    app.save(nodes);
  }
);
