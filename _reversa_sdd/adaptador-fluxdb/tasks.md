# Adaptador fluxdb, Tarefas de Implementação

> Versão 1.1 (`e1dc8c7`). As antigas T-14 a T-17 (cópia local, 1 requisição por gravação, eco ignorado, avisos
> agrupados) foram feitas na 1.1, em JavaScript, e agora são paridade (T-11 a T-14). A pergunta "JavaScript ou
> Rust/WebAssembly" está respondida na prática: o custo era rede, e a 1.1 resolveu em JavaScript.

## Pré-requisitos
- [ ] PocketBase 0.40.5 com a migration `pb_migrations/1760270000_init_fluxgk.js` aplicada
- [ ] SDK JS do PocketBase servido em `/static/vendor/pocketbase.umd.js` (hoje **0.22.1**; ver T-22)
- [ ] Rotas `/api/` e `/api/realtime` (SSE sem buffer) no nginx da stack
- [ ] Node 22 para o teste de fumaça (já roda no CI, `.github/workflows/ci.yml`)

## Tarefas

### Paridade com o legado

- [ ] T-01, Carregamento e cliente: `loadSdk`, `ready` (com `authRefresh` e limpeza de sessão inválida), `uid`
  - Origem no legado: `static/pocketbase-adapter.js:79-117`
  - Critério de pronto: página com sessão expirada abre deslogada, sem erro
  - Confiança: 🟢

- [ ] T-02, Utilitários de caminho e árvore: `clean`, `parts`, `esc`, `isDesc`, `clone`, `deepGet`, `deepSet`
  - Origem no legado: `:49-77`
  - Critério de pronto: testes unitários para raiz, barras nas pontas, chave ausente e apagar com `null`
  - Confiança: 🟢

- [ ] T-03, `Snapshot` com `val`, `exists`, `numChildren`, `child`, `hasChild`, `forEach` (interrompível)
  - Origem no legado: `:119-143`
  - Critério de pronto: valor ausente dá `val() === null` e `exists() === false`
  - Confiança: 🟢

- [ ] T-04, Leitura sobre a cópia local: `resolve` (3 camadas, ignorando lápides), `readPath`
  - Origem no legado: `:273-301`
  - Critério de pronto: leituras de ancestral, exato e descendentes iguais às do teste de fumaça, sem requisição depois da carga
  - Confiança: 🟢

- [ ] T-05, Escrita: `writePath` (descendentes viram lápide, ancestral editado no JSON, exato criado/atualizado/apagado, `notify` antes da rede), `updatePath` em paralelo, `removePath`, `push`/`pushId`
  - Origem no legado: `:303-357`, `push` em `makeRef` (`:491-498`)
  - Critério de pronto: gravar na raiz e gravar sem usuário são recusados; `push` devolve `key` antes de resolver
  - Confiança: 🟢

- [ ] T-06, `.info/connected` por ping de 20 s em `/api/health`
  - Origem no legado: `:443-467`
  - Critério de pronto: desligar o servidor muda para `false` em até 20 s
  - Confiança: 🟢

- [ ] T-07, Autenticação: `signInWithEmailAndPassword` (cancela assinatura, `dropCache`, carga em segundo plano), `createUserWithEmailAndPassword`, `signOut` (descarta listeners e cópia), `onAuthStateChanged`, `currentUser`, `setPersistence`, `sendPasswordResetEmail` (recusa), `mapAuthError`
  - Origem no legado: `:545-639`
  - Critério de pronto: trocar de usuário não mostra dados do anterior em nenhum listener
  - Confiança: 🟢

- [ ] T-08, Fachadas: `ref`, `refFromURL`, `goOnline`/`goOffline` (sem efeito), `ServerValue`, `initializeApp`, `apps`, `auth.Auth.Persistence`, fachada modular, `_internal` (`ready, uid, readPath, writePath, pb, stats, pending`), `SDK`
  - Origem no legado: `:641-705`
  - Critério de pronto: as 12 páginas carregam; `fluxdb.SDK` identifica a versão
  - Confiança: 🟢

- [ ] T-09, Operações não suportadas lançam erro: `orderByChild`, `limitToLast`, `transaction`, `onDisconnect`
  - Origem no legado: `:536-540`
  - Critério de pronto: chamar qualquer uma lança `Error('fluxdb: … não implementado')`
  - Confiança: 🟢

- [ ] T-10, `on('value', cb, errCb)` e `off`: aviso inicial ao terminar a carga (uma vez só), `errCb` quando a carga falha, nenhum aviso depois do `off`
  - Origem no legado: `makeRef.on`/`off` (`:502-534`)
  - Critério de pronto: carga recusada chama `errCb`; listener desligado nunca mais é chamado
  - Confiança: 🟢

- [ ] T-11, Cópia local: `loadCache` (assina antes de ler, `getFullList` em lotes de 500 com `owner=`, fila de eventos da janela de carga, descarte se o usuário mudou), `dropCache`
  - Origem no legado: `:145-209`
  - Critério de pronto: Critério de Aceitação 7 (leitura sem requisição)
  - Confiança: 🟢

- [ ] T-12, Viagem por nó: `sync` com fila por nó, carona de gravações seguidas, lápide até a viagem terminar, conflito de criação (400 → busca e `UPDATE`), `resync` em falha
  - Origem no legado: `:211-271`
  - Critério de pronto: Critérios de Aceitação 8 e 9; 150 gravações seguidas ≤ 150 requisições
  - Confiança: 🟢

