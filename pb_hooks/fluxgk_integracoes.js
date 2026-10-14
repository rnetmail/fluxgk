/// FluxGK · integrações configuradas pelo Admin (feature 001, RN-P14 a RN-P16; decisões D-14 a D-17).
///
/// As credenciais da Stripe e do Mercado Pago ficam em `config_integracoes` (um registro, sem regra de API),
/// CIFRADAS com AES-256-GCM pela chave PB_ENCRYPTION_KEY da stack (32 caracteres). A tela do Admin nunca recebe o
/// valor de volta, só se está definido e os 4 últimos caracteres. As variáveis de ambiente antigas (STRIPE_*,
/// MP_*, FLUXGK_URL_PUBLICA, FLUXGK_PROVEDOR) ficam como RESERVA: valem só quando o campo da tela está vazio.
/// O Google não é guardado aqui: salvar grava o provedor direto na configuração OAuth2 da coleção `users`.

const SEGREDOS = {
  stripeSecretKey: 'STRIPE_SECRET_KEY',
  stripeWebhookSecret: 'STRIPE_WEBHOOK_SECRET',
  mpAccessToken: 'MP_ACCESS_TOKEN',
  mpWebhookSecret: 'MP_WEBHOOK_SECRET',
};
const PROVEDORES = ['stripe', 'mercadopago'];

function env(n) { return String($os.getenv(n) || '').trim(); }
function chaveCifra() { const k = env('PB_ENCRYPTION_KEY'); return k.length === 32 ? k : ''; }

function cifrar(texto) {
  const t = String(texto || '');
  if (!t) return '';
  const k = chaveCifra();
  return k ? 'enc:' + $security.encrypt(t, k) : 'txt:' + t;      /* sem chave na stack: guarda, mas a tela avisa */
}
function decifrar(v) {
  const s = String(v || '');
  if (s.indexOf('enc:') === 0) {
    const k = chaveCifra();
    if (!k) return '';
    try { return toString($security.decrypt(s.slice(4), k)); } catch (_) { return ''; }
  }
  if (s.indexOf('txt:') === 0) return s.slice(4);
  return '';
}

function registro(app) {
  try { return app.findFirstRecordByFilter('config_integracoes', "id != ''"); } catch (_) { return null; }
}

/** Configuração efetiva (tela, com reserva no ambiente). Só para uso do servidor. */
function ler(app) {
  const r = registro(app);
  const v = function (campo) {
    const daTela = r ? decifrar(r.getString(campo)) : '';
    return daTela || env(SEGREDOS[campo]);
  };
  const c = {
    stripe: { chave: v('stripeSecretKey'), segredo: v('stripeWebhookSecret') },
    mp: { token: v('mpAccessToken'), segredo: v('mpWebhookSecret') },
    url: ((r && r.getString('urlPublica')) || env('FLUXGK_URL_PUBLICA')).replace(/\/$/, ''),
  };
  let p = (r && r.getString('provedorAtivo')) || env('FLUXGK_PROVEDOR');
  if (PROVEDORES.indexOf(p) < 0) p = c.stripe.chave ? 'stripe' : (c.mp.token ? 'mercadopago' : '');
  c.provedor = p;
  return c;
}

function final4(s) { return s ? s.slice(-4) : ''; }

/** O que a tela do Admin pode ver: nada em claro. */
function resumo(app) {
  const r = registro(app);
  const c = ler(app);
  const item = function (campo, valor) {
    const daTela = r && r.getString(campo);
    return { definida: !!valor, final: final4(valor), origem: daTela ? 'tela' : (valor ? 'ambiente' : '') };
  };
  const users = app.findCollectionByNameOrId('users');
  let gid = '', gsec = false;
  try {
    const ps = users.oauth2.providers || [];
    for (let i = 0; i < ps.length; i++) if (ps[i].name === 'google') { gid = ps[i].clientId || ''; gsec = !!ps[i].clientSecret; }
  } catch (_) {}
  return {
    provedorAtivo: c.provedor, urlPublica: c.url, cifra: !!chaveCifra(),
    stripe: { chave: item('stripeSecretKey', c.stripe.chave), segredoWebhook: item('stripeWebhookSecret', c.stripe.segredo) },
    mercadopago: { token: item('mpAccessToken', c.mp.token), segredoWebhook: item('mpWebhookSecret', c.mp.segredo) },
    google: { clientId: gid, segredoDefinido: gsec, ligado: !!(users.oauth2.enabled && gid && gsec) },
  };
}

/** Liga, troca ou desliga o login Google na coleção `users`, sem reiniciar. `id === ''` desliga. */
function aplicarGoogle(app, clientId, clientSecret) {
  const users = app.findCollectionByNameOrId('users');
  const atuais = [];
  let antigo = null;
  const ps = users.oauth2.providers || [];
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].name === 'google') antigo = ps[i];
    else atuais.push({ name: ps[i].name, clientId: ps[i].clientId, clientSecret: ps[i].clientSecret });
  }
  const id = clientId === undefined ? (antigo ? antigo.clientId : '') : String(clientId || '').trim();
  /* segredo: ausente = mantém o atual; '' = apaga; texto = troca. Sem Client ID, desliga de qualquer jeito. */
  let sec = clientSecret === undefined ? (antigo ? antigo.clientSecret : '') : String(clientSecret || '').trim();
  if (!id) sec = '';
  if (id && sec) atuais.push({ name: 'google', clientId: id, clientSecret: sec });
  users.oauth2.providers = atuais;
  users.oauth2.enabled = atuais.length > 0;
  if (users.oauth2.enabled) users.oauth2.mappedFields.name = 'name';
  app.save(users);
  return !!(id && sec);
}

/** Grava o que veio da tela. Campo ausente = mantém; '' = apaga; texto = substitui (cifrado). */
function gravar(app, b, adminId) {
  let r = registro(app);
  if (!r) r = new Record(app.findCollectionByNameOrId('config_integracoes'));
  const mudou = [];
  if (b.provedorAtivo !== undefined) {
    if (b.provedorAtivo !== '' && PROVEDORES.indexOf(b.provedorAtivo) < 0) throw new Error('provedor_invalido');
    r.set('provedorAtivo', b.provedorAtivo); mudou.push('provedor ' + (b.provedorAtivo || 'nenhum'));
  }
  if (b.urlPublica !== undefined) {
    const u = String(b.urlPublica || '').trim().replace(/\/$/, '');
    if (u && !/^https?:\/\/[^\s/]+(\/[^\s]*)?$/.test(u)) throw new Error('url_invalida');
    r.set('urlPublica', u); mudou.push('url pública');
  }
  Object.keys(SEGREDOS).forEach(function (campo) {
    if (b[campo] === undefined || b[campo] === null) return;
    r.set(campo, cifrar(String(b[campo]).trim())); mudou.push(campo + (String(b[campo]).trim() ? ' trocada' : ' apagada'));
  });
  if (adminId) r.set('atualizadoPor', adminId);
  app.save(r);
  if (b.googleClientId !== undefined || b.googleClientSecret !== undefined) {
    aplicarGoogle(app, b.googleClientId, b.googleClientSecret);
    mudou.push('google');
  }
  return mudou;
}

module.exports = { ler: ler, resumo: resumo, gravar: gravar, aplicarGoogle: aplicarGoogle, cifrar: cifrar, decifrar: decifrar, PROVEDORES: PROVEDORES };
