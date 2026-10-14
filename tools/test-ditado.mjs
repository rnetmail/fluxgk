#!/usr/bin/env node
/* FluxGK · teste de navegador do ditado por voz (feature 002, T003).
 *
 * O reconhecimento de voz é SIMULADO: antes de cada página entra um `SpeechRecognition` falso que o teste
 * comanda (`window.__fala('texto')`). Assim dá para conferir, sem microfone: o botão aparece em todo campo
 * de anotação (inclusive os criados depois), o texto entra no cursor sem apagar o resto, os eventos `input`
 * e `change` disparam, `data-ditado="nao"` fica sem botão, as Notas do jogo gravam com o minuto, e o
 * navegador sem reconhecimento mostra o botão desabilitado. Depois abre os módulos de verdade e confere
 * que o componente encaixou nos campos de cada um.
 *
 * Uso: node tools/test-ditado.mjs
 *   PW_MODULE  caminho do index.mjs do playwright(-core) (padrão: 'playwright-core')
 *   PW_CHANNEL canal do navegador (ex.: 'chrome' no CI, que usa o Chrome do runner)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mod = process.env.PW_MODULE ? pathToFileURL(path.resolve(process.env.PW_MODULE)).href : 'playwright-core';
const { chromium } = await import(mod);

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json' };
const FIXTURE = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<script src="/fluxgk-i18n.js"></script><script src="/static/fluxgk-ditado.js"></script></head><body>
<textarea id="a">Começo fim</textarea>
<input id="b" data-ditado>
<textarea id="c" data-ditado="nao"></textarea>
<input id="d">
<div id="notas"></div>
<script>
  window.__ev = { input: 0, change: 0 };
  document.getElementById('a').addEventListener('input', function () { __ev.input++; });
  document.getElementById('a').addEventListener('change', function () { __ev.change++; });
  window.__notas = [];
  window.__ui = FluxGKDitado.notasDoJogo(document.getElementById('notas'), {
    notas: function () { return __notas; }, minuto: function () { return 12; }, salvar: function (n) { __notas = n; } });
</script></body></html>`;

const servidor = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__teste-ditado.html') { res.writeHead(200, { 'content-type': TIPOS['.html'] }); return res.end(FIXTURE); }
  const arq = path.join(RAIZ, path.normalize(url).replace(/^([/\\])+/, ''));
  if (!arq.startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
  fs.createReadStream(arq).pipe(res);
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
const U = `http://127.0.0.1:${servidor.address().port}`;

/* reconhecimento falso: guarda a instância ativa; __fala entrega um resultado final */
const FALSO = () => {
  class SR {
    constructor() { this.lang = ''; window.__rec = this; }
    start() { this.ativo = true; window.__lang = this.lang; }
    stop() { this.ativo = false; if (this.onend) this.onend(); }
  }
  window.SpeechRecognition = SR;
  window.__fala = (t) => {
    const r = window.__rec; if (!r || !r.ativo) return false;
    const res = [{ transcript: t }]; res.isFinal = true;
    r.onresult({ resultIndex: 0, results: [res] }); return true;
  };
};

const b = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
let falhas = 0, total = 0;
const confere = (cond, msg) => { total++; if (cond) console.log('ok  ', msg); else { falhas++; console.error('FALHOU', msg); } };

