# Adaptador fluxdb, Design Técnico

> Versão 1.1 (`e1dc8c7`, 13/10/2026). O que mudou em relação à 1.0 está marcado com **(1.1)**.

## Interface

Superfície completa em `contracts.md`. Configuração lida do `window` antes de carregar: 🟢
| Global | Padrão | Uso |
|---|---|---|
| `FLUXGK_PB_SDK` | `/static/vendor/pocketbase.umd.js` | onde buscar o SDK do PocketBase |
| `FLUXGK_PB_URL` | `''` (mesma origem) | base da API |
| `FLUXGK_DEBUG` | `false` | ativa `console.log('[fluxdb]', …)` |

### Funções internas 🟢
| Símbolo | Linhas | Papel |
|---|---|---|
| `clean`, `parts`, `esc`, `isDesc`, `clone`, `deepGet`, `deepSet` | 49–77 | caminhos e árvore; `deepSet` com `null` apaga a chave e cria objetos intermediários |
| `loadSdk`, `ready`, `uid` | 79–117 | injeta o SDK uma vez; cria o cliente; com sessão salva válida faz `authRefresh`, que falhando limpa a sessão |
| `Snapshot` | 119–143 | `{key, ref:{path}, val, exists, numChildren, child, hasChild, forEach}` |
| `newRec`, `unwrap`, `same` **(1.1)** | 172–177 | registro da cópia local; `data.v`; igualdade por JSON |
| `loadCache` **(1.1)** | 179–205 | carga única por usuário (abaixo) |
| `dropCache` **(1.1)** | 207–209 | esquece cópia, usuário, carga, fila de eventos e ids apagados |
| `sync` **(1.1)** | 213–259 | leva um nó do cache ao servidor (abaixo) |
| `resync` **(1.1)** | 262–271 | 300 ms depois de uma falha, descarta e recarrega tudo |
| `resolve` | 273–297 | 3 camadas, agora **sobre a cópia local** |
| `readPath` | 299–301 | `loadCache()` e `Snapshot(path, resolve(path))` |
| `writePath` | 304–339 | algoritmo abaixo |
| `updatePath` | 341–349 | `writePath(path/k, obj[k])` para cada chave, **em paralelo** (1.1) |
| `pushId` | 353–357 | 15 caracteres `[a-z0-9]` aleatórios |
| `ensureSubscription` | 363–372 | `subscribe('*', onRealtime)` na coleção `nodes`, uma vez por login |
| `onRealtime`, `applyEvent` **(1.1)** | 374–408 | enfileira durante a carga; aplica na cópia (regras abaixo) |
| `notify`, `flush`, `emit` **(1.1)** | 410–441 | avisos agrupados por ciclo e deduplicados por valor |
| `pingConnection`, `startConnWatch` | 443–467 | `/api/health` agora e a cada 20 s; avisa só quando muda |
| `makeRef` | 469–543 | o `Ref` público |
| `authApi`, `authFn`, `dbApi`, `modular`, `fluxdb` | 545–705 | fachadas |

### Registro da cópia local (`R`) **(1.1)** 🟢
```
R = { path, id, v, updated, gone, inflight, chain, queued }
  id       id do registro no PocketBase (null até o create voltar)
  v        valor desembrulhado (data.v)
  updated  carimbo `updated` do servidor; eventos com carimbo igual ou mais velho são eco ou atraso
  gone     apagado aqui; fica como lápide enquanto houver viagem em voo
  inflight viagens em andamento deste nó
  chain    fila das viagens deste nó (create → update → delete em ordem)
  queued   viagem enfileirada que ainda não saiu: gravações seguidas pegam carona nela
```
`cache` é um `Map(path → R)` do usuário `cacheUid`.

## Fluxo Principal

### Carga (`loadCache`) **(1.1)** 🟢
1. `ready()`; sem usuário → sem cópia (`cache = null`).
2. Mesmo usuário com carga em andamento → reaproveita a promessa.
3. Usuário novo: zera cópia, `deletedIds` e abre a fila `pendingEvents = []`.
4. `ensureSubscription()` (assina **antes** de ler, para não perder mudança no meio) → `getFullList({batch: 500, filter: 'owner="<uid>"'})`.
5. Monta o `Map` com `R` por registro; aplica os eventos que chegaram durante a carga (`pendingEvents`); fecha a fila.
6. `emit` em todos os listeners já registrados (aviso inicial).
7. Se o usuário mudou durante a carga, o resultado é descartado; se falhou, a carga pode ser refeita.

### Leitura (`get`, `once`, `on` inicial) 🟢
1. `loadCache()` (sem rede se já carregou).
2. `resolve(P)` sobre a cópia, ignorando lápides:
   - ancestral mais profundo `A` com `P` dentro dele → `valor = clone(deepGet(A.v, resto))`;
   - nó exato `E` → `valor = clone(E.v)`;
   - descendentes `D` ordenados por profundidade → se o valor não é objeto, vira `{}`; cada `D.v` entra com `deepSet`.
