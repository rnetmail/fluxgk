/// <reference path="../pb_data/types.d.ts" />
/// FluxGK · login Google e teste grátis (feature 001, RN-P05).
///
/// A conta NOVA criada pelo login Google ganha 14 dias do plano advanced, uma única vez por e-mail: o hash do
/// e-mail fica em `testes_usados`, que sobrevive à exclusão da conta. Conta que já existe (antiga, criada pelo
/// Admin) é LIGADA ao Google pelo próprio PocketBase quando o e-mail coincide, e o plano dela não muda.
///
/// Como: o hook do OAuth2 só sabe que a conta é nova; quem grava é o hook de criação do registro, ANTES de salvar
/// (assim a resposta do login já traz o plano). Os dois conversam pelo `$app.store()`, chaveado pelo e-mail.

/* (o JSVM isola cada handler: constantes moram dentro dele) */

onRecordAuthWithOAuth2Request((e) => {
  if (e.isNewRecord) {
    const raw = (e.oauth2User && e.oauth2User.rawUser) || {};
    if (raw.email_verified === false) throw new BadRequestError('Confirme o seu e-mail na conta Google antes de entrar.');
    const email = String((e.oauth2User && e.oauth2User.email) || '').toLowerCase();
    if (email) $app.store().set('fluxgk:oauth-novo:' + email, Date.now());
  }
  e.next();
}, 'users');

onRecordCreate((e) => {
  const email = String(e.record.email() || '').toLowerCase();
  const chave = 'fluxgk:oauth-novo:' + email;
  const marcado = email && $app.store().get(chave);
  const DIAS_TESTE = 14;
  if (marcado) {
    $app.store().remove(chave);
    if (Date.now() - Number(marcado) < 10 * 60 * 1000) {
      const A = require(`${__hooks}/fluxgk_acesso.js`);
      const h = $security.sha256(email);
      let usado = false;
      try { e.app.findFirstRecordByFilter('testes_usados', 'emailHash = {:h}', { h: h }); usado = true; } catch (_) {}
      e.record.set('role', 'tecnico');
      e.record.set('testeUsado', true);
      if (!usado) {
        A.aplicarPlano(e.record, 'advanced', Date.now() + DIAS_TESTE * 86400 * 1000, 'teste');
        const t = new Record(e.app.findCollectionByNameOrId('testes_usados'));
        t.set('emailHash', h);
        e.app.save(t);
      }
    }
  }
  e.next();
}, 'users');
