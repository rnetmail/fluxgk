/// FluxGK · assinatura: conversa com o serviço de pagamento (Stripe) e trata o webhook (feature 001).
///
/// O app nunca vê dado de cartão: o pagamento acontece na página hospedada do serviço (Checkout), e o app só recebe
/// a confirmação pelo webhook, conferida pela assinatura HMAC. Variáveis da stack:
///   STRIPE_SECRET_KEY      chave secreta (sk_test_… em HML, sk_live_… em PRD). Sem ela: rotas de pagamento → 503
///   STRIPE_WEBHOOK_SECRET  segredo do endpoint do webhook (whsec_…)
///   FLUXGK_URL_PUBLICA     endereço do app, para as voltas do pagamento
///   STRIPE_API_URL         só para teste (servidor falso do CI); padrão https://api.stripe.com
///
/// Meios de pagamento: os que estiverem ligados no painel do serviço (cartão e Pix, D-03). O Checkout não fixa
/// `payment_method_types`, então ligar ou desligar o Pix é configuração, não código.

const TOLERANCIA_S = 300;

function cfg() {
  return {
    chave: String($os.getenv('STRIPE_SECRET_KEY') || '').trim(),
    segredo: String($os.getenv('STRIPE_WEBHOOK_SECRET') || '').trim(),
    url: String($os.getenv('FLUXGK_URL_PUBLICA') || '').trim().replace(/\/$/, ''),
    api: String($os.getenv('STRIPE_API_URL') || 'https://api.stripe.com').trim().replace(/\/$/, ''),
  };
}
function disponivel() { const c = cfg(); return !!(c.chave && c.url); }

class ErroPagamento extends Error {
  constructor(status, chave, msg) { super(msg); this.status = status; this.chave = chave; }
}

/** Codifica objeto aninhado no formato do serviço: a[b][0]=v. */
function form(obj, prefixo, saida) {
  saida = saida || [];
  Object.keys(obj).forEach(function (k) {
    const v = obj[k], chave = prefixo ? prefixo + '[' + k + ']' : k;
    if (v === undefined || v === null || v === '') return;
    if (typeof v === 'object') form(v, chave, saida);
    else saida.push(encodeURIComponent(chave) + '=' + encodeURIComponent(String(v)));
  });
  return saida;
}

