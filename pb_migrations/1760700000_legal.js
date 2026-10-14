/// FluxGK · Termos de uso e Política de Privacidade (feature 001, ampliação 2 de 14/10: RN-P17 a RN-P20).
///
/// EXPANDE:
///   1. `config_legal`: UM registro com os dados do responsável pelos dados (nome ou razão social, documento,
///      endereço, cidade/UF do foro, e-mail de contato, encarregado) e a VERSÃO publicada dos documentos. Só o
///      servidor lê e grava; o público lê pela rota /api/fluxgk/legal. Nasce com versão 0 (não publicada): ninguém
///      precisa aceitar nada até o Admin preencher e publicar.
///   2. `users.termosVersao` e `users.termosAceitosEm`: o aceite da conta. Entram na lista de campos que o cliente não
///      pode enviar (o aceite é gravado pela rota), e as regras de `users` são refeitas com a lista nova.
/// Compatível com a versão anterior: só acrescenta. O `down` remove a coleção e devolve as regras sem os dois campos.
function acesso() {
  const dirs = [];
  try { if (typeof __hooks !== 'undefined') dirs.push(__hooks); } catch (_) {}
  dirs.push('/pb/pb_hooks');
  for (let i = 0; i < dirs.length; i++) {
    try { return require(dirs[i] + '/fluxgk_acesso.js'); } catch (_) { /* tenta o próximo */ }
  }
  throw new Error('legal: não achei pb_hooks/fluxgk_acesso.js');
}
function regras(app, campos) {
  const users = app.findCollectionByNameOrId('users');
  const protegido = campos.map(function (c) { return '@request.body.' + c + ':isset = false'; }).join(' && ');
  users.createRule = '@request.context = "oauth2" && ' + protegido;
  users.updateRule = 'id = @request.auth.id && ' + protegido;
  app.save(users);
}
migrate(
  function (app) {
    const A = acesso();
    const users = app.findCollectionByNameOrId('users');
    if (!users.fields.getByName('termosVersao')) users.fields.add(new NumberField({ name: 'termosVersao', onlyInt: true, min: 0 }));
    if (!users.fields.getByName('termosAceitosEm')) users.fields.add(new DateField({ name: 'termosAceitosEm' }));
    app.save(users);
    regras(app, A.CAMPOS_PROTEGIDOS);
    const col = new Collection({
      type: 'base', name: 'config_legal',
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: 'nomeResponsavel', type: 'text', max: 200 },
        { name: 'documento', type: 'text', max: 40 },
        { name: 'endereco', type: 'text', max: 300 },
        { name: 'cidadeUf', type: 'text', max: 100 },
        { name: 'emailContato', type: 'email' },
        { name: 'encarregadoNome', type: 'text', max: 200 },
        { name: 'encarregadoEmail', type: 'email' },
        { name: 'versao', type: 'number', onlyInt: true, min: 0 },
        { name: 'vigenciaDesde', type: 'date' },
        { name: 'atualizadoPor', type: 'relation', collectionId: users.id, maxSelect: 1, cascadeDelete: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(col);
    const r = new Record(col);
    r.set('versao', 0);
    app.save(r);
  },
  function (app) {
    try { app.delete(app.findCollectionByNameOrId('config_legal')); } catch (_) { /* já não existe */ }
    const A = acesso();
    regras(app, A.CAMPOS_PROTEGIDOS.filter(function (c) { return c !== 'termosVersao' && c !== 'termosAceitosEm'; }));
  }
);
