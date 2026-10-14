/* ============================================================================
 * FluxGK · ditado por voz em toda anotação (feature 002; decisões D-02 e D-26 do dono)
 *
 * Usa o reconhecimento de voz do PRÓPRIO NAVEGADOR (Web Speech API): nada de áudio passa pelo servidor do FluxGK
 * e nada é gravado; só o texto entra no campo. Chrome e Edge mandam o áudio ao serviço do Google para transcrever
 * (precisa de internet); Safari usa o da Apple; Firefox não tem, e o botão aparece desabilitado com a explicação.
 *
 * Encaixe automático: todo <textarea> e todo campo com `data-ditado` ganha um botão de microfone, inclusive os
 * criados depois (MutationObserver). `data-ditado="nao"` desliga. O texto ditado entra NO CURSOR, sem apagar o que já
 * existia, e o componente dispara `input` e `change` — cada módulo salva do jeito que já salvava ao digitar.
 *
 * API:
 *   FluxGKDitado.suportado                  true se o navegador reconhece voz
 *   FluxGKDitado.anexar(raiz?)              encaixa os botões (o encaixe automático já chama sozinho)
 *   FluxGKDitado.notasDoJogo(el, opcoes)    bloco "Notas do jogo": lista {min, texto, em} + campo com microfone
 *       opcoes = { notas: () => array, minuto: () => número, salvar: (array) => void, titulo?: texto }
 * ========================================================================== */