function chamar(metodo, caminho, params) {
  const c = cfg();
  if (!c.chave) throw new ErroPagamento(503, 'pagamento_indisponivel', 'Pagamento indisponível no momento.');
  let r;
  try {
    r = $http.send({
      url: c.api + caminho, method: metodo, timeout: 10,
      headers: { Authorization: 'Bearer ' + c.chave, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params ? form(params).join('&') : '',
    });
  } catch (err) {
    throw new ErroPagamento(502, 'pagamento_falhou', 'O serviço de pagamento não respondeu. Tente de novo.');
  }
  if (r.statusCode < 200 || r.statusCode >= 300) {
    const msg = r.json && r.json.error && r.json.error.message;
    console.log('[assinatura] ' + metodo + ' ' + caminho + ' → ' + r.statusCode + ' ' + (msg || ''));
    throw new ErroPagamento(502, 'pagamento_falhou', 'O serviço de pagamento recusou o pedido.');
  }
  return r.json;
}

/** Sessão de pagamento hospedada. `conta` é o registro logado (ou null: compra antes de ter conta). */
function checkout(app, plano, ciclo, conta) {
  const A = require(`${__hooks}/fluxgk_acesso.js`);
  if (!A.PLANOS[plano]) throw new ErroPagamento(400, 'plano_invalido', 'Plano inválido.');
  if (ciclo !== 'mensal' && ciclo !== 'anual') throw new ErroPagamento(400, 'ciclo_invalido', 'Escolha mensal ou anual.');
  if (!disponivel()) throw new ErroPagamento(503, 'pagamento_indisponivel', 'Pagamento indisponível no momento.');
  let cfgPlano;
  try { cfgPlano = app.findFirstRecordByFilter('planos_config', 'plano = {:p} && ativo = true', { p: plano }); }
  catch (_) { throw new ErroPagamento(503, 'preco_nao_configurado', 'Este plano ainda não tem preço.'); }
  const price = cfgPlano.getString(ciclo === 'anual' ? 'priceAnualId' : 'priceMensalId');
  if (!price) throw new ErroPagamento(503, 'preco_nao_configurado', 'Este plano ainda não tem preço.');
  const u = cfg().url;
  const p = {
    mode: 'subscription',
    line_items: { 0: { price: price, quantity: 1 } },
    success_url: u + '/assinatura-ok.html?s={CHECKOUT_SESSION_ID}',
    cancel_url: u + '/planos.html',
    metadata: { plano: plano, ciclo: ciclo },
    subscription_data: { metadata: { plano: plano, ciclo: ciclo } },
    locale: 'auto',
  };
  if (conta) {
    p.client_reference_id = conta.id;
    if (conta.getString('clientePagamentoId')) p.customer = conta.getString('clientePagamentoId');
    else p.customer_email = conta.email();
  }
  const s = chamar('POST', '/v1/checkout/sessions', p);
  return { url: s.url };
}

function portal(conta) {
  const cliente = conta.getString('clientePagamentoId');
  if (!cliente) throw new ErroPagamento(404, 'sem_assinatura', 'Esta conta não tem assinatura paga.');
  const s = chamar('POST', '/v1/billing_portal/sessions', { customer: cliente, return_url: cfg().url + '/' });
  return { url: s.url };
}

/** Cria os preços novos do plano e arquiva os anteriores (quem já assina mantém o preço antigo). */
function definirPrecos(app, plano, mensalCentavos, anualCentavos, adminId) {
  const A = require(`${__hooks}/fluxgk_acesso.js`);
  if (!A.PLANOS[plano]) throw new ErroPagamento(400, 'plano_invalido', 'Plano inválido.');
  const m = Math.round(Number(mensalCentavos)), a = Math.round(Number(anualCentavos));
  if (!(m > 0) || !(a > 0)) throw new ErroPagamento(400, 'preco_invalido', 'Informe preços maiores que zero.');
  let reg;
  try { reg = app.findFirstRecordByFilter('planos_config', 'plano = {:p}', { p: plano }); }
  catch (_) { reg = new Record(app.findCollectionByNameOrId('planos_config')); reg.set('plano', plano); }
  const nome = 'FluxGK ' + plano.charAt(0).toUpperCase() + plano.slice(1);
  const novo = function (centavos, intervalo) {
    return chamar('POST', '/v1/prices', {
      currency: 'brl', unit_amount: centavos, recurring: { interval: intervalo },
      product_data: { name: nome, metadata: { plano: plano } }, metadata: { plano: plano },
    }).id;
  };
  const antigos = [reg.getString('priceMensalId'), reg.getString('priceAnualId')].filter(Boolean);
  const pm = (m === reg.getInt('precoMensalCentavos') && reg.getString('priceMensalId')) || novo(m, 'month');
  const pa = (a === reg.getInt('precoAnualCentavos') && reg.getString('priceAnualId')) || novo(a, 'year');
  antigos.forEach(function (id) { if (id !== pm && id !== pa) { try { chamar('POST', '/v1/prices/' + id, { active: 'false' }); } catch (_) {} } });
  reg.set('nomeExibido', nome.replace('FluxGK ', ''));
  reg.set('precoMensalCentavos', m); reg.set('precoAnualCentavos', a);
  reg.set('priceMensalId', pm); reg.set('priceAnualId', pa);
  reg.set('ativo', true);
  if (adminId) reg.set('atualizadoPor', adminId);
  app.save(reg);
  return reg;
}

/* --------------------------------------- webhook --------------------------------------- */

/** Confere `Stripe-Signature: t=…,v1=…` sobre o corpo CRU. Devolve true/false. */
function assinaturaValida(cabecalho, corpo, agoraS) {
  const segredo = cfg().segredo;
  if (!segredo || !cabecalho) return false;
  let t = '', v1 = [];
  String(cabecalho).split(',').forEach(function (par) {
    const i = par.indexOf('='), k = par.slice(0, i).trim(), v = par.slice(i + 1).trim();
    if (k === 't') t = v; else if (k === 'v1') v1.push(v);
  });
  if (!/^\d+$/.test(t) || !v1.length) return false;
  if (Math.abs((agoraS || Math.floor(Date.now() / 1000)) - Number(t)) > TOLERANCIA_S) return false;
  const esperado = $security.hs256(t + '.' + corpo, segredo);
  return v1.some(function (v) { return $security.equal(v, esperado); });
}

function acharConta(app, campo, valor) {
  if (!valor) return null;
  try { return app.findFirstRecordByFilter('users', campo + ' = {:v}', { v: valor }); } catch (_) { return null; }
}

function planoDoPreco(app, price) {
  if (!price) return '';
  if (price.metadata && price.metadata.plano) return String(price.metadata.plano);
  try {
    const r = app.findFirstRecordByFilter('planos_config', 'priceMensalId = {:p} || priceAnualId = {:p}', { p: price.id });
    return r.getString('plano');
  } catch (_) { return ''; }
}

function idDe(v) { return v && typeof v === 'object' ? v.id : (v || ''); }

/** Assinatura de uma fatura (o lugar muda entre versões da API). */
function assinaturaDaFatura(f) {
  if (f.subscription) return idDe(f.subscription);
  const p = f.parent && f.parent.subscription_details;
  return p ? idDe(p.subscription) : '';
}

/** Primeiro acesso depois da compra: um ciclo + 1 dia de folga; a fatura paga corrige para o fim exato. */
function ateInicial(ciclo) { return Date.now() + ((ciclo === 'anual' ? 366 : 32) * 86400 * 1000); }

/** Trata um evento já conferido e ainda não visto. Devolve {resultado, detalhe, conta?, assinaturaId?}. */
function tratarEvento(app, ev) {
  const A = require(`${__hooks}/fluxgk_acesso.js`);
  const C = require(`${__hooks}/fluxgk_codigos.js`);
  const o = (ev.data && ev.data.object) || {};
  switch (ev.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      if (o.payment_status !== 'paid' && o.payment_status !== 'no_payment_required') {
        return { resultado: 'ignorado', detalhe: 'aguardando pagamento (' + o.payment_status + ')' };
      }
      const plano = (o.metadata && o.metadata.plano) || '';
      const ciclo = (o.metadata && o.metadata.ciclo) || 'mensal';
      if (!A.PLANOS[plano]) return { resultado: 'erro', detalhe: 'sessão sem plano conhecido: ' + plano };
      const sub = idDe(o.subscription), cli = idDe(o.customer), ate = ateInicial(ciclo);
      let jaTem = null;
      try { jaTem = app.findFirstRecordByFilter('codigos_ativacao', 'sessaoPagamento = {:s}', { s: o.id }); } catch (_) {}
      if (jaTem) return { resultado: 'ignorado', detalhe: 'sessão já tratada', assinaturaId: sub };
      const conta = o.client_reference_id ? acharConta(app, 'id', o.client_reference_id) : null;
      if (conta) {
        A.aplicarPlano(conta, plano, ate, 'pagamento', { assinaturaId: sub, clientePagamentoId: cli });
        app.save(conta);
        const g = C.gerar(app, { plano: plano, ciclo: ciclo, origem: 'pagamento', sessaoPagamento: o.id, assinaturaId: sub,
          clientePagamentoId: cli, acessoAte: A.dataPb(ate), usadoPor: conta.id, usadoEm: A.dataPb(Date.now()), motivo: 'compra logada' });
        g.registro.set('codigoClaro', ''); app.save(g.registro);
        return { resultado: 'ok', detalhe: 'plano ' + plano + ' aplicado direto (compra logada)', conta: conta.id, assinaturaId: sub };
      }
      C.gerar(app, { plano: plano, ciclo: ciclo, origem: 'pagamento', sessaoPagamento: o.id, assinaturaId: sub,
        clientePagamentoId: cli, acessoAte: A.dataPb(ate) });
      return { resultado: 'ok', detalhe: 'código gerado para o plano ' + plano, assinaturaId: sub };
    }
    case 'invoice.paid': {
      const sub = assinaturaDaFatura(o);
      const linha = o.lines && o.lines.data && o.lines.data[0];
      const fimMs = linha && linha.period && linha.period.end ? linha.period.end * 1000 : 0;
      if (!sub || !fimMs) return { resultado: 'ignorado', detalhe: 'fatura sem assinatura ou período' };
      const ateMs = fimMs + 86400 * 1000;                    /* 1 dia de folga para a próxima cobrança cair */
      const conta = acharConta(app, 'assinaturaId', sub);
      if (conta) {
        A.estenderAte(conta, ateMs); app.save(conta);
        return { resultado: 'ok', detalhe: 'acesso até ' + A.dataPb(ateMs), conta: conta.id, assinaturaId: sub };
      }
      let cod = null;
      try { cod = app.findFirstRecordByFilter('codigos_ativacao', "assinaturaId = {:s} && usadoPor = ''", { s: sub }); } catch (_) {}
      if (cod) {
        const atual = cod.getDateTime('acessoAte');
        if (!atual || atual.isZero() || atual.unix() * 1000 < ateMs) { cod.set('acessoAte', A.dataPb(ateMs)); app.save(cod); }
        return { resultado: 'ok', detalhe: 'código ainda não ativado: prazo guardado no código', assinaturaId: sub };
      }
      return { resultado: 'ignorado', detalhe: 'assinatura sem conta nem código (ainda)', assinaturaId: sub };
    }
    case 'customer.subscription.updated': {
      const conta = acharConta(app, 'assinaturaId', o.id);
      const item = o.items && o.items.data && o.items.data[0];
      const plano = planoDoPreco(app, item && item.price);
      if (!conta || !A.PLANOS[plano]) return { resultado: 'ignorado', detalhe: 'sem conta ou plano (' + plano + ')', assinaturaId: o.id };
      if (conta.getString('plano') !== plano) {
        conta.set('plano', plano); conta.set('modulos', A.modulosDoPlano(plano)); app.save(conta);
        return { resultado: 'ok', detalhe: 'plano trocado para ' + plano, conta: conta.id, assinaturaId: o.id };
      }
      return { resultado: 'ignorado', detalhe: 'plano igual', conta: conta.id, assinaturaId: o.id };
    }
    case 'invoice.payment_failed':
    case 'customer.subscription.deleted': {
      const sub = ev.type === 'invoice.payment_failed' ? assinaturaDaFatura(o) : o.id;
      const conta = acharConta(app, 'assinaturaId', sub);
      return { resultado: 'ok', detalhe: ev.type + ': o acesso segue até o vencimento', conta: conta && conta.id, assinaturaId: sub };
    }
    default:
      return { resultado: 'ignorado', detalhe: 'evento não tratado' };
  }
}