try {
  /* ── componente na página de teste ── */
  const ctx = await b.newContext({ locale: 'pt-BR' });
  await ctx.addInitScript(FALSO);
  const pg = await ctx.newPage();
  const erros = []; pg.on('pageerror', (e) => erros.push(e.message));
  await pg.goto(U + '/__teste-ditado.html');
  await pg.waitForFunction(() => document.querySelectorAll('.fgk-mic').length >= 3);

  const temBotao = (id) => pg.evaluate((i) => !!document.getElementById(i).parentNode.querySelector(':scope > .fgk-mic'), id);
  confere(await temBotao('a'), 'textarea ganha o microfone');
  confere(await temBotao('b'), 'input com data-ditado ganha o microfone');
  confere(!(await temBotao('c')), 'data-ditado="nao" fica sem microfone');
  confere(!(await temBotao('d')), 'input comum fica sem microfone');

  /* cursor no meio: "Começo | fim" */
  await pg.evaluate(() => { const a = document.getElementById('a'); a.focus(); a.setSelectionRange(7, 7); });
  await pg.click('#a + .fgk-mic');
  confere(await pg.evaluate(() => document.querySelector('#a + .fgk-mic').getAttribute('aria-pressed') === 'true'), 'botão fica em "ouvindo"');
  confere(await pg.evaluate(() => window.__lang) === 'pt-BR', 'reconhece no idioma do app (pt-BR)');
  await pg.evaluate(() => window.__fala('meio do texto'));
  confere(await pg.inputValue('#a') === 'Começo meio do texto fim', 'texto entra no cursor sem apagar o resto: ' + JSON.stringify(await pg.inputValue('#a')));
  const ev = await pg.evaluate(() => window.__ev);
  confere(ev.input === 1 && ev.change === 1, `dispara input e change (${ev.input}/${ev.change})`);
  await pg.click('#a + .fgk-mic');
  confere(await pg.evaluate(() => document.querySelector('#a + .fgk-mic').getAttribute('aria-pressed') === 'false'), 'segundo toque para de ouvir');

  /* campo criado depois */
  await pg.evaluate(() => { const t = document.createElement('textarea'); t.id = 'novo'; document.body.appendChild(t); });
  await pg.waitForFunction(() => !!document.querySelector('#novo + .fgk-mic'));
  confere(true, 'campo criado depois ganha o microfone');
  /* campo temporário (copiar para a área de transferência) não deixa embrulho para trás */
  await pg.evaluate(() => { const t = document.createElement('textarea'); t.className = 'tmp'; document.body.appendChild(t); t.remove(); });
  await pg.waitForTimeout(50);
  confere(await pg.evaluate(() => document.querySelectorAll('.fgk-dit textarea.tmp, body > .fgk-dit:empty').length === 0), 'campo temporário removido não deixa sobra');

  /* notas do jogo: minuto sugerido, ditado e gravação */
  await pg.focus('#notas .fgk-nova');
  confere(await pg.inputValue('#notas .fgk-mn') === '12', 'nota sugere o minuto do jogo');
  await pg.click('#notas .fgk-nova + .fgk-mic');
  await pg.evaluate(() => window.__fala('goleiro saiu mal no segundo poste'));
  await pg.click('#notas .fgk-add');
  const n1 = await pg.evaluate(() => window.__notas);
  confere(n1.length === 1 && n1[0].min === 12 && n1[0].texto === 'Goleiro saiu mal no segundo poste', 'nota gravada com minuto: ' + JSON.stringify(n1));
  confere(await pg.evaluate(() => document.querySelectorAll('#notas li').length === 1), 'nota aparece na lista');
  await pg.fill('#notas .fgk-mn', '3'); await pg.fill('#notas .fgk-nova', 'pressão alta');
  await pg.click('#notas .fgk-add');
  const ordem = await pg.evaluate(() => [...document.querySelectorAll('#notas .fgk-min')].map((e) => e.textContent));
  confere(JSON.stringify(ordem) === JSON.stringify(["3'", "12'"]), 'minuto corrigido à mão e lista em ordem de minuto: ' + ordem.join(' '));
  await pg.click('#notas li:first-child .fgk-del');
  confere(await pg.evaluate(() => window.__notas.length === 1 && window.__notas[0].min === 12), 'apagar nota');
  const rel = await pg.evaluate(() => FluxGKDitado.htmlRelatorio(window.__notas, [{ rotulo: '#1', texto: '<b>obs</b>' }, { rotulo: '#2', texto: '' }]));
  confere(rel.includes('12&#39;') && rel.includes('&lt;b&gt;obs&lt;/b&gt;') && !rel.includes('#2'), 'bloco do relatório traz notas e observações, escapadas');
  confere(await pg.evaluate(() => FluxGKDitado.htmlRelatorio([], [])) === '', 'relatório sem notas sai igual ao de antes');
  confere(erros.length === 0, 'sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
  await ctx.close();

  /* ── navegador sem reconhecimento ── */
  const ctx2 = await b.newContext({ locale: 'pt-BR' });
  await ctx2.addInitScript(() => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });
  const p2 = await ctx2.newPage();
  await p2.goto(U + '/__teste-ditado.html');
  await p2.waitForSelector('#a + .fgk-mic');
  const sem = await p2.evaluate(() => { const m = document.querySelector('#a + .fgk-mic'); return { d: m.disabled, t: m.title }; });
  confere(sem.d && /Chrome, Edge ou Safari/.test(sem.t), 'sem suporte: botão desabilitado com a explicação');
  await ctx2.close();

  /* ── módulos de verdade: o componente encaixa nos campos de cada um ── */
  const MODULOS = {
    'mod_xg.html': ['#shotObs'],
    'mod_stats.html': ['#sf-obs', '#off-obs'],
    'mod_planner.html': ['#exDesc', '#exGoal'],
    'mod_autoavaliacao.html': ['#obs'],
    'mod_video.html': ['#noteInput'],
    'mod_data.html': ['#stNote'],
  };
  const ctx3 = await b.newContext({ locale: 'pt-BR' });
  await ctx3.addInitScript(FALSO);
  for (const [pag, campos] of Object.entries(MODULOS)) {
    const p = await ctx3.newPage();
    await p.goto(`${U}/${pag}`, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => !!window.FluxGKDitado, null, { timeout: 10000 }).catch(() => {});
    for (const c of campos) {
      const ok = await p.waitForFunction((sel) => { const e = document.querySelector(sel); return !!(e && e.parentNode.querySelector(':scope > .fgk-mic')); }, c, { timeout: 5000 }).then(() => true, () => false);
      confere(ok, `${pag}: ${c} tem microfone`);
    }
    await p.close();
  }
  for (const [pag, sel] of [['mod_xg.html', '#xgNotas .fgk-notas'], ['mod_minutes.html', '#min-notas .fgk-notas']]) {
    const p = await ctx3.newPage();
    await p.goto(`${U}/${pag}`);
    const ok = await p.waitForSelector(sel, { timeout: 8000 }).then(() => true, () => false);
    confere(ok, `${pag}: bloco "Notas do jogo" na tela`);
    await p.close();
  }
  /* campos de lista não ganham microfone */
  const scout = fs.readFileSync(path.join(RAIZ, 'mod_scouting.html'), 'utf8');
  confere(['data-c="links"', 'id="cfgLigas"', 'id="cfgTags"', 'id="cfgPaises"'].every((a) => new RegExp(`<textarea ${a.replace(/"/g, '"')}[^>]*data-ditado="nao"`).test(scout)), 'Scouting: listas (links, ligas, etiquetas, países) sem microfone');
  /* o hub libera o microfone para o iframe dos módulos */
  confere(/id="mfrm"[^>]*allow="[^"]*microphone/.test(fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8')), 'hub: iframe dos módulos com allow="microphone"');
  await ctx3.close();
} finally {
  await b.close();
  servidor.close();
}
console.log(`${total - falhas}/${total} conferências do ditado passaram.`);
process.exit(falhas ? 1 : 0);