(function (g) {
  'use strict';
  if (g.FluxGKDitado) return;
  var SR = g.SpeechRecognition || g.webkitSpeechRecognition || null;

  var IDIOMAS = { pt: 'pt-BR', 'pt-BR': 'pt-BR', 'pt-PT': 'pt-PT', en: 'en-US', fr: 'fr-FR', de: 'de-DE', ru: 'ru-RU', es: 'es-ES', it: 'it-IT', nl: 'nl-NL' };
  var TXT = {
    pt: { ditar: 'Ditar por voz', ouvindo: 'Ouvindo… toque para parar', semSuporte: 'Seu navegador não tem ditado por voz: use Chrome, Edge ou Safari.',
      semRede: 'O ditado precisa de internet.', bloqueado: 'Microfone bloqueado: libere nas permissões do navegador.', notas: 'Notas do jogo',
      nova: 'Nova nota (fale ou digite)', add: 'Adicionar', apagar: 'Apagar nota', vazio: 'Nenhuma nota ainda.', min: 'min', minuto: 'Minuto do jogo', obs: 'Observação' },
    en: { ditar: 'Dictate', ouvindo: 'Listening… tap to stop', semSuporte: 'Your browser has no voice dictation: use Chrome, Edge or Safari.',
      semRede: 'Dictation needs an internet connection.', bloqueado: 'Microphone blocked: allow it in the browser permissions.', notas: 'Match notes',
      nova: 'New note (speak or type)', add: 'Add', apagar: 'Delete note', vazio: 'No notes yet.', min: 'min', minuto: 'Match minute', obs: 'Note' },
  };
  function lg() {
    var l = '';
    try { l = (g.FluxGKI18n && g.FluxGKI18n.getLang()) || ''; } catch (e) {}
    return l || document.documentElement.lang || 'pt';
  }
  function t(k) { var l = lg(); var d = TXT[l.slice(0, 2) === 'pt' ? 'pt' : (TXT[l] ? l : 'en')]; return d[k]; }

  /* ------------------------------------ estilo ------------------------------------ */
  function estilo() {
    if (document.getElementById('fgk-ditado-css')) return;
    var s = document.createElement('style');
    s.id = 'fgk-ditado-css';
    s.textContent =
      '.fgk-dit{position:relative}' +
      '.fgk-dit>textarea,.fgk-dit>input{padding-right:48px!important}' +
      '.fgk-mic{position:absolute;right:6px;bottom:6px;width:36px;height:36px;border-radius:50%;border:1px solid #d4d4d4;background:#fff;color:#0a0a0a;' +
      'display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;z-index:2;box-shadow:0 1px 2px rgba(0,0,0,.08)}' +
      '.fgk-dit>input+.fgk-mic{top:50%;bottom:auto;transform:translateY(-50%)}' +
      '.fgk-mic svg{width:17px;height:17px}' +
      '.fgk-mic:focus-visible{outline:2px solid #E8901A;outline-offset:2px}' +
      '.fgk-mic.on{background:#dc2626;border-color:#dc2626;color:#fff;animation:fgkpulse 1.2s infinite}' +
      '.fgk-mic:disabled{opacity:.4;cursor:not-allowed}' +
      '@keyframes fgkpulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.45)}50%{box-shadow:0 0 0 7px rgba(220,38,38,0)}}' +
      '.fgk-dit-aviso{position:absolute;right:0;bottom:46px;max-width:260px;background:#111;color:#fff;font:500 12px/1.4 system-ui,sans-serif;' +
      'padding:7px 9px;border-radius:7px;z-index:3}' +
      '.fgk-notas{border:1px solid #e5e5e5;border-radius:10px;padding:10px;background:#fff}' +
      '.fgk-notas h4{margin:0 0 8px;font:600 11px/1 "JetBrains Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:#737373}' +
      '.fgk-notas ul{list-style:none;margin:0 0 8px;padding:0;max-height:180px;overflow:auto}' +
      '.fgk-notas li{display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px;line-height:1.4}' +
      '.fgk-notas li:last-child{border-bottom:0}' +
      '.fgk-notas .fgk-min{font:700 12px "JetBrains Mono",monospace;color:#B45309;flex:0 0 auto;min-width:42px}' +
      '.fgk-notas .fgk-tx{flex:1;overflow-wrap:anywhere}' +
      '.fgk-notas .fgk-del{border:0;background:transparent;color:#a3a3a3;cursor:pointer;font-size:15px;line-height:1;padding:2px 4px}' +
      '.fgk-notas .fgk-row{display:flex;flex-wrap:wrap;gap:8px;align-items:stretch}' +
      '.fgk-notas .fgk-row .fgk-dit{flex:1 1 100%;min-width:0;order:-1}' +
      '.fgk-notas .fgk-mn{flex:0 0 72px;width:72px;height:40px;box-sizing:border-box;border:1px solid #e5e5e5;border-radius:8px;padding:0 6px;font:700 13px "JetBrains Mono",monospace;text-align:center}' +
      '.fgk-notas textarea{width:100%;box-sizing:border-box;min-height:44px;resize:vertical;border:1px solid #e5e5e5;border-radius:8px;padding:9px 10px;font:inherit;font-size:13px}' +
      '.fgk-notas .fgk-add{border:0;border-radius:8px;background:#0a0a0a;color:#fafaf7;font-weight:700;padding:0 14px;min-height:40px;cursor:pointer;margin-left:auto}' +
      '.fgk-notas .fgk-vazio{color:#a3a3a3;font-size:13px;margin:0 0 8px}';
    (document.head || document.documentElement).appendChild(s);
  }

  var ICONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/></svg>';

  /* ---------------------------------- reconhecimento ---------------------------------- */
  var ativo = null;   /* { rec, campo, botao } — um ditado por vez */

  function aviso(botao, texto) {
    var w = botao.parentNode, a = w.querySelector('.fgk-dit-aviso');
    if (!a) { a = document.createElement('div'); a.className = 'fgk-dit-aviso'; a.setAttribute('role', 'status'); w.appendChild(a); }
    a.textContent = texto;
    clearTimeout(a._t); a._t = setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 4000);
  }

  function inserir(campo, texto) {
    texto = String(texto || '').trim();
    if (!texto) return;
    var v = campo.value || '', ini = campo.selectionStart, fim = campo.selectionEnd;
    if (typeof ini !== 'number' || document.activeElement !== campo && campo._fgkCursor != null) { ini = fim = campo._fgkCursor; }
    if (typeof ini !== 'number' || ini > v.length) ini = fim = v.length;
    var antes = v.slice(0, ini), depois = v.slice(fim);
    var inicioFrase = !antes.trim() || /[.!?]\s*$/.test(antes);
    if (inicioFrase) texto = texto.charAt(0).toUpperCase() + texto.slice(1);
    var sepAntes = antes && !/\s$/.test(antes) ? ' ' : '';
    var sepDepois = depois && !/^\s/.test(depois) ? ' ' : '';
    campo.value = antes + sepAntes + texto + sepDepois + depois;
    var pos = (antes + sepAntes + texto).length;
    campo._fgkCursor = pos;
    try { campo.setSelectionRange(pos, pos); } catch (e) {}
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    campo.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function parar() {
    if (!ativo) return;
    var a = ativo; ativo = null;
    a.botao.classList.remove('on');
    a.botao.setAttribute('aria-pressed', 'false');
    a.botao.title = t('ditar');
    try { a.rec.stop(); } catch (e) {}
  }

  function comecar(campo, botao) {
    if (ativo && ativo.campo === campo) { parar(); return; }
    parar();
    var rec = new SR();
    rec.lang = IDIOMAS[lg()] || IDIOMAS[lg().slice(0, 2)] || 'pt-BR';
    rec.continuous = true;
    rec.interimResults = false;
    campo._fgkCursor = typeof campo.selectionStart === 'number' ? campo.selectionEnd : (campo.value || '').length;
    rec.onresult = function (ev) {
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) inserir(campo, ev.results[i][0].transcript);
      }
    };
    rec.onerror = function (ev) {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') aviso(botao, t('bloqueado'));
      else if (ev.error === 'network') aviso(botao, t('semRede'));
    };
    rec.onend = function () { if (ativo && ativo.rec === rec) parar(); };
    ativo = { rec: rec, campo: campo, botao: botao };
    botao.classList.add('on');
    botao.setAttribute('aria-pressed', 'true');
    botao.title = t('ouvindo');
    try { rec.start(); } catch (e) { parar(); aviso(botao, t('bloqueado')); }
  }

  /* ------------------------------------ encaixe ------------------------------------ */
  function serve(el) {
    if (!el || el._fgkDit || el.disabled || el.readOnly || !el.parentNode || el.isConnected === false) return false;
    if (el.getAttribute('data-ditado') === 'nao') return false;
    if (el.tagName === 'TEXTAREA') return true;
    return el.tagName === 'INPUT' && el.hasAttribute('data-ditado');
  }

  function encaixar(campo) {
    if (!serve(campo)) return;
    campo._fgkDit = true;
    estilo();
    var cs = g.getComputedStyle ? g.getComputedStyle(campo) : null;
    var w = document.createElement('span');
    w.className = 'fgk-dit';
    w.style.display = cs && cs.display === 'inline' ? 'inline-block' : 'block';
    if (cs && cs.flex && cs.flex !== '0 1 auto') w.style.flex = cs.flex;
    if (cs && cs.gridColumn && cs.gridColumn !== 'auto' && cs.gridColumn !== 'auto / auto') w.style.gridColumn = cs.gridColumn;
    campo.parentNode.insertBefore(w, campo);
    w.appendChild(campo);
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'fgk-mic';
    b.innerHTML = ICONE;
    b.setAttribute('aria-pressed', 'false');
    if (!SR) { b.disabled = true; b.title = t('semSuporte'); b.setAttribute('aria-label', t('semSuporte')); }
    else { b.title = t('ditar'); b.setAttribute('aria-label', t('ditar')); }
    /* guarda o cursor antes do campo perder o foco para o botão */
    b.addEventListener('mousedown', function () { campo._fgkCursor = campo.selectionEnd; });
    b.addEventListener('touchstart', function () { campo._fgkCursor = campo.selectionEnd; }, { passive: true });
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (!SR) { aviso(b, t('semSuporte')); return; }
      comecar(campo, b);
    });
    w.appendChild(b);
  }

  function anexar(raiz) {
    raiz = raiz || document;
    var lista = raiz.querySelectorAll ? raiz.querySelectorAll('textarea,input[data-ditado]') : [];
    for (var i = 0; i < lista.length; i++) encaixar(lista[i]);
    if (raiz.tagName === 'TEXTAREA' || (raiz.tagName === 'INPUT' && raiz.hasAttribute && raiz.hasAttribute('data-ditado'))) encaixar(raiz);
  }

  function vigiar() {
    anexar(document);
    if (!g.MutationObserver) return;
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var ns = muts[i].addedNodes;
        for (var j = 0; j < ns.length; j++) if (ns[j].nodeType === 1) anexar(ns[j]);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------------------------------- notas do jogo ---------------------------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function notasDoJogo(el, o) {
    estilo();
    function lista() { var n = o.notas(); return Array.isArray(n) ? n : []; }
    function desenha() {
      var n = lista().slice().sort(function (a, b) { return (a.min || 0) - (b.min || 0) || (a.em || 0) - (b.em || 0); });
      el.innerHTML = '<div class="fgk-notas"><h4>' + esc(o.titulo || t('notas')) + '</h4>' +
        (n.length ? '<ul>' + n.map(function (x) {
          return '<li><span class="fgk-min">' + esc(x.min != null ? x.min + "'" : '—') + '</span><span class="fgk-tx">' + esc(x.texto) +
            '</span><button type="button" class="fgk-del" data-em="' + esc(x.em) + '" title="' + esc(t('apagar')) + '" aria-label="' + esc(t('apagar')) + '">×</button></li>';
        }).join('') + '</ul>' : '<p class="fgk-vazio">' + esc(t('vazio')) + '</p>') +
        '<div class="fgk-row"><input type="number" min="0" max="99" inputmode="numeric" class="fgk-mn" data-ditado="nao" placeholder="' + esc(t('min')) + '" title="' + esc(t('minuto')) +
        '" aria-label="' + esc(t('minuto')) + '"><textarea rows="1" class="fgk-nova" placeholder="' + esc(t('nova')) + '"></textarea>' +
        '<button type="button" class="fgk-add">' + esc(t('add')) + '</button></div></div>';
      var ta = el.querySelector('.fgk-nova'), mn = el.querySelector('.fgk-mn');
      /* o minuto vem sugerido pelo módulo (minuto do jogo agora) e pode ser corrigido à mão */
      function sugerir() { if (mn._mexeu) return; var m = o.minuto ? o.minuto() : null; mn.value = m == null || m === '' || isNaN(Number(m)) ? '' : Number(m); }
      sugerir();
      mn.addEventListener('input', function () { mn._mexeu = true; });
      ta.addEventListener('focus', sugerir);
      encaixar(ta);
      el.querySelector('.fgk-add').onclick = function () {
        var tx = ta.value.trim(); if (!tx) return;
        if (ativo && ativo.campo === ta) parar();
        if (!mn._mexeu) sugerir();
        var m = mn.value === '' ? null : Math.max(0, parseInt(mn.value, 10) || 0);
        var nova = lista().concat([{ min: m, texto: tx, em: Date.now() }]);
        o.salvar(nova); o.foco = true; desenha(); o.foco = false;
      };
      ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.querySelector('.fgk-add').click(); } });
      if (o.foco) { try { ta.focus(); } catch (e) {} }
      Array.prototype.forEach.call(el.querySelectorAll('.fgk-del'), function (b) {
        b.onclick = function () {
          var em = Number(b.getAttribute('data-em'));
          o.salvar(lista().filter(function (x) { return Number(x.em) !== em; })); o.foco = false; desenha();
        };
      });
    }
    desenha();
    return { desenhar: desenha };
  }

  /* para os relatórios: notas ordenadas por minuto */
  function notasOrdenadas(n) {
    return (Array.isArray(n) ? n : []).slice().sort(function (a, b) { return (a.min || 0) - (b.min || 0) || (a.em || 0) - (b.em || 0); });
  }

  /* bloco HTML de relatório (PDF): notas do jogo e observações de lance. `obs` = [{rotulo, texto}].
     Vazio quando não há nada, para o relatório antigo sair igual. */
  function htmlRelatorio(notas, obs, titulos) {
    titulos = titulos || {};
    var n = notasOrdenadas(notas), o = (obs || []).filter(function (x) { return x && String(x.texto || '').trim(); });
    if (!n.length && !o.length) return '';
    var li = 'style="padding:4px 0;border-bottom:1px solid #eee;font-size:11px;line-height:1.45;list-style:none"';
    var mn = 'style="display:inline-block;min-width:44px;font-weight:700;font-family:monospace;color:#B45309"';
    var h = '<div class="fgk-rel" style="margin-top:12px;break-inside:avoid;page-break-inside:avoid">';
    if (n.length) h += '<div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#737373;margin:0 0 6px">' + esc(titulos.notas || t('notas')) +
      '</div><ul style="margin:0 0 10px;padding:0">' + n.map(function (x) {
        return '<li ' + li + '><span ' + mn + '>' + esc(x.min != null ? x.min + "'" : '—') + '</span>' + esc(x.texto) + '</li>';
      }).join('') + '</ul>';
    if (o.length) h += '<div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#737373;margin:0 0 6px">' + esc(titulos.obs || t('obs')) +
      '</div><ul style="margin:0;padding:0">' + o.map(function (x) {
        return '<li ' + li + '><span ' + mn + '>' + esc(x.rotulo || '') + '</span>' + esc(x.texto) + '</li>';
      }).join('') + '</ul>';
    return h + '</div>';
  }

  g.FluxGKDitado = { suportado: !!SR, anexar: anexar, notasDoJogo: notasDoJogo, notasOrdenadas: notasOrdenadas, htmlRelatorio: htmlRelatorio, esc: esc, t: t, parar: parar, _inserir: inserir };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vigiar); else vigiar();
})(window);
