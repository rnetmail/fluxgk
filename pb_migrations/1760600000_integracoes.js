/// FluxGK · integrações configuradas pelo Admin (feature 001, ampliação de 14/10: RN-P14 a RN-P16).
///
/// EXPANDE:
///   1. `config_integracoes`: UM registro com o provedor de pagamento ativo (stripe | mercadopago) e as credenciais
///      da Stripe e do Mercado Pago, CIFRADAS pelo servidor (AES-256-GCM com PB_ENCRYPTION_KEY, ver
///      pb_hooks/fluxgk_integracoes.js). Nenhuma regra de API: só o servidor lê e grava.
///      (O segredo do Google não mora aqui: vai direto para a configuração OAuth2 da coleção `users`.)
///   2. `planos_config` ganha os ids dos planos de assinatura do Mercado Pago (um por ciclo), como já tem os da Stripe.
///
/// Compatível com a versão anterior: só acrescenta. O `down` remove a coleção e os dois campos.
migrate(
  function (app) {
    app.save(new Collection({
      type: 'base', name: 'config_integracoes',
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: 'provedorAtivo', type: 'select', values: ['stripe', 'mercadopago'], maxSelect: 1 },
        { name: 'urlPublica', type: 'text', max: 255 },
        { name: 'stripeSecretKey', type: 'text', max: 2000, hidden: true },
        { name: 'stripeWebhookSecret', type: 'text', max: 2000, hidden: true },
        { name: 'mpAccessToken', type: 'text', max: 2000, hidden: true },
        { name: 'mpWebhookSecret', type: 'text', max: 2000, hidden: true },
        { name: 'atualizadoPor', type: 'relation', collectionId: app.findCollectionByNameOrId('users').id, maxSelect: 1, cascadeDelete: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    }));
    const pc = app.findCollectionByNameOrId('planos_config');
    if (!pc.fields.getByName('mpPlanoMensalId')) pc.fields.add(new TextField({ name: 'mpPlanoMensalId', max: 255, hidden: true }));
    if (!pc.fields.getByName('mpPlanoAnualId')) pc.fields.add(new TextField({ name: 'mpPlanoAnualId', max: 255, hidden: true }));
    app.save(pc);
  },
  function (app) {
    try { app.delete(app.findCollectionByNameOrId('config_integracoes')); } catch (_) { /* já não existe */ }
    try {
      const pc = app.findCollectionByNameOrId('planos_config');
      pc.fields.removeByName('mpPlanoMensalId');
      pc.fields.removeByName('mpPlanoAnualId');
      app.save(pc);
    } catch (_) { /* já não existe */ }
  }
);
