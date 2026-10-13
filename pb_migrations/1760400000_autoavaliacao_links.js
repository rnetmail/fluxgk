/// FluxGK · autoavaliação do goleiro (13/10/2026, decisão do dono).
///
/// Cada goleiro do Load Control pode ter um LINK FIXO, sem login, para responder todo dia humor, sono e
/// alimentação. O link carrega um código aleatório (`token`); esta coleção liga o código ao técnico (owner),
/// à temporada (`base` = <dataPath> do Load Control) e ao goleiro. As rotas públicas em
/// pb_hooks/autoavaliacao.pb.js acham o link pelo código e gravam a resposta na árvore do técnico
/// (`<base>/load/auto/<playerId>/<AAAA-MM-DD>`), sem dar acesso a mais nada.
///
/// Regras: só o técnico dono vê, cria, altera e apaga os próprios links. O público nunca lê esta coleção:
/// as rotas usam o código e devolvem só o nome do goleiro e do clube.
/// Compatível com a versão anterior (só acrescenta uma coleção): voltar de versão não quebra.
migrate(
  function (app) {
    var users = app.findCollectionByNameOrId('users');
    var dono = 'owner = @request.auth.id';
    var col = new Collection({
      type: 'base',
      name: 'autoavaliacao_links',
      listRule: dono, viewRule: dono, createRule: dono, updateRule: dono, deleteRule: dono,
      fields: [
        { name: 'owner', type: 'relation', required: true, collectionId: users.id, cascadeDelete: true, maxSelect: 1 },
        { name: 'base', type: 'text', required: true, max: 512 },          /* users/<uid>/data/<clube>/<temporada> */
        { name: 'playerId', type: 'text', required: true, max: 64 },
        { name: 'playerName', type: 'text', required: false, max: 120 },
        { name: 'clubName', type: 'text', required: false, max: 120 },
        { name: 'token', type: 'text', required: true, min: 32, max: 64, pattern: '^[a-f0-9]+$' },
        { name: 'ativo', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
      ],
      indexes: [
        'CREATE UNIQUE INDEX `idx_auto_token` ON `autoavaliacao_links` (`token`)',
        'CREATE INDEX `idx_auto_owner_player` ON `autoavaliacao_links` (`owner`, `base`, `playerId`)'
      ]
    });
    app.save(col);
  },
  function (app) {
    try { app.delete(app.findCollectionByNameOrId('autoavaliacao_links')); } catch (e) { /* já não existe */ }
  }
);
