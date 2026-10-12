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
 * (o valor escrito passa a ser a verdade dali para baixo). Cada LEITURA de um
 * caminho P resolve em três camadas:
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
        return pb.collection('users').authRefresh()
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

  /* ------------------------------ acesso aos nós ---------------------------- */
  function filterFor(path) {
    var p = clean(path), owner = 'owner="' + esc(uid()) + '"';
    if (p === '') return owner;
    var ps = parts(p), ors = [], acc = [];
    for (var i = 0; i < ps.length - 1; i++) {          /* ancestrais */
      acc.push(ps[i]);
      ors.push('path="' + esc(acc.join('/')) + '"');
    }
    ors.push('path="' + esc(p) + '"');                  /* exato */
    ors.push('path~"' + esc(p) + '/"');                 /* descendentes (~ é LIKE) */
    return owner + ' && (' + ors.join(' || ') + ')';
  }

  function fetchRelated(path) {
    return ready().then(function () {
      if (!uid()) return [];
      return pb.collection(NODES).getFullList({ batch: 500, filter: filterFor(path) });
    }).then(function (recs) {
      var p = clean(path);
      return recs.filter(function (r) {
        var rp = clean(r.path);
        return rp === p || isDesc(rp, p) || isDesc(p, rp);
      });
    });
  }

  function unwrap(rec) { return rec && rec.data ? rec.data.v : undefined; }

  function resolve(path, recs) {
    var p = clean(path), value;

    /* 1) ancestral mais profundo que contenha o caminho */
    var anc = null;
    recs.forEach(function (r) {
      var rp = clean(r.path);
      if (isDesc(p, rp) && (!anc || clean(anc.path).length < rp.length)) anc = r;
    });
    if (anc) {
      var rest = parts(p).slice(parts(anc.path).length);
      value = clone(deepGet(unwrap(anc), rest));
    }

    /* 2) nó exato */
    recs.forEach(function (r) {
      if (clean(r.path) === p) value = clone(unwrap(r));
    });

    /* 3) descendentes sobrepostos */
    var desc = recs.filter(function (r) { return isDesc(clean(r.path), p); })
                   .sort(function (a, b) { return clean(a.path).length - clean(b.path).length; });
    if (desc.length) {
      if (value === undefined || value === null || typeof value !== 'object') value = {};
      desc.forEach(function (r) {
        var rest = parts(clean(r.path)).slice(parts(p).length);
        var v = clone(unwrap(r));
        if (v === undefined) return;
        deepSet(value, rest, v);
      });
    }
    return value;
  }

  function readPath(path) {
    return fetchRelated(path).then(function (recs) {
      return Snapshot(path, resolve(path, recs));
    });
  }

  /* --------------------------------- escrita -------------------------------- */
  function writePath(path, value) {
    var p = clean(path);
    if (!p) return Promise.reject(new Error('fluxdb: set na raiz não é permitido'));

    return fetchRelated(p).then(function (recs) {
      var exact = null, anc = null, desc = [];
      recs.forEach(function (r) {
        var rp = clean(r.path);
        if (rp === p) exact = r;
        else if (isDesc(p, rp) && (!anc || clean(anc.path).length < rp.length)) anc = r;
        else if (isDesc(rp, p)) desc.push(r);
      });

      var jobs = desc.map(function (r) { return pb.collection(NODES).delete(r.id); });

      /* o valor vive dentro de um ancestral: edita o JSON do ancestral */
      if (anc && !exact) {
        var base = clone(unwrap(anc));
        if (base === null || typeof base !== 'object') base = {};
        deepSet(base, parts(p).slice(parts(anc.path).length), value === undefined ? null : value);
        jobs.push(pb.collection(NODES).update(anc.id, { data: { v: base } }));
        return Promise.all(jobs);
      }

      if (value === null || value === undefined) {
        if (exact) jobs.push(pb.collection(NODES).delete(exact.id));
        return Promise.all(jobs);
      }

      if (exact) jobs.push(pb.collection(NODES).update(exact.id, { data: { v: value } }));
      else jobs.push(pb.collection(NODES).create({ owner: uid(), path: p, data: { v: value } }));
      return Promise.all(jobs);
    }).then(function () { notify(p); return null; });
  }

  function updatePath(path, obj) {
    var p = clean(path);
    if (!obj || typeof obj !== 'object') return Promise.reject(new Error('fluxdb: update exige um objeto'));
    var ks = Object.keys(obj);
    /* Firebase: update com chaves que são caminhos faz fan-out multi-local */
    return ks.reduce(function (chain, k) {
      return chain.then(function () {
        var target = p ? p + '/' + clean(k) : clean(k);
        return writePath(target, obj[k]);
      });
    }, Promise.resolve()).then(function () { return null; });
  }

  function removePath(path) { return writePath(path, null); }

  function pushId() {
    var abc = 'abcdefghijklmnopqrstuvwxyz0123456789', out = '';
    for (var i = 0; i < 15; i++) out += abc.charAt(Math.floor(Math.random() * abc.length));
    return out;
  }

  /* -------------------------- escuta em tempo real -------------------------- */
  var listeners = [];          /* {path, event, cb} */
  var subscribed = false;

  function ensureSubscription() {
    if (subscribed || !uid()) return Promise.resolve();
    subscribed = true;
    return ready().then(function () {
      return pb.collection(NODES).subscribe('*', function (e) {
        if (!e || !e.record) return;
        notify(clean(e.record.path));
      });
    }).catch(function (err) {
      subscribed = false;
      console.warn('[fluxdb] tempo real indisponível:', err && err.message);
    });
  }

  function emit(L) {
    readPath(L.path).then(function (snap) {
      try { L.cb(snap); } catch (e) { console.error('[fluxdb] listener falhou:', e); }
    }).catch(function (e) { console.warn('[fluxdb] leitura falhou em', L.path, e && e.message); });
  }

  function notify(changedPath) {
    var cp = clean(changedPath);
    listeners.slice().forEach(function (L) {
      if (L.path === '.info/connected') return;
      if (cp === L.path || isDesc(cp, L.path) || isDesc(L.path, cp)) emit(L);
    });
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
      on: function (event, cb) {
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
        var L = { path: p, event: event, cb: cb };
        listeners.push(L);
        ensureSubscription().then(function () { emit(L); });
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
        return pb.collection('users').authWithPassword(String(email).trim(), String(password));
      }).then(function () {
        subscribed = false;
        return ensureSubscription();
      }).then(function () {
        fireAuth();
        return { user: pubUser() };
      }).catch(function (e) { throw mapAuthError(e); });
    },

    createUserWithEmailAndPassword: function (email, password, extra) {
      return ready().then(function () {
        var data = { email: String(email).trim(), password: String(password), passwordConfirm: String(password) };
        if (extra) for (var k in extra) data[k] = extra[k];
        return pb.collection('users').create(data);
      }).then(function () {
        return authApi.signInWithEmailAndPassword(email, password);
      }).catch(function (e) { throw mapAuthError(e); });
    },

    signOut: function () {
      return ready().then(function () {
        try { pb.collection(NODES).unsubscribe(); } catch (e) {}
        subscribed = false;
        listeners = [];
        pb.authStore.clear();
        fireAuth();
        return null;
      });
    },

    onAuthStateChanged: function (cb) {
      authCbs.push(cb);
      ready().then(function () {
        if (uid()) ensureSubscription();
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
    _internal: { ready: ready, uid: uid, readPath: readPath, writePath: writePath, pb: function () { return pb; } },
    SDK: 'fluxdb/1.0 (PocketBase)'
  };

  fluxdb.database.ServerValue = dbApi.ServerValue;

  global.fluxdb = fluxdb;
  if (typeof module !== 'undefined' && module.exports) module.exports = fluxdb;
  dbg('carregado', fluxdb.SDK);
})(typeof window !== 'undefined' ? window : globalThis);
