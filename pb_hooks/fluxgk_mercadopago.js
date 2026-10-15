/// FluxGK · provedor Mercado Pago (feature 001, ampliação de 14/10; RN-P15, RN-P16, decisão D-15).
///
///   CARTÃO = assinatura recorrente com plano: um `preapproval_plan` por plano × ciclo, criado quando o Admin salva o
///            preço (como os Prices da Stripe). O cliente assina no `init_point` do plano, com a conta Mercado Pago
///            dele; a volta traz `preapproval_id`, e a página de sucesso mostra o código (s = mpa_<id>).
///   PIX    = pagamento por período (1 mês ou 1 ano) numa preferência do Checkout Pro só com Pix. Logado: o período
///            entra direto na conta; anônimo: gera código (s = mp_<nonce>).
///   WEBHOOK = conferido pelo `x-signature` (HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`) e cada
///            evento é RELIDO na API — o corpo da notificação não é fonte de verdade.
/// MP_API_URL só existe para o teste (serviço falso do CI); padrão https://api.mercadopago.com.

const TOLERANCIA_MS = 10 * 60 * 1000;

function api() { return String($os.getenv('MP_API_URL') || 'https://api.mercadopago.com').trim().replace(/\/$/, ''); }
function cfg() { return require(`${__hooks}/fluxgk_integracoes.js`).ler($app); }
function erro(status, chave, msg) {
  const P = require(`${__hooks}/fluxgk_assinatura.js`);
  return new P.ErroPagamento(status, chave, msg);
}

function chamar(metodo, caminho, corpo) {
  const token = cfg().mp.token;
  if (!token) throw erro(503, 'pagamento_indisponivel', 'Pagamento indisponível no momento.');
  let r;
  try {
    r = $http.send({
      url: api() + caminho, method: metodo, timeout: 10,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: corpo ? JSON.stringify(corpo) : '',
    });
  } catch (_) {
    throw erro(502, 'pagamento_falhou', 'O serviço de pagamento não respondeu. Tente de novo.');
  }
  if (r.statusCode < 200 || r.statusCode >= 300) {
    console.log('[mercadopago] ' + metodo + ' ' + caminho + ' → ' + r.statusCode + ' ' + toString(r.body).slice(0, 300));
    throw erro(502, 'pagamento_falhou', 'O serviço de pagamento recusou o pedido.');
  }
  return r.json;
}

function nomePlano(plano) { return plano.charAt(0).toUpperCase() + plano.slice(1); }
function meses(ciclo) { return ciclo === 'anual' ? 12 : 1; }
/** Fim do período a partir de `base` (ms): mesmo dia do mês seguinte (ou do ano seguinte) + 1 dia de folga. */
function fimPeriodo(baseMs, ciclo) {
  const d = new Date(baseMs);
  d.setUTCMonth(d.getUTCMonth() + meses(ciclo));
  return d.getTime() + 86400 * 1000;
}

/** Cria o plano de assinatura (cartão) de um plano × ciclo e devolve o id. */
function criarPlano(plano, ciclo, centavos) {
  const c = cfg();
  const r = chamar('POST', '/preapproval_plan', {
    reason: 'FluxGK ' + nomePlano(plano) + (ciclo === 'anual' ? ' (anual)' : ' (mensal)'),
    auto_recurring: { frequency: meses(ciclo), frequency_type: 'months', transaction_amount: centavos / 100, currency_id: 'BRL' },
    back_url: c.url + '/assinatura-ok.html',
    payment_methods_allowed: { payment_types: [{ id: 'credit_card' }] },
  });
  return r.id;
}

/** Garante os planos de assinatura do Mercado Pago para o registro de `planos_config` (só os que faltam). */
function garantirPlanos(app, reg) {
  let mudou = false;
  [['mensal', 'precoMensalCentavos', 'mpPlanoMensalId'], ['anual', 'precoAnualCentavos', 'mpPlanoAnualId']].forEach(function (x) {
    const centavos = reg.getInt(x[1]);
    if (centavos > 0 && !reg.getString(x[2])) { reg.set(x[2], criarPlano(reg.getString('plano'), x[0], centavos)); mudou = true; }
  });
  if (mudou) app.save(reg);
  return mudou;
}