/** Webhook inteiro: confere, deduplica e trata numa transação. Devolve {status, corpo}. */
function webhook(app, cabecalho, corpo) {
  if (!assinaturaValida(cabecalho, corpo)) {
    try {
      const r = new Record(app.findCollectionByNameOrId('eventos_pagamento'));
      r.set('tipo', 'webhook.rejeitado'); r.set('resultado', 'erro'); r.set('detalhe', 'assinatura inválida ou vencida');
      app.save(r);
    } catch (_) {}
    return { status: 400, corpo: { message: 'Assinatura inválida.' } };
  }
  let ev;
  try { ev = JSON.parse(corpo); } catch (_) { return { status: 400, corpo: { message: 'JSON inválido.' } }; }
  try {
    app.findFirstRecordByFilter('eventos_pagamento', 'eventoId = {:e}', { e: String(ev.id || '') });
    return { status: 200, corpo: { repetido: true } };
  } catch (_) { /* novo */ }
  let saida = null;
  app.runInTransaction(function (tx) {
    const res = tratarEvento(tx, ev);
    const r = new Record(tx.findCollectionByNameOrId('eventos_pagamento'));
    r.set('eventoId', String(ev.id || '')); r.set('tipo', String(ev.type || '')); r.set('resultado', res.resultado);
    r.set('detalhe', String(res.detalhe || '').slice(0, 2000));
    if (res.conta) r.set('conta', res.conta);
    if (res.assinaturaId) r.set('assinaturaId', res.assinaturaId);
    const o = (ev.data && ev.data.object) || {};
    const valor = o.amount_paid != null ? o.amount_paid : o.amount_total;
    if (valor != null) r.set('valorCentavos', valor);
    tx.save(r);                                           /* índice único em eventoId: corrida vira erro e rollback */
    saida = { status: 200, corpo: { ok: true, resultado: res.resultado } };
  });
  return saida;
}

module.exports = {
  cfg: cfg, disponivel: disponivel, ErroPagamento: ErroPagamento, form: form, chamar: chamar,
  checkout: checkout, portal: portal, definirPrecos: definirPrecos,
  assinaturaValida: assinaturaValida, tratarEvento: tratarEvento, webhook: webhook,
};