- [ ] T-13, Tempo real na cópia: `ensureSubscription`, `onRealtime`, `applyEvent` com as regras de descarte (outro dono, eco, viagem em voo, id apagado, evento velho)
  - Origem no legado: `:359-408`
  - Critério de pronto: gravação em A acorda o listener em B uma vez; em A, o eco não acorda de novo
  - Confiança: 🟢

- [ ] T-14, Avisos agrupados e deduplicados: `notify`, `flush`, `emit` com `L.last`
  - Origem no legado: `:410-441`
  - Critério de pronto: `update` de 10 chaves acorda o listener pai uma vez; gravar o mesmo valor não acorda ninguém
  - Confiança: 🟢

### Correções

- [ ] T-15, Mapear HTTP 429 para `auth/too-many-requests`
  - Origem no legado: `mapAuthError` (`:560-567`)
  - Critério de pronto: login bloqueado pelo rate limit mostra a mensagem de "muitas tentativas" no hub
  - Confiança: 🟢

- [ ] T-16, "Não lembrar de mim": com `SESSION`, guardar a sessão do SDK em `sessionStorage` (ou limpar o `localStorage` ao abrir sem a marca)
  - Origem no legado: `setPersistence` (`:572-582`)
  - Critério de pronto: fechar e reabrir o navegador volta ao login; com `LOCAL`, continua logado
  - Confiança: 🟢

- [ ] T-17, `ServerValue.TIMESTAMP`: resolver para `Date.now()` antes de gravar, ou remover da superfície
  - Origem no legado: `dbApi.ServerValue` (`:646`), `serverTimestamp` (`:679`)
  - Critério de pronto: gravar `{t: ServerValue.TIMESTAMP}` resulta em número
  - Confiança: 🟢

- [ ] T-18, Recarga sem perder o que está na fila: em falha, recarregar do servidor mas reaplicar as gravações locais que ainda não saíram (ou recarregar só o nó que falhou)
  - Origem no legado: `resync` (`:262-271`) descarta a cópia inteira
  - Critério de pronto: com uma gravação recusada e outra em fila, a segunda chega ao servidor
  - Confiança: 🟡

- [ ] T-19, Sessão sem rede: falha de rede no `authRefresh` não pode limpar a sessão; só 401 limpa
  - Origem no legado: `ready` (`:104-108`)
  - Critério de pronto: abrir o app sem rede e reconectar não pede login de novo
  - Confiança: 🟢

### Evolução

- [ ] T-20, Um cliente por aba: módulos em iframe reutilizam o `fluxdb` do hub (`window.parent.fluxdb`, mesma origem) em vez de ter cópia local, SSE e `authRefresh` próprios
  - Origem no legado: carregadores dos módulos (ex.: `mod_planner.html:1805-1822`)
  - Critério de pronto: uma única conexão `/api/realtime` e uma única cópia por aba com módulo aberto
  - Confiança: 🟡 (módulos abertos fora do hub precisam de fallback)

- [ ] T-21, Teste de carga: 150 sessões em laço com um listener na lista, imprimindo `_internal.stats.requests` e o tempo
  - Origem no legado: medição manual de 13/10 (`../code-analysis.md`); contador já existe na 1.1
  - Critério de pronto: o teste roda no CI e falha se passar de 150 requisições
  - Confiança: 🟢

- [ ] T-22, Atualizar o SDK para a linha do servidor (0.26+), trocando `authStore.model` por `authStore.record` no adaptador
  - Origem no legado: `static/vendor/pocketbase.umd.js` (0.22.1); `uid`, `pubUser` (`:114-117`, `:549-553`)
  - Critério de pronto: fumaça 41/41 com o SDK novo; nenhum aviso de depreciação no console
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, Teste de fumaça (41 verificações) contra cada versão nova — paridade obrigatória (já no CI)
- [ ] TT-02, Escrita em ancestral apaga descendentes (Critério 2)
- [ ] TT-03, `off` descarta avisos (4)
- [ ] TT-04, Isolamento: usuário B não lê nem grava nós de A
- [ ] TT-05, Leitura sem requisição depois da carga (7)
- [ ] TT-06, 150 gravações ≤ 150 requisições e sem eco (8, T-21)
- [ ] TT-07, Gravação recusada rejeita a promessa e recarrega a cópia (9)
- [ ] TT-08, Dois clientes: gravação em A acorda B uma vez; em A, não duplica
- [ ] TT-09, 429 → `auth/too-many-requests` (após T-15)

## Tarefas de Migração de Dados (se aplicável)

Nenhuma: a 1.1 mudou só o cliente; o formato de `nodes` continua o mesmo. 🟢

## Ordem Sugerida
1. TT-05 a TT-08 e T-21 sobre a 1.1, para fixar o desempenho atual no CI.
2. T-19 e T-18: hoje uma falha de rede ou de gravação pode custar sessão ou dado.
3. T-15, T-16 e T-17: correções pequenas e isoladas.
4. T-20 por último: muda o carregamento de todos os módulos.

## Lacunas (revisadas em 13/10)

Respostas do dono ao Reviewer em `../questions.md`; decisões D-11 a D-31 em `../domain.md`.

- 🔴 Volume real de uma conta (D-07): define até onde a cópia local completa por página aguenta. → D-07: desconhecido — **continua aberta** (medir em produção)