3. `Snapshot(P, valor)`.

### Escrita (`set`, `remove`, `update` por chave) 🟢
1. `P` vazio → rejeita (`set na raiz não é permitido`). Sem usuário → rejeita (`escrita sem usuário logado`).
2. Classifica pela cópia local: exato, ancestral (mais profundo) e descendentes.
3. Cada descendente vira lápide (`gone = true`) e entra em `sync` → `DELETE`.
4. Ancestral sem exato: edita o JSON do ancestral com `deepSet` e `sync(ancestral)` → `UPDATE`.
5. Senão, valor `null`: o exato vira lápide → `DELETE`.
6. Senão: o exato (ou uma lápide no mesmo caminho, ou um `R` novo) recebe o valor → `sync` → `UPDATE` ou `CREATE`.
7. `notify(P)` **na hora** (antes da rede) e devolve `Promise.all` das viagens.

### Viagem de um nó (`sync`) **(1.1)** 🟢
1. Se já há viagem enfileirada (`R.queued`), devolve ela: a gravação nova pega carona.
2. Na vez do nó (`R.chain`), lê o estado **na hora de sair**:
   - lápide com `id` → `DELETE` (404 conta como apagado); registra o id em `deletedIds`;
   - senão `UPDATE {data:{v}}` se tem `id`, ou `CREATE {owner, path, data:{v}}`;
   - `CREATE` com 400 (nó criado por outro aparelho sem o cache saber) → busca por `owner + path` e faz `UPDATE` (3 requisições).
3. Guarda `id` e o maior `updated` da resposta.
4. Ao terminar sem viagens pendentes, a lápide sai da cópia.
5. Falhou: aviso no console, `resync()`, e a promessa é rejeitada.

### Tempo real (`applyEvent`) **(1.1)** 🟢
| Evento | Condição | Efeito |
|---|---|---|
| qualquer | `record.owner` ≠ usuário | ignora |
| qualquer | carga em andamento | entra na fila `pendingEvents` |
| `delete` | nó ausente, com viagem em voo, ou `id` diferente | ignora |
| `delete` | caso contrário | sai da cópia; `notify` |
| `create`/`update` | id está em `deletedIds` | ignora (eco atrasado de algo apagado aqui) |
| `create`/`update` | nó com viagem em voo | ignora (a resposta da viagem é a verdade) |
| `create`/`update` | `updated` ≤ o da cópia | ignora (eco ou evento velho) |
| `create`/`update` | valor igual ao da cópia | só atualiza `id`/`updated` |
| `create`/`update` | caso contrário | atualiza a cópia; `notify` |

### Avisos (`notify` → `flush` → `emit`) **(1.1)** 🟢
`notify` acumula caminhos e agenda um `flush` no próximo ciclo (`setTimeout 0`). O `flush` acorda cada listener
cujo caminho é igual, ancestral ou descendente de algum caminho alterado — uma vez só. `emit` recalcula o valor pela
cópia, compara com o último entregue (`L.last`, JSON) e só chama o callback se mudou (ou na primeira vez). Listener
removido por `off` não é chamado.

## Fluxos Alternativos
- **Sessão salva inválida:** `authRefresh` falha → `authStore.clear()`; a página segue como deslogada. Também sem rede. 🟢
- **Login:** cancela a assinatura, `dropCache`, `authWithPassword`; a carga começa em segundo plano (não segura o login) e os observadores são avisados. 🟢
- **Logout:** cancela a assinatura, **descarta todos os listeners**, `dropCache`, limpa a sessão, avisa. 🟢
- **Carga falhou:** `on('value')` remove o listener e chama `errCb` se houver (senão, aviso no console). **(1.1)** 🟢
- **Falha da assinatura:** `subscribed` volta a `false`, aviso no console; tenta de novo na próxima carga. 🟢
- **Gravação falhou:** a cópia é recarregada inteira 300 ms depois (`resync`), descartando o que só existia aqui. 🟢
- **`once`/`on` com evento ≠ `value`:** aviso; `once` trata como `value`, `on` ignora. 🟢
- **`on('.info/connected')`:** guarda o callback, inicia o ping e chama na hora se o estado já é conhecido. 🟢

