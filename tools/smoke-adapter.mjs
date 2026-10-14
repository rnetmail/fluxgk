#!/usr/bin/env node
/* ============================================================================
 * FluxGK · teste de fumaça do ADAPTADOR `fluxdb` (static/pocketbase-adapter.js)
 *
 * Exercita o ADAPTADOR, não o SDK cru: é o adaptador que as 12 páginas chamam,
 * então é ele que precisa provar que funciona contra um PocketBase de verdade.
 *
 * Uso:
 *   PB_URL=http://127.0.0.1:8090 node tools/smoke-adapter.mjs
 *
 * O adaptador é código de NAVEGADOR. Para rodá-lo no Node sem alterar uma linha
 * dele, este arquivo monta o mínimo de ambiente de navegador:
 *   - window/self/location/document/localStorage/sessionStorage;
 *   - EventSource, que o Node 22 NÃO tem e de que o realtime do PocketBase
 *     depende (implementado aqui sobre fetch + SSE).
 *
 * A PROVA DE TEMPO REAL é feita de propósito por fora do adaptador: a escrita
 * do passo 6 vai pelo SDK cru (fluxdb._internal.pb()), que NÃO dispara o aviso
 * local do adaptador. Se o on('value') acordar, acordou pelo subscribe do
 * PocketBase — e não pelo eco da própria escrita.
 * ========================================================================== */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cliente } from './pb-ci.mjs';

const PB_BASE = process.env.PB_URL || 'http://127.0.0.1:8090';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SENHA = 'FluxGK!2026';
const selo = Date.now().toString(36);
const EMAIL_A = `smoke-a-${selo}@fluxgk.local`;
const EMAIL_B = `smoke-b-${selo}@fluxgk.local`;

/* ------------------------- EventSource sobre fetch ------------------------ */
class FetchEventSource {
  constructor(url) {
    this.url = String(url);
    this.readyState = 0;
    this.onerror = null;
    this.onopen = null;
    this.onmessage = null;
    this._ouvintes = {};
    this._abort = new AbortController();
    this._rodar();
  }
  addEventListener(tipo, fn) { (this._ouvintes[tipo] = this._ouvintes[tipo] || []).push(fn); }
  removeEventListener(tipo, fn) {
    this._ouvintes[tipo] = (this._ouvintes[tipo] || []).filter((f) => f !== fn);
  }
  close() { this.readyState = 2; try { this._abort.abort(); } catch (e) {} }
  _emitir(tipo, data, id) {
    const ev = { type: tipo, data, lastEventId: id };
    (this._ouvintes[tipo] || []).forEach((f) => { try { f(ev); } catch (e) { console.error(e); } });
    if (tipo === 'message' && this.onmessage) this.onmessage(ev);
  }
  async _rodar() {
    try {
      const r = await fetch(this.url, {
        headers: { Accept: 'text/event-stream' },
        signal: this._abort.signal
      });
      if (!r.ok || !r.body) throw new Error('SSE HTTP ' + r.status);
      this.readyState = 1;
      if (this.onopen) this.onopen({ type: 'open' });
      const dec = new TextDecoder();
      let buf = '';
      for await (const pedaco of r.body) {
        if (this.readyState === 2) return;
        buf = (buf + dec.decode(pedaco, { stream: true })).replace(/\r\n/g, '\n');
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const bruto = buf.slice(0, i);
          buf = buf.slice(i + 2);
          let tipo = 'message', id, dados = [];
          bruto.split('\n').forEach((linha) => {
            if (linha.startsWith('event:')) tipo = linha.slice(6).trim();
            else if (linha.startsWith('data:')) dados.push(linha.slice(5).replace(/^ /, ''));
            else if (linha.startsWith('id:')) id = linha.slice(3).trim();
          });
          this._emitir(tipo, dados.join('\n'), id);
        }
      }
      throw new Error('fluxo SSE terminou');
    } catch (e) {
      if (this.readyState === 2) return;
      this.readyState = 0;
      if (this.onerror) this.onerror({ type: 'error', message: e && e.message });
    }
  }
}

function memoria() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
    key: (i) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; }
  };
}

/* ----------------------- ambiente mínimo de navegador --------------------- */
globalThis.window = globalThis;
globalThis.self = globalThis;
globalThis.location = { origin: PB_BASE, href: PB_BASE + '/', protocol: 'http:' };
/* no Node 22 `navigator` é getter: atribuir direto lança TypeError. */
if (!globalThis.navigator) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'fluxgk-smoke' }, configurable: true, writable: true
  });
}
globalThis.document = {
  createElement: () => ({ set src(_v) {}, dataset: {} }),
  head: { appendChild() {} },
  querySelector: () => null,
  addEventListener() {}
};
globalThis.localStorage = memoria();
globalThis.sessionStorage = memoria();
globalThis.EventSource = FetchEventSource;
globalThis.FLUXGK_PB_URL = PB_BASE;
globalThis.FLUXGK_PB_SDK = RAIZ + '/static/vendor/pocketbase.umd.js';
if (process.env.FLUXGK_DEBUG) globalThis.FLUXGK_DEBUG = true;

