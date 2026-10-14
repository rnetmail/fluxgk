/// FluxGK · códigos de ativação (feature 001, RN-P04 e RN-P09).
///
/// O código é a ponte de quem PAGOU antes de ter conta: 16 caracteres de um alfabeto sem ambíguos (sem I, O, 0, 1),
/// mostrado como XXXX-XXXX-XXXX-XXXX. O banco guarda o SHA-256 do código normalizado; o texto claro (`codigoClaro`)
/// existe só para a página de sucesso reexibir antes do uso e é apagado na ativação. Vale uma vez, para uma conta.
/// Limite por conta: 10 erros por hora (o rate limit nativo do PocketBase é por IP e está desligado).

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ERROS_POR_HORA = 10;

function normalizar(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function formatar(n) { return n.replace(/(.{4})(?=.)/g, '$1-'); }
function hash(n) { return $security.sha256(n); }

/** Cria o registro do código e devolve o texto claro formatado. `dados`: plano, ciclo, origem, e opcionais. */
function gerar(app, dados) {
  const claro = $security.randomStringWithAlphabet(16, ALFABETO);
  const r = new Record(app.findCollectionByNameOrId('codigos_ativacao'));
  r.set('hash', hash(claro));
  r.set('final', claro.slice(-4));
  r.set('codigoClaro', formatar(claro));
  Object.keys(dados).forEach(function (k) { if (dados[k] !== undefined && dados[k] !== null) r.set(k, dados[k]); });
  app.save(r);
  return { codigo: formatar(claro), registro: r };
}

class ErroAtivacao extends Error {
  constructor(status, chave, msg) { super(msg); this.status = status; this.chave = chave; }
}

function contarErro(app, conta) {
  const desde = conta.getDateTime('tentativasDesde');
  const agora = Date.now();
  const janela = desde && !desde.isZero() && (agora - desde.unix() * 1000) < 3600 * 1000;
  conta.set('tentativasCodigo', janela ? conta.getInt('tentativasCodigo') + 1 : 1);
  if (!janela) conta.set('tentativasDesde', new Date(agora).toISOString().replace('T', ' '));
  app.save(conta);
}

function bloqueada(conta) {
  const desde = conta.getDateTime('tentativasDesde');
  if (!desde || desde.isZero()) return false;
  if (Date.now() - desde.unix() * 1000 >= 3600 * 1000) return false;
  return conta.getInt('tentativasCodigo') >= ERROS_POR_HORA;
}

/** Ativa o código na conta. Devolve {plano, modulos, acessoAte}; lança ErroAtivacao(status, chave, mensagem). */
function ativar(app, contaId, codigo) {
  const A = require(`${__hooks}/fluxgk_acesso.js`);
  let conta = app.findRecordById('users', contaId);
  if (bloqueada(conta)) throw new ErroAtivacao(429, 'muitas_tentativas', 'Muitas tentativas. Tente de novo em uma hora.');
  const n = normalizar(codigo);
  let reg = null;
  if (n.length === 16) {
    try { reg = app.findFirstRecordByFilter('codigos_ativacao', 'hash = {:h}', { h: hash(n) }); } catch (_) { reg = null; }
  }
  if (!reg) {
    contarErro(app, conta);
    throw new ErroAtivacao(400, 'codigo_invalido', 'Código inválido.');
  }
  let resultado = null, usado = false;
  try {
  app.runInTransaction(function (tx) {
    const r = tx.findRecordById('codigos_ativacao', reg.id);                 /* relido dentro da transação */
    /* erro lançado aqui volta como erro do Go, sem `status`: a marca fica na variável */
    if (r.getString('usadoPor')) { usado = true; throw new Error('codigo_usado'); }
    const c = tx.findRecordById('users', contaId);
    const origem = r.getString('origem') === 'cortesia' ? 'cortesia' : 'pagamento';
    let ate;
    const ateCodigo = r.getDateTime('acessoAte');
    if (ateCodigo && !ateCodigo.isZero()) ate = ateCodigo.unix() * 1000;
    else if (origem === 'cortesia' && r.getInt('diasCortesia') === 0) ate = A.SEM_VENCIMENTO;
    else ate = Date.now() + Math.max(1, r.getInt('diasCortesia')) * 86400 * 1000;
    A.aplicarPlano(c, r.getString('plano'), ate, origem, {
      assinaturaId: r.getString('assinaturaId'), clientePagamentoId: r.getString('clientePagamentoId'),
    });
    c.set('tentativasCodigo', 0);
    tx.save(c);
    r.set('usadoPor', contaId);
    r.set('usadoEm', A.dataPb(Date.now()));
    r.set('codigoClaro', '');
    tx.save(r);
    const ev = new Record(tx.findCollectionByNameOrId('eventos_pagamento'));
    ev.set('tipo', 'codigo.ativado'); ev.set('conta', contaId); ev.set('resultado', 'ok');
    ev.set('assinaturaId', r.getString('assinaturaId'));
    ev.set('detalhe', 'plano ' + r.getString('plano') + ' · origem ' + origem + ' · final ' + r.getString('final'));
    tx.save(ev);
    resultado = { plano: c.getString('plano'), modulos: c.get('modulos'), acessoAte: c.getString('acessoAte') };
  });
  } catch (err) {
    if (usado) throw new ErroAtivacao(409, 'codigo_usado', 'Este código já foi utilizado.');
    throw err;
  }
  return resultado;
}

module.exports = { ALFABETO: ALFABETO, normalizar: normalizar, formatar: formatar, hash: hash, gerar: gerar, ativar: ativar, ErroAtivacao: ErroAtivacao };
