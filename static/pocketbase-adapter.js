/* ============================================================================
 * FluxGK · fluxdb — adaptador drop-in com a MESMA superfície do Firebase
 * compat 9.x (app + auth + database), implementado sobre PocketBase.
 *
 * Como usar na página (substitui as três tags do gstatic):
 *   <script src="/static/pocketbase-adapter.js"></script>
 *   ... e no código, trocar o prefixo `firebase.` por `fluxdb.`
 *
 * MODELO DE DADOS — decisão e justificativa
 * -----------------------------------------
 * Uma coleção genérica `nodes`:
 *   { owner (relation users), path (text), data (json) }  — índice único (owner, path)
 *
 * Cada ESCRITA grava UM nó no caminho escrito e apaga os nós descendentes
 * (o valor escrito passa a ser a verdade dali para baixo). Leitura e escrita
 * trabalham sobre uma CÓPIA LOCAL dos nós do usuário (ver "cópia local"),
 * como o Firebase fazia. Cada LEITURA de um caminho P resolve em três camadas:
 *   1) nó ANCESTRAL (gravaram users/x e eu leio users/x/a/b) → desce no JSON
 *   2) nó EXATO em P
 *   3) nós DESCENDENTES de P → sobrepostos na árvore montada
 *
 * Por que não um nó por folha: as páginas gravam objetos inteiros
 * (ex.: set(_SPATH.games, {id:{...}})) e leem subárvores inteiras
 * (ex.: ref('users/'+uid+'/clubs').get()). Guardar o objeto no caminho escrito
 * mantém "1 escrita = 1 requisição" e a resolução ancestral/descendente dá a
 * semântica de árvore do Realtime Database sem explodir em milhares de linhas.
 *
 * LIMITES CONHECIDOS (documentados, não escondidos)
 *   - setPersistence(SESSION) é aproximado: o authStore do PocketBase usa
 *     localStorage. O modo SESSION limpa a sessão ao fechar a aba via flag.
 *   - orderByChild/limitTo/transaction/onDisconnect NÃO são implementados:
 *     não há uso deles no repositório (conferido por grep).
 *   - '.info/connected' é emitido como true quando o PocketBase responde ao
 *     /api/health e false quando falha.
 * ========================================================================== */
