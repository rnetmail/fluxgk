# Adaptador fluxdb, Contratos

> Superfície pública do global `window.fluxdb` (`static/pocketbase-adapter.js`). É o contrato que qualquer reescrita
> — em JavaScript ou Rust/WebAssembly — precisa preservar para as 12 páginas continuarem funcionando sem mudança.
> Identificação: `fluxdb.SDK === 'fluxdb/1.1 (PocketBase, cópia local)'` (commit `e1dc8c7`, 13/10/2026). A superfície é
> a mesma da 1.0; o que mudou foi o comportamento por trás (cópia local), marcado com **(1.1)**. 🟢

## 1. Raiz

| Membro | Tipo | Comportamento | Confiança |
|---|---|---|---|
| `initializeApp(config)` | `(object) → App` | guarda `config` em `app.options`; registra o app padrão uma vez; dispara `ready()` | 🟢 |
| `apps` | `App[]` (getter) | vazio até o primeiro `initializeApp` — as páginas testam `!fluxdb.apps.length` | 🟢 |
| `app()` | `() → App` | `{name:'[DEFAULT]', options, auth, database}` | 🟢 |
| `auth` | `() → Auth` **e** `auth.Auth.Persistence = {LOCAL:'local', SESSION:'session', NONE:'none'}` | | 🟢 |
| `database()` | `() → Database` | | 🟢 |
| `database.ServerValue` | `{TIMESTAMP: {'.sv':'timestamp'}}` | gravado literal (não resolvido) | 🟢 |
| `modular` | objeto | fachada v10 (seção 5) | 🟢 |
| `_internal` | `{ready, uid, readPath, writePath, pb, stats, pending}` | uso do teste de fumaça e do hub (`pb()` para as rotas `/api/fluxgk/*`); `stats.requests` conta requisições, `pending()` as viagens em voo **(1.1)** | 🟢 |
| `SDK` | `string` | identificação | 🟢 |

## 2. Auth

| Membro | Assinatura | Resultado | Erros |
|---|---|---|---|
| `currentUser` | getter | `{uid, id, email, emailVerified, displayName} \| null` | — |
| `setPersistence(mode)` | `('local'\|'session'\|'none') → Promise<null>` | 🟢 hoje só grava a marca `fluxdb_session_only` (sem efeito) | — |
| `signInWithEmailAndPassword(email, senha)` | `→ Promise<{user}>` | e-mail com `trim`; reassina o tempo real; avisa os observadores | `Error` com `code`: `auth/invalid-credential` (400), `auth/too-many-requests` (403), `auth/internal-error` (demais, **inclusive 429**) |
| `createUserWithEmailAndPassword(email, senha, extra?)` | `→ Promise<{user}>` | cria em `users` (com `passwordConfirm`) e entra | idem |
| `signOut()` | `→ Promise<null>` | cancela a assinatura, **descarta todos os listeners**, limpa a sessão, avisa | — |
| `onAuthStateChanged(cb)` | `→ () => void` (desinscrever) | chama `cb(user\|null)` logo após `ready()` e a cada login/logout | exceção em `cb` vai para o console |
| `sendPasswordResetEmail()` | `→ Promise` | **sempre rejeita** com `fluxdb: reset de senha é feito pelo administrador no painel do PocketBase (/_/)` | — |

## 3. Database

| Membro | Assinatura | Observação |
|---|---|---|
| `ref(path)` | `(string) → Ref` | caminho com ou sem barras nas pontas |
| `refFromURL(url)` | `(string) → Ref` | remove `http(s)://host/` e usa o resto como caminho |
| `goOnline()`, `goOffline()` | `() → void` | sem efeito |
| `ServerValue` | ver raiz | |

## 4. Ref

