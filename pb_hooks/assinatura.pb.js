/// <reference path="../pb_data/types.d.ts" />
/// FluxGK · rotas da assinatura (feature 001). Contrato: _reversa_forward/001-pagamento-e-planos/interfaces/.
///
///   GET  /api/fluxgk/planos               público  → planos, módulos, preços e se o pagamento está disponível
///   POST /api/fluxgk/checkout             público ou logado {plano, ciclo} → {url} da página de pagamento
///   POST /api/fluxgk/checkout/transparente público ou logado {plano, ciclo, meio, token?, email?} → cobrança criada no
///                                         gateway sem sair do site (feature 003, fluxgk_transparente.js)
///   GET  /api/fluxgk/codigo?s=<sessão>    público  → estado do código da compra (pronto/aguardando/usado/aplicado)
///   POST /api/fluxgk/ativar               logado   {codigo} → plano aplicado na conta
///   POST /api/fluxgk/portal               logado   → {url} do portal do cliente (trocar plano, cartão, cancelar)
///   POST /api/fluxgk/pagamento/webhook    a Stripe, autenticada pela assinatura HMAC
///   POST /api/fluxgk/pagamento/webhook-mp o Mercado Pago, autenticado pelo x-signature (fluxgk_mercadopago.js)
/// (O JSVM isola cada handler: a lógica mora em fluxgk_assinatura.js e fluxgk_codigos.js, carregados com require.)


routerAdd('GET', '/api/fluxgk/planos', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  const A = require(`${__hooks}/fluxgk_acesso.js`);
  const P = require(`${__hooks}/fluxgk_assinatura.js`);
  const cfgs = {};
  try {
    $app.findRecordsByFilter('planos_config', 'ativo = true', '', 0, 0).forEach((r) => { cfgs[r.getString('plano')] = r; });
  } catch (_) {}
  const planos = Object.keys(A.PLANOS).map((p) => {
    const r = cfgs[p];
    return {
      plano: p, nome: r ? r.getString('nomeExibido') : p.charAt(0).toUpperCase() + p.slice(1), modulos: A.PLANOS[p],
      mensalCentavos: r ? r.getInt('precoMensalCentavos') : null, anualCentavos: r ? r.getInt('precoAnualCentavos') : null,
      moeda: 'BRL',
    };
  });
  const prov = P.cfg().provedor;
  /* feature 003: gateway padrão, modo (transparente | pagina), chave pública e meios. Nenhum segredo. */
  const ck = require(`${__hooks}/fluxgk_integracoes.js`).checkoutPublico($app);
  return e.json(200, {
    planos: planos, pagamentoDisponivel: P.disponivel() && Object.keys(cfgs).length > 0, provedor: prov || null,
    meios: prov === 'mercadopago' ? ['cartao', 'pix'] : ['automatico'],   /* Stripe: o Checkout mostra cartão e Pix */
    checkout: ck,
  });
});

routerAdd('POST', '/api/fluxgk/checkout', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  const P = require(`${__hooks}/fluxgk_assinatura.js`);
  const b = e.requestInfo().body || {};
  try { return e.json(200, P.checkout($app, String(b.plano || ''), String(b.ciclo || ''), R.contaLogada(e), String(b.meio || ''))); }
  catch (err) { return R.erroJson(e, err); }
});

routerAdd('POST', '/api/fluxgk/checkout/transparente', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  const T = require(`${__hooks}/fluxgk_transparente.js`);
  const b = e.requestInfo().body || {};
  const logada = R.contaLogada(e);
  let conta = null;
  if (logada) { try { conta = $app.findRecordById('users', logada.id); } catch (_) { conta = null; } }
  try { return e.json(200, T.criar($app, b, conta, T.ipCliente(e))); }
  catch (err) { return R.erroJson(e, err); }
});

routerAdd('GET', '/api/fluxgk/codigo', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  const s = String(e.request.url.query().get('s') || '');
  /* cs_… = Stripe; mp_<nonce> = Pix do Mercado Pago; mpa_<id> = assinatura no cartão do Mercado Pago;
     st_<nonce> = assinatura da Stripe pelo checkout transparente (feature 003) */
  if (!/^(cs_[A-Za-z0-9_]{8,200}|mp_[a-z0-9]{24}|mpa_[A-Za-z0-9-]{8,64}|st_[a-z0-9]{24})$/.test(s)) return e.json(404, { message: 'Compra não encontrada.' });
  let r = null;
  try { r = $app.findFirstRecordByFilter('codigos_ativacao', 'sessaoPagamento = {:s}', { s: s }); } catch (_) {}
  if (!r) return e.json(200, { estado: 'aguardando' });
  if (r.getString('usadoPor')) return e.json(200, { estado: r.getString('motivo') === 'compra logada' ? 'aplicado' : 'usado', plano: r.getString('plano') });
  return e.json(200, { estado: 'pronto', codigo: r.getString('codigoClaro'), plano: r.getString('plano') });
});

routerAdd('POST', '/api/fluxgk/ativar', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  const C = require(`${__hooks}/fluxgk_codigos.js`);
  const conta = R.contaLogada(e);
  if (!conta) return e.json(401, { message: 'Entre na sua conta para ativar o código.' });
  const b = e.requestInfo().body || {};
  try { return e.json(200, C.ativar($app, conta.id, String(b.codigo || ''))); }
  catch (err) { return R.erroJson(e, err); }
});

routerAdd('POST', '/api/fluxgk/portal', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  const P = require(`${__hooks}/fluxgk_assinatura.js`);
  const conta = R.contaLogada(e);
  if (!conta) return e.json(401, { message: 'Entre na sua conta.' });
  try { return e.json(200, P.portal($app.findRecordById('users', conta.id))); }
  catch (err) { return R.erroJson(e, err); }
});

routerAdd('POST', '/api/fluxgk/pagamento/webhook', (e) => {
  const R = require(`${__hooks}/fluxgk_rotas.js`);
  const P = require(`${__hooks}/fluxgk_assinatura.js`);
  const corpo = toString(e.request.body);                  /* CRU: a assinatura é sobre os bytes exatos */
  const r = P.webhook($app, e.request.header.get('Stripe-Signature'), corpo);
  return e.json(r.status, r.corpo);
});

routerAdd('POST', '/api/fluxgk/pagamento/webhook-mp', (e) => {
  const M = require(`${__hooks}/fluxgk_mercadopago.js`);
  const corpo = toString(e.request.body);
  const qs = e.request.url.query();
  const q = { 'data.id': qs.get('data.id'), type: qs.get('type'), topic: qs.get('topic'), id: qs.get('id') };
  const r = M.webhook($app, q, (n) => e.request.header.get(n), corpo);
  return e.json(r.status, r.corpo);
});
