/// FluxGK · coleções do app.
///
/// Esta migration é a BASE do adaptador static/pocketbase-adapter.js (`fluxdb`):
/// uma coleção genérica `nodes` que guarda a árvore que as páginas gravavam no
/// Realtime Database, e o aperto das regras da coleção `users`.
///
/// MODELO (igual ao cabeçalho do adaptador):
///   nodes { owner (relation users), path (text), data (json) }
///   índice ÚNICO (owner, path) — um caminho só existe uma vez por dono.
///
/// ISOLAMENTO: toda regra é `owner = @request.auth.id`. Um usuário não lê nem
/// escreve o nó de outro, o que conserta na raiz o que o app fazia antes
/// (qualquer um alcançava users/<qualquer uid> no Firebase).
///
/// Assinatura usada — migrate(up, down) com txApp — conferida nos types do JSVM
/// (plugins/jsvm/internal/types/generated/types.d.ts, linha 1263 da master).
migrate(
  function (app) {
    /* ------------------------------ users ---------------------------------- */
    /* `users` já existe (coleção auth padrão). Só apertamos as regras:
       cadastro aberto (o app tem tela de registro), e cada um só vê/edita a si. */
    var users = app.findCollectionByNameOrId('users');
    users.createRule = '';                        /* qualquer um pode se registrar */
    users.listRule   = 'id = @request.auth.id';
    users.viewRule   = 'id = @request.auth.id';
    users.updateRule = 'id = @request.auth.id';
    users.deleteRule = 'id = @request.auth.id';
    app.save(users);

    /* ------------------------------ nodes ---------------------------------- */
    var nodes = new Collection({
      type: 'base',
      name: 'nodes',
      listRule:   'owner = @request.auth.id',
      viewRule:   'owner = @request.auth.id',
      createRule: 'owner = @request.auth.id',
      updateRule: 'owner = @request.auth.id',
      deleteRule: 'owner = @request.auth.id',
      fields: [
        {
          name: 'owner',
          type: 'relation',
          required: true,
          collectionId: users.id,
          cascadeDelete: true,
          maxSelect: 1
        },
        {
          /* o caminho do Realtime Database, sem barra inicial.
             Ex.: users/<uid>/sessions, users/<uid>/games */
          name: 'path',
          type: 'text',
          required: true,
          max: 1024
        },
        {
          /* o valor gravado, embrulhado como { v: <valor> } pelo adaptador,
             porque o campo json do PocketBase guarda objeto, e o app grava
             também número, string e booleano soltos. */
          name: 'data',
          type: 'json',
          required: false,
          maxSize: 5242880
        },
        { name: 'created', type: 'autodate', onCreate: true,  onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true,  onUpdate: true  }
      ],
      indexes: [
        'CREATE UNIQUE INDEX `idx_nodes_owner_path` ON `nodes` (`owner`, `path`)',
        'CREATE INDEX `idx_nodes_path` ON `nodes` (`path`)'
      ]
    });
    app.save(nodes);
  },
  function (app) {
    try {
      app.delete(app.findCollectionByNameOrId('nodes'));
    } catch (e) { /* já não existe */ }
  }
);