/** Checkout: cartão → página do plano de assinatura; pix → preferência de um período. */
function checkout(app, reg, plano, ciclo, conta, meio) {
  const c = cfg();
  if (meio === 'pix') {
    const centavos = reg.getInt(ciclo === 'anual' ? 'precoAnualCentavos' : 'precoMensalCentavos');
    if (!(centavos > 0)) throw erro(503, 'preco_nao_configurado', 'Este plano ainda não tem preço.');
    const nonce = $security.randomStringWithAlphabet(24, 'abcdefghijklmnopqrstuvwxyz0123456789');
    const ok = c.url + '/assinatura-ok.html?s=mp_' + nonce;
    const pref = chamar('POST', '/checkout/preferences', {
      items: [{ id: plano + '-' + ciclo, title: 'FluxGK ' + nomePlano(plano) + (ciclo === 'anual' ? ' · 1 ano' : ' · 1 mês'),
        quantity: 1, unit_price: centavos / 100, currency_id: 'BRL' }],
      external_reference: ['fluxgk', plano, ciclo, conta ? conta.id : '', nonce].join('|'),
      back_urls: { success: ok, pending: ok, failure: c.url + '/planos.html' },
      auto_return: 'approved',
      payment_methods: { excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }], installments: 1 },
      notification_url: c.url + '/api/fluxgk/pagamento/webhook-mp',
    });
    return { url: pref.init_point };
  }
  if (garantirPlanos(app, reg)) { /* criou o que faltava */ }
  const id = reg.getString(ciclo === 'anual' ? 'mpPlanoAnualId' : 'mpPlanoMensalId');
  if (!id) throw erro(503, 'preco_nao_configurado', 'Este plano ainda não tem preço.');
  return { url: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=' + encodeURIComponent(id) };
}

/* ----------------------------------------- webhook ----------------------------------------- */

function assinaturaValida(xSignature, xRequestId, dataId, agoraMs) {
  const segredo = cfg().mp.segredo;
  if (!segredo || !xSignature || !dataId) return false;
  let ts = '', v1 = '';
  String(xSignature).split(',').forEach(function (par) {
    const i = par.indexOf('='), k = par.slice(0, i).trim(), v = par.slice(i + 1).trim();
    if (k === 'ts') ts = v; else if (k === 'v1') v1 = v;
  });
  if (!/^\d+$/.test(ts) || !v1) return false;
  const tsMs = ts.length > 11 ? Number(ts) : Number(ts) * 1000;              /* aceita segundos ou milissegundos */
  if (Math.abs((agoraMs || Date.now()) - tsMs) > TOLERANCIA_MS) return false;
  const manifesto = 'id:' + String(dataId).toLowerCase() + ';' + (xRequestId ? 'request-id:' + xRequestId + ';' : '') + 'ts:' + ts + ';';
  return $security.equal(v1, $security.hs256(manifesto, segredo));
}

function acharPlanoMp(app, planoMpId) {
  try {
    const r = app.findFirstRecordByFilter('planos_config', 'mpPlanoMensalId = {:p} || mpPlanoAnualId = {:p}', { p: planoMpId });
    return { plano: r.getString('plano'), ciclo: r.getString('mpPlanoAnualId') === planoMpId ? 'anual' : 'mensal' };
  } catch (_) { return null; }
}
function acharConta(app, campo, valor) {
  if (!valor) return null;
  try { return app.findFirstRecordByFilter('users', campo + ' = {:v}', { v: valor }); } catch (_) { return null; }
}
function acharCodigo(app, filtro, p) { try { return app.findFirstRecordByFilter('codigos_ativacao', filtro, p); } catch (_) { return null; } }

/** Relê o recurso na API e decide. Devolve {resultado, detalhe, chave?, conta?, assinaturaId?, valor?}.
 *  `chave` é a marca de efeito (idempotência): o mesmo pagamento aprovado nunca vale duas vezes. */