| Membro | Assinatura | Semântica | Confiança |
|---|---|---|---|
| `key` | `string \| null` | último segmento; `null` na raiz | 🟢 |
| `path`, `toString()` | `string` | caminho limpo | 🟢 |
| `child(p)` / `parent()` | `→ Ref` | | 🟢 |
| `get()` / `once('value')` | `→ Promise<Snapshot>` | leitura de 3 camadas **da cópia local**, sem rede depois da carga **(1.1)**; `once` com outro evento avisa e trata como `value` | 🟢 |
| `set(v)` | `→ Promise<null>` | grava `v` no caminho; **apaga todos os descendentes**; `null`/`undefined` apaga; na raiz rejeita | 🟢 |
| `update(obj)` | `→ Promise<null>` | para cada chave `k` (pode conter `/`), `set` em `path/k`, **todas no mesmo ciclo**; chaves no mesmo nó saem numa requisição **(1.1)**; `obj` não-objeto rejeita | 🟢 |
| `remove()` | `→ Promise<null>` | `set(null)` | 🟢 |
| `push(v?)` | `→ Promise<Ref>` com `key`, `ref`, `path` já disponíveis antes de resolver | id de 15 caracteres `[a-z0-9]`, **não ordenável por tempo** | 🟢 |
| `on('value', cb, errCb?)` | `→ cb` (o próprio callback) | chama `cb(snapshot)` quando a carga termina (uma vez) e a cada mudança em caminho igual, ancestral ou descendente, **agrupada por ciclo e só se o valor mudou** **(1.1)**; `errCb(e)` é chamado se a carga falhar (o listener é removido) **(1.1)**; outros eventos: aviso e ignora | 🟢 |
| `on` em `.info/connected` | `→ cb` | `cb(snapshot)` com `true/false`; chamado na hora se já conhecido; ping a cada 20 s | 🟢 |
| `off('value', cb?)` | `→ void` | sem `cb`, remove todos os listeners **daquele caminho**; com `cb`, só aquele; nenhum aviso posterior chega | 🟢 |
| `orderByChild`, `limitToLast`, `transaction`, `onDisconnect` | lançam `Error('fluxdb: … não implementado')` | | 🟢 |

## 5. Fachada modular (`fluxdb.modular`, usada pelo `controle-de-carga`)

| Função | Equivale a |
|---|---|
| `initializeApp(cfg)` | `fluxdb.initializeApp(cfg)` |
| `getAuth()` / `getDatabase()` | `auth()` / `database()` |
| `ref(db, path)` / `child(r, p)` | `database().ref(path)` / `r.child(p)` |
| `set(r, v)`, `update(r, o)`, `remove(r)`, `get(r)`, `push(r, v)` | métodos do `Ref` |
| `onValue(r, cb)` | `r.on('value', cb)`; devolve função que faz `off` |
| `off(r, _evento, cb)` | `r.off('value', cb)` |
| `onAuthStateChanged(_auth, cb)`, `signInWithEmailAndPassword(_auth, e, s)`, `signOut()` | métodos do `Auth` |
| `serverTimestamp()` | `{'.sv':'timestamp'}` (literal) |

## 6. Snapshot

| Membro | Retorno |
|---|---|
| `key` | último segmento do caminho |
| `ref` | `{path}` (🟢 só `path`, não é um `Ref` completo: `Snapshot`, `:124`) |
| `val()` | valor ou `null` |
| `exists()` | `false` para `null`/ausente |
| `numChildren()` | número de chaves se objeto, senão 0 |
| `child(p)` | `Snapshot` do subcaminho |
| `hasChild(p)` | `boolean` |
| `forEach(fn)` | itera as chaves; para se `fn` devolver `true`; devolve se parou |

## 7. Formato no servidor

Cada nó é um registro de `nodes`:
```json
{ "owner": "<users.id>", "path": "users/<uid>/data/<club>/<season>/planner/sessions/1760300000000",
  "data": { "v": <valor do Firebase> } }
```
Restrições: `path` ≤ 1024 caracteres, único por `owner`; `data` ≤ 5 MB. 🟢

## 8. Quem usa o quê 🟢

| Página | Entrada | Particularidades |
|---|---|---|
| `index.html` | compat (`fluxdb.auth()`, `fluxdb.database()`) | `auth.Auth.Persistence`, `setPersistence`, login/logout |
| `mod_planner`, `mod_stats`, `mod_minutes`, `mod_xg`, `mod_periodization`, `mod_profile`, `mod_scouting`, `mod_video` | compat | `stats`, `minutes` e `periodization` usam `.info/connected`; `profile` guarda o retorno de `on` para `off`; `video` usa `once('value')` |
| `mod_data` | **modular** | `onValue` na raiz `load`; `update` na raiz `/` com caminhos completos nas chaves |

## 9. Regras para uma reescrita

1. 🟢 Manter **todos** os nomes, assinaturas e formatos acima; `apps` como getter; `auth` como função com `Auth.Persistence`.
2. 🟢 Manter a semântica de `set` (apaga descendentes) e de `update` (fan-out por chave com `/`).
3. 🟢 Manter o formato no servidor (seção 7): a cópia local é só no cliente.
4. 🟢 Manter o descarte de avisos após `off`, e o aviso imediato ao chamar `on`.
5. 🟡 Pode mudar: o número de requisições e a ordem interna. Não pode piorar: leitura sem rede depois da carga, ≤ 1 requisição por nó gravado, um aviso por listener por ciclo **(1.1)**.
6. 🟢 Corrigir sem quebrar: 429 → `auth/too-many-requests`; `SESSION` efetivo; `TIMESTAMP` resolvido; falha de rede no `authRefresh` não derrubar a sessão. (`errCb` em falha de carga já é chamado desde a 1.1.)