(function (global) {
  'use strict';

  var PB_SDK_URL = global.FLUXGK_PB_SDK || '/static/vendor/pocketbase.umd.js';
  var PB_URL     = global.FLUXGK_PB_URL || '';      /* '' = mesma origem; o nginx proxeia /api/ */
  var NODES      = 'nodes';
  var DEBUG      = !!global.FLUXGK_DEBUG;

  function dbg() {
    if (!DEBUG) return;
    try { console.log.apply(console, ['[fluxdb]'].concat([].slice.call(arguments))); } catch (e) {}
  }

  /* ---------------------------- caminhos / árvore --------------------------- */
  function clean(p) { return String(p == null ? '' : p).replace(/^\/+|\/+$/g, ''); }
  function parts(p) { var c = clean(p); return c ? c.split('/') : []; }
  function esc(s)   { return String(s).replace(/"/g, '\\"'); }
  function isDesc(child, parent) { return parent === '' ? child !== '' : child.indexOf(parent + '/') === 0; }
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  function deepGet(obj, ks) {
    var cur = obj;
    for (var i = 0; i < ks.length; i++) {
      if (cur === null || typeof cur !== 'object') return undefined;
      cur = cur[ks[i]];
      if (cur === undefined) return undefined;
    }
    return cur;
  }

  function deepSet(obj, ks, val) {
    var cur = obj;
    for (var i = 0; i < ks.length - 1; i++) {
      var k = ks[i];
      if (cur[k] === null || typeof cur[k] !== 'object') cur[k] = {};
      cur = cur[k];
    }
    var last = ks[ks.length - 1];
    if (val === null || val === undefined) delete cur[last];
    else cur[last] = val;
    return obj;
  }

  /* ------------------------------ SDK PocketBase ---------------------------- */
  var _sdk = null;
  function loadSdk() {
    if (_sdk) return _sdk;
    _sdk = new Promise(function (res, rej) {
      if (global.PocketBase) return res(global.PocketBase);
      var s = document.createElement('script');
      s.src = PB_SDK_URL;
      s.onload = function () {
        if (global.PocketBase) res(global.PocketBase);
        else rej(new Error('SDK carregou mas não expôs window.PocketBase'));
      };
      s.onerror = function () { rej(new Error('falhou ao carregar ' + PB_SDK_URL)); };
      document.head.appendChild(s);
    });
    return _sdk;
  }

  var pb = null;
  var _ready = null;

  function ready() {
    if (_ready) return _ready;
    _ready = loadSdk().then(function (PB) {
      pb = new PB(PB_URL || window.location.origin);
      if (pb.authStore.isValid) {
        return pb.collection('users').authRefresh({ requestKey: null })
          .then(function () { return pb; })
          .catch(function () { pb.authStore.clear(); return pb; });
      }
      return pb;
    });
    return _ready;
  }

  function uid() {
    var m = pb && pb.authStore && pb.authStore.model;
    return m ? m.id : null;
  }

  /* --------------------------------- snapshot ------------------------------- */
  function Snapshot(path, value) {
    var key = parts(path).pop() || null;
    return {
      key: key,
      ref: { path: clean(path) },
      val: function () { return value === undefined ? null : value; },
      exists: function () { return value !== undefined && value !== null; },
      numChildren: function () {
        return (value && typeof value === 'object') ? Object.keys(value).length : 0;
      },
      child: function (p) {
        return Snapshot(clean(path) + '/' + clean(p), deepGet(value, parts(p)));
      },
      hasChild: function (p) { return deepGet(value, parts(p)) !== undefined; },
      forEach: function (fn) {
        if (!value || typeof value !== 'object') return false;
        var ks = Object.keys(value), stop = false;
        for (var i = 0; i < ks.length && !stop; i++) {
          stop = fn(Snapshot(clean(path) + '/' + ks[i], value[ks[i]])) === true;
        }
        return stop;
      }
    };
  }

  /* --------------------------- cópia local (cache) ---------------------------
   * O Firebase guardava uma cópia local dos dados e lia dela. A versão 1.0
   * deste adaptador ia à rede em tudo: cada item salvo custava 4 viagens (lê
   * antes de gravar, grava, relê a lista pela própria gravação e relê de novo
   * pelo eco do tempo real). Salvar 150 sessões = 602 requisições, 30 s.
   *
   * Agora: ao entrar, UMA leitura baixa todos os nós do usuário para `cache`
   * (caminho → R). Leitura sai do cache, sem rede. Escrita muda o cache na hora,
   * avisa os listeners e manda UMA requisição por nó tocado. O eco do tempo
   * real da própria gravação é reconhecido e descartado; mudança vinda de outro
   * aparelho entra no cache e avisa os listeners.
   *
   * R = { path, id, v, updated, gone, inflight, chain, queued }
   *   id       → id do registro no PocketBase (null enquanto o create não volta)
   *   gone     → apagado aqui; fica como lápide enquanto houver viagem em voo,
   *              para o eco de uma gravação anterior não ressuscitar o nó
   *   chain    → fila das viagens deste nó (create → update → delete em ordem)
   *   queued   → viagem enfileirada que ainda não saiu: gravações seguidas no
   *              mesmo nó pegam carona nela e saem numa requisição só
   * ------------------------------------------------------------------------ */
  var cache = null;            /* Map caminho → R, do usuário cacheUid */
  var cacheUid = null;
  var _loading = null;
  var pendingEvents = null;    /* eventos que chegaram durante a carga */
  var deletedIds = {};         /* ids apagados por nós: eco atrasado não volta */
  var stats = { requests: 0 };

  function newRec(p) {
    return { path: p, id: null, v: undefined, updated: '', gone: false, inflight: 0, chain: Promise.resolve(), queued: null };
  }

  function unwrap(rec) { return rec && rec.data ? rec.data.v : undefined; }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  function loadCache() {
    return ready().then(function () {
      var u = uid();
      if (!u) { cache = null; cacheUid = null; _loading = null; return null; }
      if (cacheUid === u && _loading) return _loading;
      cacheUid = u; cache = null; pendingEvents = []; deletedIds = {};
      var my = _loading = ensureSubscription().then(function () {
        stats.requests++;
        return pb.collection(NODES).getFullList({ batch: 500, filter: 'owner="' + esc(u) + '"', requestKey: null });
      }).then(function (recs) {
        if (_loading !== my) return null;                  /* trocou de usuário no meio */
        var m = new Map();
        recs.forEach(function (r) {
          var R = newRec(clean(r.path));
          R.id = r.id; R.v = unwrap(r); R.updated = r.updated || '';
          m.set(R.path, R);
        });
        cache = m;
        var q = pendingEvents || []; pendingEvents = null;
        q.forEach(applyEvent);
        listeners.slice().forEach(function (L) { emit(L, false); });
        return null;
      });
      my.catch(function () { if (_loading === my) { _loading = null; cacheUid = null; } });
      return my;
    });
  }

  function dropCache() {
    cache = null; cacheUid = null; _loading = null; pendingEvents = null; deletedIds = {};
  }

  /* Viagem que deixa o servidor igual ao cache neste nó. Lê o estado NA HORA
     de sair, por isso quem chega enquanto ela espera na fila pega carona. */
  function sync(R) {
    if (R.queued) return R.queued;
    R.inflight++;
    var run = R.chain.then(function () {
      R.queued = null;
      var col = pb.collection(NODES);
      if (R.gone) {
        if (!R.id) return null;
        var id = R.id;
        stats.requests++;
        return col.delete(id, { requestKey: null }).then(function () {
          deletedIds[id] = 1; R.id = null; R.updated = '';
        }, function (e) {
          if (e && e.status === 404) { deletedIds[id] = 1; R.id = null; return; }
          throw e;
        });
      }
      var body = { data: { v: R.v } };
      stats.requests++;
      var req = R.id
        ? col.update(R.id, body, { requestKey: null })
        : col.create({ owner: cacheUid, path: R.path, data: body.data }, { requestKey: null }).catch(function (e) {
            /* o nó já existe no servidor sem o cache saber (gravado por outro
               aparelho com o tempo real fora): acha e atualiza */
            if (!e || e.status !== 400) throw e;
            stats.requests += 2;
            return col.getFirstListItem('owner="' + esc(cacheUid) + '" && path="' + esc(R.path) + '"', { requestKey: null })
              .then(function (rec) { return col.update(rec.id, body, { requestKey: null }); });
          });
      return req.then(function (rec) {
        R.id = rec.id;
        if (!R.updated || (rec.updated || '') > R.updated) R.updated = rec.updated || '';
      });
    });
    R.queued = run;
    R.chain = run.catch(function () {});
    function done() {
      R.inflight--;
      if (R.gone && !R.inflight && cache && cache.get(R.path) === R) cache.delete(R.path);
    }
    return run.then(function () { done(); return null; }, function (e) {
      done();
      console.warn('[fluxdb] gravação falhou em', R.path, e && e.message);
      resync();
      throw e;
    });
  }

  /* Gravação falhou: o cache pode estar à frente do servidor. Rebaixa tudo. */
  var _resyncT = null;
  function resync() {
    if (_resyncT) return;
    _resyncT = setTimeout(function () {
      _resyncT = null;
      if (!cacheUid) return;
      _loading = null; cacheUid = null;
      loadCache().catch(function (e) { console.warn('[fluxdb] recarga falhou:', e && e.message); });
    }, 300);
  }

  function resolve(path) {
    var p = clean(path), value;
    if (!cache) return undefined;
    var anc = null, exact = null, desc = [];
    cache.forEach(function (R, rp) {
      if (R.gone) return;
      if (rp === p) exact = R;
      else if (isDesc(p, rp)) { if (!anc || anc.path.length < rp.length) anc = R; }
      else if (isDesc(rp, p)) desc.push(R);
    });

    /* 1) ancestral mais profundo que contenha o caminho */
    if (anc) value = clone(deepGet(anc.v, parts(p).slice(parts(anc.path).length)));
    /* 2) nó exato */
    if (exact) value = clone(exact.v);
    /* 3) descendentes sobrepostos */
    if (desc.length) {
      if (value === undefined || value === null || typeof value !== 'object') value = {};
      desc.sort(function (a, b) { return a.path.length - b.path.length; }).forEach(function (R) {
        if (R.v === undefined) return;
        deepSet(value, parts(R.path).slice(parts(p).length), clone(R.v));
      });
    }
    return value;
  }

  function readPath(path) {
    return loadCache().then(function () { return Snapshot(path, resolve(path)); });
  }

  /* --------------------------------- escrita -------------------------------- */
  function writePath(path, value) {
    var p = clean(path);
    if (!p) return Promise.reject(new Error('fluxdb: set na raiz não é permitido'));

    return loadCache().then(function () {
      if (!cache) throw new Error('fluxdb: escrita sem usuário logado');
      var v = (value === undefined || value === null) ? null : clone(value);
      var exact = null, anc = null, desc = [];
      cache.forEach(function (R, rp) {
        if (R.gone) return;
        if (rp === p) exact = R;
        else if (isDesc(p, rp)) { if (!anc || anc.path.length < rp.length) anc = R; }
        else if (isDesc(rp, p)) desc.push(R);
      });

      /* o valor escrito passa a ser a verdade dali para baixo */
      var jobs = desc.map(function (R) { R.gone = true; R.v = undefined; return sync(R); });

      if (anc && !exact) {
        /* o valor vive dentro de um ancestral: edita o JSON do ancestral */
        var base = (anc.v !== null && typeof anc.v === 'object') ? anc.v : {};
        deepSet(base, parts(p).slice(parts(anc.path).length), v);
        anc.v = base;
        jobs.push(sync(anc));
      } else if (v === null) {
        if (exact) { exact.gone = true; exact.v = undefined; jobs.push(sync(exact)); }
      } else {
        var R = exact || cache.get(p);                    /* pode ser uma lápide */
        if (!R) { R = newRec(p); cache.set(p, R); }
        R.gone = false; R.v = v;
        jobs.push(sync(R));
      }
      notify(p);
      return Promise.all(jobs);
    }).then(function () { return null; });
  }

  function updatePath(path, obj) {
    var p = clean(path);
    if (!obj || typeof obj !== 'object') return Promise.reject(new Error('fluxdb: update exige um objeto'));
    /* Firebase: update com chaves que são caminhos faz fan-out multi-local.
       Todas no mesmo tique: as que caem no mesmo nó saem numa viagem só. */
    return Promise.all(Object.keys(obj).map(function (k) {
      return writePath(p ? p + '/' + clean(k) : clean(k), obj[k]);
    })).then(function () { return null; });
  }

  function removePath(path) { return writePath(path, null); }

  function pushId() {
    var abc = 'abcdefghijklmnopqrstuvwxyz0123456789', out = '';
    for (var i = 0; i < 15; i++) out += abc.charAt(Math.floor(Math.random() * abc.length));
    return out;
  }

  /* -------------------------- escuta em tempo real -------------------------- */
  var listeners = [];          /* {path, event, cb, err, last} */
  var subscribed = false;

  function ensureSubscription() {
    if (subscribed || !uid()) return Promise.resolve();
    subscribed = true;
    return ready().then(function () {
      return pb.collection(NODES).subscribe('*', onRealtime);
    }).catch(function (err) {
      subscribed = false;
      console.warn('[fluxdb] tempo real indisponível:', err && err.message);
    });
  }

  function onRealtime(e) {
    if (!e || !e.record) return;
    if (pendingEvents) { pendingEvents.push(e); return; }
    applyEvent(e);
  }

  function applyEvent(e) {
    if (!cache) return;
    var r = e.record, p = clean(r.path);
    if (r.owner && r.owner !== cacheUid) return;
    var R = cache.get(p);

    if (e.action === 'delete') {
      if (!R || R.inflight || (R.id && R.id !== r.id)) return;    /* já apagado, ou gravação nossa em voo */
      cache.delete(p);
      notify(p);
      return;
    }

    if (deletedIds[r.id]) return;                                  /* eco atrasado de algo que apagamos */
    if (R) {
      if (R.inflight) return;                                      /* a resposta da nossa viagem é a verdade */
      if (R.updated && (r.updated || '') <= R.updated) return;     /* eco da própria gravação, ou evento velho */
      R.id = r.id; R.updated = r.updated || '';
      var nv = unwrap(r);
      if (!R.gone && same(R.v, nv)) return;
      R.gone = false; R.v = nv;
      notify(p);
      return;
    }
    R = newRec(p);                                                 /* nó novo, de outro aparelho */
    R.id = r.id; R.v = unwrap(r); R.updated = r.updated || '';
    cache.set(p, R);
    notify(p);
  }

  /* Avisos agrupados: 150 gravações no mesmo tique acordam cada listener uma
     vez, e só se o valor que ele enxerga mudou de fato. */
  var dirty = [];
  var _flushT = null;

  function notify(changedPath) {
    dirty.push(clean(changedPath));
    if (!_flushT) _flushT = setTimeout(flush, 0);
  }

  function flush() {
    _flushT = null;
    var ps = dirty; dirty = [];
    listeners.slice().forEach(function (L) {
      if (L.path === '.info/connected') return;
      for (var i = 0; i < ps.length; i++) {
        var cp = ps[i];
        if (cp === L.path || isDesc(cp, L.path) || isDesc(L.path, cp)) { emit(L, false); return; }
      }
    });
  }

  function emit(L, force) {
    /* o Firebase NUNCA chama o callback depois do off: quem saiu da lista não
       é mais avisado. Capturado pelo teste de fumaça. */
    if (listeners.indexOf(L) < 0) return;
    var val = resolve(L.path);
    var key = JSON.stringify(val === undefined ? null : val);
    if (!force && key === L.last) return;
    L.last = key;
    try { L.cb(Snapshot(L.path, val)); } catch (e) { console.error('[fluxdb] listener falhou:', e); }
  }

  /* --------------------------- conexão (.info) ------------------------------ */
  var connCbs = [];
  var connState = null;

  function pingConnection() {
    var url = (PB_URL || '') + '/api/health';
    return fetch(url, { method: 'GET' }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }

  function startConnWatch() {
    if (connState !== null) return;
    connState = false;
    var tick = function () {
      pingConnection().then(function (ok) {
        if (ok !== connState) {
          connState = ok;
          connCbs.slice().forEach(function (cb) {
            try { cb(Snapshot('.info/connected', ok)); } catch (e) {}
          });
        }
      });
    };
    tick();
    setInterval(tick, 20000);
  }

  /* ---------------------------------- ref ----------------------------------- */
  function makeRef(path) {
    var p = clean(path);

    var ref = {
      key: parts(p).pop() || null,
      path: p,
      toString: function () { return p; },

      child: function (c) { return makeRef(p ? p + '/' + clean(c) : clean(c)); },
      parent: function () { var ps = parts(p); ps.pop(); return makeRef(ps.join('/')); },

      get: function () { return readPath(p); },
      once: function (event) {
        if (event && event !== 'value') console.warn('[fluxdb] once("' + event + '") não suportado; tratando como value');
        return readPath(p);
      },

      set: function (v) { return writePath(p, v); },
      update: function (o) { return updatePath(p, o); },
      remove: function () { return removePath(p); },

      push: function (v) {
        var id = pushId(), child = makeRef(p + '/' + id);
        var done = (v === undefined) ? Promise.resolve() : writePath(child.path, v);
        var out = done.then(function () { return child; });
        out.key = id; out.ref = child; out.path = child.path;
        out.then = out.then.bind(out);
        return out;
      },

      /* Firebase devolve o PRÓPRIO callback, e é isso que as páginas guardam
         para chamar off('value', h) depois (mod_profile faz exatamente isso). */
      on: function (event, cb, errCb) {
        if (event !== 'value') {
          console.warn('[fluxdb] on("' + event + '") não suportado; use value');
          return cb;
        }
        if (p === '.info/connected') {
          connCbs.push(cb);
          startConnWatch();
          if (connState !== null) { try { cb(Snapshot(p, connState)); } catch (e) {} }
          return cb;
        }
        var L = { path: p, event: event, cb: cb, last: undefined };
        listeners.push(L);
        /* a carga, ao terminar, já avisa quem estava esperando: não repete */
        loadCache().then(function () { if (L.last === undefined) emit(L, true); }, function (e) {
          listeners = listeners.filter(function (x) { return x !== L; });
          if (typeof errCb === 'function') { try { errCb(e); } catch (x) {} }
          else console.warn('[fluxdb] leitura falhou em', p, e && e.message);
        });
        return cb;
      },

      off: function (event, cb) {
        if (p === '.info/connected') {
          connCbs = cb ? connCbs.filter(function (c) { return c !== cb; }) : [];
          return;
        }
        listeners = listeners.filter(function (L) {
          if (L.path !== p) return true;
          if (cb && L.cb !== cb) return true;
          return false;
        });
      },

      /* consultas não usadas no repositório — falham alto em vez de mentir */
      orderByChild: function () { throw new Error('fluxdb: orderByChild não implementado'); },
      limitToLast:  function () { throw new Error('fluxdb: limitToLast não implementado'); },
      transaction:  function () { throw new Error('fluxdb: transaction não implementado'); },
      onDisconnect: function () { throw new Error('fluxdb: onDisconnect não implementado'); }
    };
    return ref;
  }

  /* ---------------------------------- auth ---------------------------------- */
  var authCbs = [];
  var persistence = 'local';

  function pubUser() {
    var m = pb && pb.authStore && pb.authStore.model;
    if (!m) return null;
    return { uid: m.id, id: m.id, email: m.email || '', emailVerified: !!m.verified, displayName: m.name || '' };
  }

  function fireAuth() {
    var u = pubUser();
    authCbs.slice().forEach(function (cb) { try { cb(u); } catch (e) { console.error('[fluxdb] onAuthStateChanged:', e); } });
  }

  function mapAuthError(e) {
    var err = new Error((e && e.message) || 'falha de autenticação');
    var st = e && e.status;
    if (st === 400) err.code = 'auth/invalid-credential';
    else if (st === 403) err.code = 'auth/too-many-requests';
    else err.code = 'auth/internal-error';
    return err;
  }

  var authApi = {
    get currentUser() { return pubUser(); },

    setPersistence: function (mode) {
      persistence = mode || 'local';
      return ready().then(function () {
        if (persistence === 'session') {
          try { sessionStorage.setItem('fluxdb_session_only', '1'); } catch (e) {}
        } else {
          try { sessionStorage.removeItem('fluxdb_session_only'); } catch (e) {}
        }
        return null;
      });
    },

    signInWithEmailAndPassword: function (email, password) {
      return ready().then(function () {
        try { pb.collection(NODES).unsubscribe(); } catch (e) {}
        subscribed = false;
        dropCache();
        return pb.collection('users').authWithPassword(String(email).trim(), String(password), { requestKey: null });
      }).then(function () {
        /* a carga não segura o login: quem ler espera por ela */
        loadCache().catch(function (e) { console.warn('[fluxdb] carga inicial falhou:', e && e.message); });
        fireAuth();
        return { user: pubUser() };
      }).catch(function (e) { throw mapAuthError(e); });
    },

    /* Login com provedor OAuth2 (feature 001: Google). Abre a janela do provedor; a conta nova nasce aqui. */
    signInWithProvider: function (provider) {
      return ready().then(function () {
        try { pb.collection(NODES).unsubscribe(); } catch (e) {}
        subscribed = false;
        dropCache();
        return pb.collection('users').authWithOAuth2({ provider: String(provider || 'google') });
      }).then(function () {
        loadCache().catch(function (e) { console.warn('[fluxdb] carga inicial falhou:', e && e.message); });
        fireAuth();
        return { user: pubUser() };
      }).catch(function (e) { throw mapAuthError(e); });
    },

    /* Relê a conta no servidor (plano, módulos, vencimento) sem trocar de usuário. */
    refreshAccount: function () {
      return ready().then(function () {
        if (!pb.authStore.isValid) return null;
        return pb.collection('users').authRefresh({ requestKey: null }).then(function (r) { return r && r.record; });
      });
    },

    createUserWithEmailAndPassword: function (email, password, extra) {
      return ready().then(function () {
        var data = { email: String(email).trim(), password: String(password), passwordConfirm: String(password) };
        if (extra) for (var k in extra) data[k] = extra[k];
        return pb.collection('users').create(data, { requestKey: null });
      }).then(function () {
        return authApi.signInWithEmailAndPassword(email, password);
      }).catch(function (e) { throw mapAuthError(e); });
    },

    signOut: function () {
      return ready().then(function () {
        try { pb.collection(NODES).unsubscribe(); } catch (e) {}
        subscribed = false;
        listeners = [];
        dropCache();
        pb.authStore.clear();
        fireAuth();
        return null;
      });
    },

    onAuthStateChanged: function (cb) {
      authCbs.push(cb);
      ready().then(function () {
        if (uid()) loadCache().catch(function () {});
        try { cb(pubUser()); } catch (e) { console.error('[fluxdb] onAuthStateChanged:', e); }
      });
      return function () { authCbs = authCbs.filter(function (c) { return c !== cb; }); };
    },

    /* Reset de senha é feito pelo administrador no painel do PocketBase (/_/).
       Sem SMTP configurado, isto falha de propósito em vez de prometer e-mail. */
    sendPasswordResetEmail: function () {
      return Promise.reject(new Error('fluxdb: reset de senha é feito pelo administrador no painel do PocketBase (/_/)'));
    }
  };

  /* auth é FUNÇÃO (fluxdb.auth()) e também carrega auth.Auth.Persistence,
     porque index.html usa fluxdb.auth.Auth.Persistence.LOCAL/SESSION. */
  function authFn() { return authApi; }
  authFn.Auth = { Persistence: { LOCAL: 'local', SESSION: 'session', NONE: 'none' } };

  /* ---------------------------- app / database ------------------------------ */
  var dbApi = {
    ref: function (path) { return makeRef(path); },
    refFromURL: function (url) { return makeRef(String(url).replace(/^https?:\/\/[^/]+\/?/, '')); },
    goOnline: function () {}, goOffline: function () {},
    ServerValue: { TIMESTAMP: { '.sv': 'timestamp' } }
  };

  var appObj = { name: '[DEFAULT]', options: {}, auth: authFn, database: function () { return dbApi; } };
  var apps = [];

  function initializeApp(config) {
    appObj.options = config || {};
    if (!apps.length) apps.push(appObj);
    ready();
    return appObj;
  }

  /* ------------------------- fachada modular (v10) --------------------------
     mod_data.html usa o SDK MODULAR: initializeApp / getAuth / getDatabase /
     ref(db,path) / set / update / remove / get / onValue. A troca de prefixo
     não cobre isso, então o adaptador expõe a mesma fachada. */
  var modular = {
    initializeApp: initializeApp,
    getAuth: function () { return authApi; },
    getDatabase: function () { return dbApi; },
    ref: function (_db, path) { return makeRef(path); },
    child: function (r, p) { return r.child(p); },
    set: function (r, v) { return r.set(v); },
    update: function (r, o) { return r.update(o); },
    remove: function (r) { return r.remove(); },
    get: function (r) { return r.get(); },
    push: function (r, v) { return r.push(v); },
    onValue: function (r, cb) { var h = r.on('value', cb); return function () { r.off('value', h); }; },
    off: function (r, _e, cb) { return r.off('value', cb); },
    onAuthStateChanged: function (_a, cb) { return authApi.onAuthStateChanged(cb); },
    signInWithEmailAndPassword: function (_a, e, p) { return authApi.signInWithEmailAndPassword(e, p); },
    signOut: function () { return authApi.signOut(); },
    serverTimestamp: function () { return { '.sv': 'timestamp' }; }
  };

  /* --------------------------------- fachada -------------------------------- */
  var fluxdb = {
    initializeApp: initializeApp,
    app: function () { return appObj; },
    get apps() { return apps; },
    auth: authFn,
    database: function () { return dbApi; },
    modular: modular,
    /* utilidades próprias, úteis ao teste de fumaça */
    _internal: {
      ready: ready, uid: uid, readPath: readPath, writePath: writePath, pb: function () { return pb; },
      stats: stats, pending: function () {
        var n = 0; if (cache) cache.forEach(function (R) { n += R.inflight; }); return n;
      }
    },
    SDK: 'fluxdb/1.1 (PocketBase, cópia local)'
  };

  fluxdb.database.ServerValue = dbApi.ServerValue;

  global.fluxdb = fluxdb;
  if (typeof module !== 'undefined' && module.exports) module.exports = fluxdb;
  dbg('carregado', fluxdb.SDK);
})(typeof window !== 'undefined' ? window : globalThis);