function carregar(rel) {
  const p = path.join(RAIZ, rel);
  vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: rel });
}
carregar('static/vendor/pocketbase.umd.js');
if (!globalThis.PocketBase) throw new Error('o SDK do PocketBase não expôs window.PocketBase');
carregar('static/pocketbase-adapter.js');
if (!globalThis.fluxdb) throw new Error('o adaptador não expôs window.fluxdb');

/* --------------------------------- aferição -------------------------------- */
const falhas = [];
let n = 0;
function checar(nome, cond, detalhe) {
  n++;
  const bom = !!cond;
  if (!bom) falhas.push(nome + (detalhe ? ' — ' + detalhe : ''));
  console.log(`${bom ? 'ok  ' : 'FALHOU'} ${String(n).padStart(2)} · ${nome}${!bom && detalhe ? ' → ' + detalhe : ''}`);
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
async function esperar(cond, teto_ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < teto_ms) {
    if (cond()) return true;
    await dormir(120);
  }
  return false;
}

/* ----------------------------------- roteiro ------------------------------- */
async function main() {
  console.log(`\nFluxGK · fumaça do adaptador fluxdb contra ${PB_BASE}\n`);

  /* 1 · app */
  fluxdb.initializeApp({ pocketbaseUrl: PB_BASE });
  checar('initializeApp registra o app', fluxdb.apps.length === 1, 'apps=' + fluxdb.apps.length);
  checar('fluxdb.auth.Auth.Persistence existe (index.html usa)',
    fluxdb.auth.Auth.Persistence.LOCAL === 'local');

  const auth = fluxdb.auth();
  const db = fluxdb.database();

  /* 2 · onAuthStateChanged antes do login */
  const estados = [];
  auth.onAuthStateChanged((u) => estados.push(u ? u.uid : null));
  await esperar(() => estados.length > 0, 8000);
  checar('onAuthStateChanged avisa deslogado', estados[0] === null, JSON.stringify(estados));

  /* 3 · cadastro pela API está fechado (feature 001): a conta nasce pelo Admin ou pelo Google */
  await auth.setPersistence(fluxdb.auth.Auth.Persistence.LOCAL);
  let cadastrou = true;
  try { await auth.createUserWithEmailAndPassword(`anonimo-${selo}@fluxgk.local`, SENHA); } catch (_) { cadastrou = false; }
  checar('createUserWithEmailAndPassword é recusado (cadastro fechado)', !cadastrou);
  const pbci = cliente(PB_BASE);
  await pbci.conta(EMAIL_A, {}, SENHA);
  await pbci.conta(EMAIL_B, {}, SENHA);
  const cred = await auth.signInWithEmailAndPassword(EMAIL_A, SENHA);
  const uidA = cred && cred.user && cred.user.uid;
  checar('signInWithEmailAndPassword loga a conta criada pelo Admin', !!uidA, 'uid=' + uidA);
  checar('currentUser traz uid e email',
    auth.currentUser && auth.currentUser.uid === uidA && auth.currentUser.email === EMAIL_A,
    JSON.stringify(auth.currentUser));
  await esperar(() => estados.includes(uidA), 8000);
  checar('onAuthStateChanged avisa logado', estados.includes(uidA), JSON.stringify(estados));

  const base = `users/${uidA}/data/clubeA/2026`;
  const sessoes = base + '/sessions';

  /* 4 · set */
  await db.ref(sessoes).set({ s1: { titulo: 'Treino de reflexo', min: 45 } });
  checar('set gravou sem erro', true);

  /* 5 · once('value') */
  let snap = await db.ref(sessoes).once('value');
  checar('once("value") devolve o que foi gravado',
    snap.exists() && snap.val().s1.titulo === 'Treino de reflexo', JSON.stringify(snap.val()));
  checar('snapshot.key é a última parte do caminho', snap.key === 'sessions', snap.key);
  checar('snapshot.numChildren conta os filhos', snap.numChildren() === 1, String(snap.numChildren()));

  /* 6 · on('value') acorda por TEMPO REAL (escrita pelo SDK cru) */
  let recebidos = [];
  const alca = db.ref(sessoes).on('value', (s) => recebidos.push(s.val()));
  checar('on("value") devolve o próprio callback (mod_profile usa em off)',
    typeof alca === 'function');
  await esperar(() => recebidos.length > 0, 8000);
  checar('on("value") dispara o valor atual ao ligar',
    recebidos.length > 0 && recebidos[0] && recebidos[0].s1, JSON.stringify(recebidos[0]));
  await dormir(800);
  checar('on("value") dispara o valor inicial UMA vez, como o Firebase', recebidos.length === 1,
    'avisos=' + recebidos.length);

  const pb = fluxdb._internal.pb();
  const rec = await pb.collection('nodes').getFirstListItem(`owner="${uidA}" && path="${sessoes}"`);
  const antes = recebidos.length;
  await pb.collection('nodes').update(rec.id, {
    data: { v: { s1: { titulo: 'Treino de reflexo', min: 45 }, s2: { titulo: 'Saída de base', min: 30 } } }
  });
  const chegou = await esperar(
    () => recebidos.length > antes && recebidos[recebidos.length - 1] && recebidos[recebidos.length - 1].s2,
    20000
  );
  checar('on("value") recebe a mudança por TEMPO REAL (subscribe, sem eco local)',
    chegou, 'avisos=' + recebidos.length + ' último=' + JSON.stringify(recebidos[recebidos.length - 1]));

  /* 7 · leitura de folha dentro de um nó ancestral */
  snap = await db.ref(sessoes + '/s1/min').once('value');
  checar('lê folha descendo no JSON do nó ancestral', snap.val() === 45, JSON.stringify(snap.val()));

  /* 8 · update com caminho na chave (fan-out) */
  await db.ref(sessoes).update({ 's1/min': 60, 's2/min': 35 });
  snap = await db.ref(sessoes).once('value');
  checar('update com chave-caminho faz fan-out',
    snap.val().s1.min === 60 && snap.val().s2.min === 35, JSON.stringify(snap.val()));

  /* 9 · push */
  const novo = await db.ref(base + '/games').push({ adversario: 'Jaraguá', gols: 2 });
  checar('push gera chave e grava', !!novo.key || !!novo.path, JSON.stringify(novo.key || novo.path));
  snap = await db.ref(base + '/games').once('value');
  const chaves = Object.keys(snap.val() || {});
  checar('push aparece na leitura do pai',
    chaves.length === 1 && snap.val()[chaves[0]].adversario === 'Jaraguá', JSON.stringify(snap.val()));

  /* 10 · child / parent */
  const r = db.ref(base).child('games').child(chaves[0]);
  checar('ref.child encadeia o caminho', r.path === base + '/games/' + chaves[0], r.path);
  checar('ref.parent sobe um nível', r.parent().path === base + '/games', r.parent().path);

  /* 11 · remove */
  await db.ref(sessoes + '/s2').remove();
  snap = await db.ref(sessoes).once('value');
  checar('remove apaga só o ramo pedido',
    snap.val() && snap.val().s1 && !snap.val().s2, JSON.stringify(snap.val()));

  /* 11b · CUSTO: conta as requisições HTTP de verdade (fora o canal do tempo
     real). Era aqui que a versão 1.0 morria: 4 viagens por item salvo. */
  let viagens = 0;
  pb.beforeSend = (url, options) => {
    if (!/\/api\/realtime/.test(url)) viagens++;
    return { url, options };
  };
  const esperarFila = () => esperar(() => fluxdb._internal.pending() === 0, 20000);

  viagens = 0;
  await db.ref(sessoes).once('value');
  await db.ref(sessoes + '/s1/min').once('value');
  await db.ref(base).get();
  checar('leituras saem da cópia local, sem rede', viagens === 0, 'requisições=' + viagens);

  const lote = base + '/lote';
  const avisosLote = [];
  const alcaLote = db.ref(lote).on('value', (s) => avisosLote.push(Object.keys(s.val() || {}).length));
  await esperar(() => avisosLote.length > 0, 8000);
  const avisosAntes = avisosLote.length;
  viagens = 0;
  const t0 = Date.now();
  const itens = Array.from({ length: 150 }, (_, i) => ({ id: 1000 + i, titulo: 'Sessão ' + i, min: 45 }));
  await Promise.all(itens.map((s) => db.ref(lote + '/' + s.id).set(s)));
  const msLote = Date.now() - t0;
  checar('150 sessões novas = 150 requisições (era ~600)', viagens === 150, 'requisições=' + viagens + ' em ' + msLote + ' ms');
  await dormir(2500);
  const avisosDoLote = avisosLote.length - avisosAntes;
  checar('listener acorda 1× pelo lote inteiro e ignora o eco do tempo real',
    avisosDoLote === 1 && avisosLote[avisosLote.length - 1] === 150,
    'avisos=' + avisosDoLote + ' itens no último=' + avisosLote[avisosLote.length - 1]);
  db.ref(lote).off('value', alcaLote);

  viagens = 0;
  const editar = {};
  for (let i = 0; i < 30; i++) editar['s1/nota' + i] = i;
  await db.ref(sessoes).update(editar);
  checar('30 mudanças no mesmo nó no mesmo tique pegam carona (≤ 2 viagens)',
    viagens <= 2, 'requisições=' + viagens);
  snap = await db.ref(sessoes + '/s1').once('value');
  checar('o nó guarda as 30 mudanças', snap.val().nota0 === 0 && snap.val().nota29 === 29, JSON.stringify(snap.val()));

  const noServidor = await pb.collection('nodes').getFullList({ filter: `owner="${uidA}" && path~"${lote}/"` });
  checar('o servidor tem as 150 sessões do lote', noServidor.length === 150, 'registros=' + noServidor.length);
  const doServidor = await pb.collection('nodes').getFirstListItem(`owner="${uidA}" && path="${sessoes}"`);
  checar('o servidor tem as 30 mudanças', doServidor.data.v.s1.nota29 === 29, JSON.stringify(doServidor.data.v.s1));

  viagens = 0;
  await db.ref(lote).remove();
  await esperarFila();
  checar('remover o lote = 1 requisição por nó apagado', viagens === 150, 'requisições=' + viagens);
  snap = await db.ref(lote).once('value');
  checar('lote removido some da leitura', !snap.exists(), JSON.stringify(snap.val()));
  await dormir(2000);
  snap = await db.ref(lote).once('value');
  checar('eco atrasado do tempo real não ressuscita o que foi apagado', !snap.exists(),
    'itens=' + Object.keys(snap.val() || {}).length);
  pb.beforeSend = undefined;

  /* 12 · off */
  db.ref(sessoes).off('value', alca);
  const depoisDoOff = recebidos.length;
  await db.ref(sessoes + '/s3').set({ titulo: 'não deve notificar' });
  await dormir(2500);
  checar('off("value", h) cala o listener', recebidos.length === depoisDoOff,
    depoisDoOff + ' → ' + recebidos.length);
  await db.ref(sessoes + '/s3').remove();

  /* 13 · .info/connected */
  let conectado = null;
  db.ref('.info/connected').on('value', (s) => { conectado = s.val(); });
  await esperar(() => conectado === true, 10000);
  checar('.info/connected emite true com o PocketBase no ar', conectado === true, String(conectado));

  /* 14 · isolamento entre usuários (o vazamento que o Firebase tinha) */
  await auth.signOut();
  checar('signOut limpa currentUser', auth.currentUser === null, JSON.stringify(auth.currentUser));

  await auth.signInWithEmailAndPassword(EMAIL_B, SENHA);
  const uidB = auth.currentUser.uid;
  checar('segundo usuário loga', !!uidB && uidB !== uidA, uidB + ' vs ' + uidA);

  snap = await db.ref(sessoes).once('value');
  checar('usuário B NÃO lê os dados de A', !snap.exists() && snap.val() === null, JSON.stringify(snap.val()));

  await db.ref(sessoes + '/invadido').set({ x: 1 });   /* grava, mas no espaço de B */
  await auth.signOut();
  await auth.signInWithEmailAndPassword(EMAIL_A, SENHA);
  checar('A loga de volta com signInWithEmailAndPassword',
    auth.currentUser && auth.currentUser.uid === uidA, JSON.stringify(auth.currentUser));
  snap = await db.ref(sessoes).once('value');
  checar('o que B escreveu NÃO aparece para A',
    snap.val() && snap.val().s1 && !snap.val().invadido, JSON.stringify(snap.val()));

  /* 15 · erro de senha vira código de erro no estilo Firebase */
  let codigo = null;
  try { await auth.signInWithEmailAndPassword(EMAIL_A, 'senha-errada-mesmo'); }
  catch (e) { codigo = e.code; }
  checar('senha errada falha com e.code', !!codigo, String(codigo));

  /* 16 · reset de senha é do painel: falha alto em vez de prometer e-mail */
  let recusou = false;
  try { await auth.sendPasswordResetEmail(EMAIL_A); } catch (e) { recusou = /painel/.test(e.message); }
  checar('sendPasswordResetEmail recusa e aponta o painel /_/', recusou);

  /* 17 · fachada modular (mod_data.html) */
  const m = fluxdb.modular;
  const rm = m.ref(m.getDatabase(), base + '/modular');
  await m.set(rm, { ok: true });
  const sm = await m.get(rm);
  checar('fachada modular v10 (ref/set/get) funciona', sm.val() && sm.val().ok === true, JSON.stringify(sm.val()));
  await m.remove(rm);

  await auth.signOut();

  console.log(`\n${n - falhas.length}/${n} verificações passaram.`);
  if (falhas.length) {
    console.log('\nFALHAS:');
    falhas.forEach((f) => console.log('  · ' + f));
  }
  process.exit(falhas.length ? 1 : 0);
}

main().catch((e) => {
  console.error('\nERRO FATAL:', e && (e.stack || e.message || e));
  process.exit(2);
});