## Dependências
- PocketBase JS SDK **0.22.1** (`static/vendor/pocketbase.umd.js`; o arquivo é idêntico ao `dist/pocketbase.umd.js` publicado no npm — identificado pelo Reviewer em 13/10). 🟢
- Rotas `/api/collections/users/*`, `/api/collections/nodes/records`, `/api/realtime`, `/api/health`, pelo nginx da stack (ver `../openapi/pocketbase-fluxgk.yaml`). 🟢
- Coleção `nodes` e regras de `users` (`pb_migrations/1760270000_init_fluxgk.js`). 🟢
- `localStorage` (sessão do SDK) e `sessionStorage` (marca `fluxdb_session_only`, sem leitor). 🟢

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---|---|---|
| Superfície idêntica ao Firebase para não tocar nas páginas | cabeçalho, `:1-34` | 🟢 |
| Um nó no caminho escrito, não um nó por folha: "1 escrita = 1 requisição" | cabeçalho, `:20-25` | 🟢 |
| **(1.1)** Cópia local como o Firebase, em vez de ir à rede em tudo (602 requisições → ≤ 150 para 150 sessões) | comentário `:145-164` | 🟢 |
| **(1.1)** Assinar antes de carregar e enfileirar eventos da janela de carga | `loadCache`, `onRealtime` | 🟢 |
| **(1.1)** Lápide enquanto há viagem em voo, para eco antigo não ressuscitar o nó | comentário `:159-160` | 🟢 |
| **(1.1)** Falha de gravação recarrega tudo, em vez de tentar consertar a cópia | `resync`, `:261` | 🟢 |
| `requestKey: null` em todas as chamadas, para o SDK não cancelar chamadas paralelas | `loadCache`, `sync`, `authApi` | 🟢 |
| `auth` é função e objeto ao mesmo tempo (`fluxdb.auth.Auth.Persistence`) | `:636-639` | 🟢 |
| Fachada modular para o `mod_data`, que usa o SDK v10 | `:659-680` | 🟢 |
| Operações não usadas falham alto em vez de fingir | `:536-540` | 🟢 |
| `_internal` (com `stats` e `pending`) para o teste de fumaça | `:691-695` | 🟢 |

## Estado Interno 🟢
| Variável | Conteúdo | Vida |
|---|---|---|
| `pb`, `_sdk`, `_ready` | cliente e promessas memoizadas | página |
| `cache`, `cacheUid`, `_loading` **(1.1)** | cópia local, dono, carga em andamento | até troca de usuário |
| `pendingEvents`, `deletedIds` **(1.1)** | eventos da janela de carga; ids apagados aqui | até troca de usuário |
| `dirty`, `_flushT`, `_resyncT` **(1.1)** | caminhos a avisar; agendamentos | ciclo |
| `stats.requests` **(1.1)** | requisições feitas pelo adaptador | página |
| `listeners[]` | `{path, event, cb, last}` | até `off` ou logout |
| `subscribed` | assinatura SSE ativa | até falha ou troca de usuário |
| `connCbs[]`, `connState` | observadores e último estado de conexão | página |
| `authCbs[]`, `persistence` | observadores de login; modo pedido | página |
| `apps[]`, `appObj` | app padrão único | página |

Cada página (hub e cada iframe) tem a sua própria cópia local completa.

## Observabilidade
- `console.warn('[fluxdb] gravação falhou em' …)`, `'[fluxdb] recarga falhou:'`, `'[fluxdb] carga inicial falhou:'`, `'[fluxdb] tempo real indisponível:'`, `'[fluxdb] leitura falhou em'`. 🟢
- `console.error('[fluxdb] listener falhou:' …)`, `'[fluxdb] onAuthStateChanged:' …`. 🟢
- Rastro detalhado com `window.FLUXGK_DEBUG = true`; contador `fluxdb._internal.stats.requests`; `fluxdb._internal.pending()` = viagens em voo. 🟢
- Teste de fumaça (`tools/smoke-adapter.mjs`): 41 verificações contra um PocketBase limpo, em todo push (CI). 🟢

## Riscos e Lacunas
- 🟢 **Cada página carrega a árvore inteira do técnico** na memória e abre a própria conexão SSE: com o hub e um módulo abertos, são duas cópias e duas conexões. Cresce com o volume da conta (D-07, desconhecido).
- 🟢 O evento SSE traz o registro inteiro: um documento de MB (vídeo, `xg/games`) circula para todas as páginas da conta a cada gravação.
- 🟢 Escrever num ancestral apaga descendentes gravados por **outro** módulo no mesmo ramo.
- 🟢 Uma gravação recusada descarta, na recarga, tudo o que só existia na cópia local (inclusive outras gravações que ainda não tinham saído).
- 🟢 `ServerValue.TIMESTAMP` grava literal; "não lembrar" não tem efeito; 429 vira erro genérico.
- 🟡 Escrita concorrente de dois aparelhos no mesmo nó: vence a última a chegar ao servidor (sem versão nem mescla).
- 🟡 Sem persistência local entre recargas: abrir o app sem rede não mostra dados (a cópia é só em memória).
- 🟡 **SDK 0.22.1 com servidor 0.40.5:** o SDK é anterior às mudanças de API do servidor 0.23 (ex.: `authStore.model` → `record`, `_superusers`). Hoje funciona (fumaça 41/41 no CI), mas qualquer recurso novo do servidor pode exigir o SDK 0.26+.
