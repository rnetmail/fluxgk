#!/usr/bin/env node
/* FluxGK · confere a sintaxe de todo JavaScript do app sem abrir navegador.
 *
 * As páginas são HTML com o script embutido: um erro de digitação num módulo só aparece quando
 * alguém abre aquele módulo. Aqui cada <script> embutido é compilado (não executado) com o
 * parser do Node, e os .js soltos passam por `node --check`. Uso: node tools/checa-paginas.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paginas = fs.readdirSync(RAIZ).filter(f => f.endsWith('.html'));
const soltos = ['fluxgk-i18n.js', 'static/pocketbase-adapter.js'];
let falhas = 0, total = 0;

for (const pag of paginas) {
  const html = fs.readFileSync(path.join(RAIZ, pag), 'utf8');
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1], codigo = m[2];
    if (/\bsrc\s*=/.test(attrs) || !codigo.trim()) continue;
    const tipo = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1] || 'text/javascript';
    if (!/javascript|module/i.test(tipo)) continue;          /* text/plain, importmap, json */
    total++;
    const linha = html.slice(0, m.index).split('\n').length;
    try {
      if (/module/i.test(tipo)) new vm.SourceTextModule(codigo, { identifier: `${pag}:${linha}` });
      else new vm.Script(codigo, { filename: `${pag}:${linha}` });
    } catch (e) {
      if (e instanceof TypeError && /SourceTextModule/.test(String(e))) {
        /* sem --experimental-vm-modules: compila como função assíncrona, que aceita await no topo */
        try { new vm.Script(`(async()=>{${codigo.replace(/^\s*(import|export)\b.*$/gm, '')}\n})`); continue; }
        catch (e2) { e = e2; }
      }
      falhas++;
      console.error(`FALHOU ${pag}:${linha} — ${e.message}`);
    }
  }
}
for (const f of soltos) {
  total++;
  try { execFileSync(process.execPath, ['--check', path.join(RAIZ, f)], { stdio: 'pipe' }); }
  catch (e) { falhas++; console.error(`FALHOU ${f} — ${String(e.stderr || e.message).trim()}`); }
}
console.log(`${total - falhas}/${total} scripts compilam (${paginas.length} páginas).`);
process.exit(falhas ? 1 : 0);