function tratar(app, tipo, id) {
  const A = require(`${__hooks}/fluxgk_acesso.js`);
  const C = require(`${__hooks}/fluxgk_codigos.js`);
  if (tipo === 'payment') {
    const p = chamar('GET', '/v1/payments/' + encodeURIComponent(id));
    if (p.status !== 'approved') return { resultado: 'ignorado', detalhe: 'pagamento ' + p.status };
    const ref = String(p.external_reference || '').split('|');
    if (ref[0] !== 'fluxgk' || !A.PLANOS[ref[1]]) return { resultado: 'ignorado', detalhe: 'pagamento de fora do FluxGK' };
    const plano = ref[1], ciclo = ref[2] === 'anual' ? 'anual' : 'mensal', contaId = ref[3], nonce = ref[4];
    const valor = Math.round(Number(p.transaction_amount || 0) * 100);
    const conta = contaId ? acharConta(app, 'id', contaId) : null;
    if (conta) {
      const atual = conta.getDateTime('acessoAte');
      const base = Math.max(Date.now(), atual && !atual.isZero() && conta.getString('plano') === plano ? atual.unix() * 1000 : 0);
      A.aplicarPlano(conta, plano, fimPeriodo(base, ciclo), 'pagamento');
      app.save(conta);
      return { resultado: 'ok', detalhe: 'Pix: ' + plano + ' ' + ciclo + ' aplicado direto na conta', chave: 'mp:pay:' + id, conta: conta.id, valor: valor };
    }
    if (acharCodigo(app, 'sessaoPagamento = {:s}', { s: 'mp_' + nonce })) return { resultado: 'ignorado', detalhe: 'compra já tratada', chave: 'mp:pay:' + id };
    C.gerar(app, { plano: plano, ciclo: ciclo, origem: 'pagamento', sessaoPagamento: 'mp_' + nonce, acessoAte: A.dataPb(fimPeriodo(Date.now(), ciclo)) });
    return { resultado: 'ok', detalhe: 'Pix: código gerado para o plano ' + plano, chave: 'mp:pay:' + id, valor: valor };
  }
  if (tipo === 'subscription_preapproval') {
    const s = chamar('GET', '/preapproval/' + encodeURIComponent(id));
    if (s.status !== 'authorized') return { resultado: 'ok', detalhe: 'assinatura ' + s.status + ': o acesso segue até o vencimento', assinaturaId: id };
    const pl = acharPlanoMp(app, s.preapproval_plan_id);
    if (!pl) return { resultado: 'erro', detalhe: 'plano do Mercado Pago desconhecido: ' + s.preapproval_plan_id, assinaturaId: id };
    const conta = acharConta(app, 'assinaturaId', id);
    if (!conta) {
      /* feature 003: assinatura do checkout transparente feita por conta logada (external_reference com a conta) */
      const ref = String(s.external_reference || '').split('|');
      const dona = ref[0] === 'fluxgk' && ref[3] ? acharConta(app, 'id', ref[3]) : null;
      if (dona && !acharCodigo(app, 'sessaoPagamento = {:s}', { s: 'mpa_' + id })) {
        const ateMs = fimPeriodo(Date.now(), pl.ciclo);
        A.aplicarPlano(dona, pl.plano, ateMs, 'pagamento', { assinaturaId: id });
        app.save(dona);
        const g = C.gerar(app, { plano: pl.plano, ciclo: pl.ciclo, origem: 'pagamento', sessaoPagamento: 'mpa_' + id, assinaturaId: id,
          acessoAte: A.dataPb(ateMs), usadoPor: dona.id, usadoEm: A.dataPb(Date.now()), motivo: 'compra logada' });
        g.registro.set('codigoClaro', ''); app.save(g.registro);
        return { resultado: 'ok', detalhe: 'cartão: plano ' + pl.plano + ' aplicado direto (compra logada)', chave: 'mp:sub:' + id, conta: dona.id, assinaturaId: id };
      }
    }
    if (conta) {
      if (conta.getString('plano') !== pl.plano) { conta.set('plano', pl.plano); conta.set('modulos', A.modulosDoPlano(pl.plano)); app.save(conta); }
      return { resultado: 'ok', detalhe: 'assinatura autorizada (conta já ligada)', conta: conta.id, assinaturaId: id };
    }
    if (acharCodigo(app, 'sessaoPagamento = {:s}', { s: 'mpa_' + id })) return { resultado: 'ignorado', detalhe: 'assinatura já tratada', assinaturaId: id };
    C.gerar(app, { plano: pl.plano, ciclo: pl.ciclo, origem: 'pagamento', sessaoPagamento: 'mpa_' + id, assinaturaId: id,
      acessoAte: A.dataPb(fimPeriodo(Date.now(), pl.ciclo)) });
    return { resultado: 'ok', detalhe: 'cartão: código gerado para o plano ' + pl.plano, chave: 'mp:sub:' + id, assinaturaId: id };
  }
  if (tipo === 'subscription_authorized_payment') {
    const f = chamar('GET', '/authorized_payments/' + encodeURIComponent(id));
    const pago = f.status === 'processed' || (f.payment && f.payment.status === 'approved');
    if (!pago) return { resultado: 'ok', detalhe: 'cobrança ' + f.status + ': o acesso segue até o vencimento', assinaturaId: f.preapproval_id };
    const sub = String(f.preapproval_id || '');
    const s = chamar('GET', '/preapproval/' + encodeURIComponent(sub));
    const pl = acharPlanoMp(app, s.preapproval_plan_id) || { ciclo: 'mensal' };
    const base = Date.parse(f.debit_date || f.date_created || '') || Date.now();
    const ateMs = fimPeriodo(base, pl.ciclo);
    const valor = Math.round(Number(f.transaction_amount || 0) * 100);
    const conta = acharConta(app, 'assinaturaId', sub);
    if (conta) { A.estenderAte(conta, ateMs); app.save(conta); return { resultado: 'ok', detalhe: 'renovação: acesso até ' + A.dataPb(ateMs), chave: 'mp:cob:' + id, conta: conta.id, assinaturaId: sub, valor: valor }; }
    const cod = acharCodigo(app, "assinaturaId = {:s} && usadoPor = ''", { s: sub });
    if (cod) {
      const atual = cod.getDateTime('acessoAte');
      if (!atual || atual.isZero() || atual.unix() * 1000 < ateMs) { cod.set('acessoAte', A.dataPb(ateMs)); app.save(cod); }
      return { resultado: 'ok', detalhe: 'código ainda não ativado: prazo guardado no código', chave: 'mp:cob:' + id, assinaturaId: sub, valor: valor };
    }
    return { resultado: 'ignorado', detalhe: 'cobrança sem conta nem código (ainda)', assinaturaId: sub };
  }
  return { resultado: 'ignorado', detalhe: 'tipo não tratado: ' + tipo };
}

