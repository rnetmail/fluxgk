/// FluxGK · gateways com checkout transparente (feature 003).
///
/// EXPANDE `config_integracoes` com, por gateway, a CHAVE PÚBLICA (a que o SDK do gateway usa no navegador para
/// transformar o cartão num token) e o MODO de checkout: `transparente` (o cliente paga sem sair do FluxGK) ou
/// `pagina` (a página hospedada do gateway, como na feature 001). Vazio = transparente quando há chave pública.
/// A chave pública não é segredo, mas segue sem regra de API: só o servidor lê e a entrega em /api/fluxgk/planos.
///
/// Compatível com a versão anterior: só acrescenta campos, que ela ignora. O `down` remove os quatro.
migrate(
  function (app) {
    const c = app.findCollectionByNameOrId('config_integracoes');
    const add = function (f) { if (!c.fields.getByName(f.name)) c.fields.add(f); };
    add(new TextField({ name: 'stripePublicKey', max: 500 }));
    add(new TextField({ name: 'mpPublicKey', max: 500 }));
    add(new SelectField({ name: 'stripeModo', values: ['transparente', 'pagina'], maxSelect: 1 }));
    add(new SelectField({ name: 'mpModo', values: ['transparente', 'pagina'], maxSelect: 1 }));
    app.save(c);
  },
  function (app) {
    try {
      const c = app.findCollectionByNameOrId('config_integracoes');
      ['stripePublicKey', 'mpPublicKey', 'stripeModo', 'mpModo'].forEach(function (n) { c.fields.removeByName(n); });
      app.save(c);
    } catch (_) { /* já não existe */ }
  }
);