/** Webhook inteiro. `q` = query (data.id, type), `h` = função que lê cabeçalho, `corpo` = texto cru. */
function webhook(app, q, h, corpo) {
  let b = {};
  try { b = JSON.parse(corpo || '{}'); } catch (_) { b = {}; }
  const dataId = String(q['data.id'] || (b.data && b.data.id) || q.id || '');
  const tipo = String(q.type || b.type || q.topic || '');
  if (!assinaturaValida(h('x-signature'), h('x-request-id'), dataId)) {
    try {
      const r = new Record(app.findCollectionByNameOrId('eventos_pagamento'));
      r.set('tipo', 'webhook.rejeitado'); r.set('resultado', 'erro'); r.set('meio', 'mercadopago'); r.set('detalhe', 'assinatura inválida ou vencida');
      app.save(r);
    } catch (_) {}
    return { status: 400, corpo: { message: 'Assinatura inválida.' } };
  }
  let saida = null;
  try {
  app.runInTransaction(function (tx) {
    /* a repetição desfaz a transação inteira (o efeito do `tratar` some junto) */
    const res = tratar(tx, tipo, dataId);
    if (res.chave) {
      let ja = null;
      try { ja = tx.findFirstRecordByFilter('eventos_pagamento', 'eventoId = {:e}', { e: res.chave }); } catch (_) {}
      if (ja) { saida = { status: 200, corpo: { repetido: true } }; throw new Error('repetido'); }
    }
    const r = new Record(tx.findCollectionByNameOrId('eventos_pagamento'));
    if (res.chave) r.set('eventoId', res.chave);
    r.set('tipo', 'mp.' + tipo); r.set('resultado', res.resultado); r.set('meio', 'mercadopago');
    r.set('detalhe', String(res.detalhe || '').slice(0, 2000));
    if (res.conta) r.set('conta', res.conta);
    if (res.assinaturaId) r.set('assinaturaId', res.assinaturaId);
    if (res.valor) r.set('valorCentavos', res.valor);
    tx.save(r);
    saida = { status: 200, corpo: { ok: true, resultado: res.resultado } };
  });
  } catch (err) {
    if (saida && saida.corpo.repetido) return saida;
    if (err && err.status) return { status: err.status, corpo: { message: err.message } };
    throw err;
  }
  return saida;
}

module.exports = { chamar: chamar, criarPlano: criarPlano, garantirPlanos: garantirPlanos, checkout: checkout,
  assinaturaValida: assinaturaValida, tratar: tratar, webhook: webhook, fimPeriodo: fimPeriodo };
