# Adaptador fluxdb

> Atualizado em 13/10/2026 para a **versão 1.1** (`fluxdb/1.1 (PocketBase, cópia local)`, commit `e1dc8c7`).
> A 1.0 lia tudo da rede e gastava 4 viagens por gravação; a 1.1 entrega o que era a evolução RF-11.

## Visão Geral
`static/pocketbase-adapter.js` (705 linhas) expõe o global `fluxdb`, com a mesma superfície do Firebase compat 9.x
(`app`, `auth`, `database`) e da fachada modular v10. Por trás, usa o PocketBase: coleção `users` para login e
coleção genérica `nodes` para a árvore de dados. As 12 páginas trocaram `firebase.` por `fluxdb.` e não sabem que o
banco mudou. Como o Firebase, mantém uma **cópia local em memória** dos dados do técnico: lê dela, grava nela na
hora e sincroniza com o servidor em segundo plano. 🟢

## Responsabilidades
- Inicializar o cliente PocketBase na mesma origem e reaproveitar a sessão salva. 🟢
- Autenticar (login, logout, observar mudança de usuário) e traduzir erros para códigos `auth/*`. 🟢
- Carregar uma vez, após o login, todos os nós do técnico para a cópia local. 🟢
- Ler da cópia local e gravar nela, com a semântica do Realtime Database, mandando uma requisição por nó tocado. 🟢
- Aplicar na cópia local as mudanças de outros aparelhos (tempo real) e descartar o eco das próprias gravações. 🟢
- Avisar os listeners `on('value')` uma vez por ciclo, e só quando o valor que eles enxergam mudou. 🟢
- Informar o estado da conexão por `.info/connected`. 🟢
- Falhar alto nas operações do Firebase que não implementa. 🟢

## Regras de Negócio
- RN-01 Todo nó pertence a um dono (`owner`); o servidor só deixa o dono ler e gravar (`owner = @request.auth.id`). 🟢
- RN-02 Um caminho existe uma única vez por dono (índice único `owner, path`). 🟢
- RN-03 O valor é guardado embrulhado em `data = {v: valor}`, porque o campo JSON só guarda objeto e o app grava também número, texto e booleano. 🟢
- RN-04 Escrever um valor num caminho **apaga todos os descendentes** desse caminho: o valor escrito passa a ser a verdade dali para baixo. 🟢
- RN-05 Escrever num caminho que está **dentro** do JSON de um ancestral reescreve o JSON do ancestral, em vez de criar um nó novo. 🟢
- RN-06 Escrever `null` (ou `undefined`) apaga. 🟢
- RN-07 Ler um caminho combina três camadas, nesta ordem: ancestral mais profundo (descendo no JSON), nó exato, descendentes (sobrepostos do mais raso ao mais fundo). 🟢
- RN-08 `update(obj)` grava cada chave como um caminho relativo (fan-out multi-caminho), **todas no mesmo ciclo**: chaves que caem no mesmo nó saem numa requisição só. 🟢
- RN-09 `push()` gera id de 15 caracteres `[a-z0-9]`; **não** é ordenável por tempo como no Firebase. 🟢
- RN-10 Gravar na raiz é proibido. 🟢
- RN-11 Um `off('value', cb)` impede qualquer aviso posterior àquele callback. 🟢
- RN-12 Erro de login: HTTP 400 → `auth/invalid-credential`; 403 → `auth/too-many-requests`; outros → `auth/internal-error`. 🟢 (o rate limit do PocketBase responde **429**, que hoje cai em `internal-error`)
- RN-13 Redefinição de senha por e-mail é recusada de propósito: o administrador redefine no painel `/_/`. 🟢
- RN-14 `orderByChild`, `limitToLast`, `transaction` e `onDisconnect` lançam erro. 🟢
- RN-15 **Cópia local:** a primeira leitura após o login baixa todos os nós do técnico (`owner = uid`, em lotes de 500); toda leitura seguinte sai da memória, sem rede. 🟢
- RN-16 **Uma requisição por nó tocado:** a gravação muda a cópia local, avisa os listeners na hora e manda `create`, `update` ou `delete` daquele nó. Gravações seguidas no mesmo nó, enquanto a anterior espera, pegam carona e saem numa requisição só. 🟢
- RN-17 **Tempo real:** mudança vinda de outro aparelho entra na cópia local e avisa os listeners. São ignorados: evento de outro dono; eco da própria gravação (registro com `updated` igual ou mais velho que o da cópia); evento de nó com gravação local em voo; e o eco atrasado de um nó que este aparelho apagou. 🟢
- RN-18 **Avisos agrupados:** todas as mudanças do mesmo ciclo do navegador acordam cada listener relacionado no máximo uma vez, e só se o valor que ele enxerga mudou. 🟢
- RN-19 **Gravação que falhou:** a promessa é rejeitada e, 300 ms depois, a cópia local inteira é descartada e baixada de novo do servidor. 🟢
- RN-20 Trocar de usuário (login ou logout) descarta a cópia local; o logout também descarta todos os listeners. 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | `initializeApp(cfg)`, `apps`, `app()`, `database()`, `auth()` com a superfície compat | Must | As 12 páginas carregam sem erro |
| RF-02 | `signInWithEmailAndPassword`, `signOut`, `onAuthStateChanged`, `currentUser`, `setPersistence` | Must | Login, logout e troca de usuário notificam todos os observadores |
| RF-03 | `createUserWithEmailAndPassword` (cria e entra) | Could | Nenhuma página usa hoje 🟢 |
| RF-04 | `ref(path)` com `get`, `once('value')`, `set`, `update`, `remove`, `push`, `child`, `parent`, `key` | Must | Teste de fumaça: gravar e ler de volta em todas as combinações ancestral/exato/descendente |
| RF-05 | `on('value', cb, errCb?)` / `off('value', cb?)` com aviso imediato e a cada mudança relacionada | Must | Alteração feita por outro cliente acorda o listener |
| RF-06 | `.info/connected` verdadeiro/falso conforme `/api/health` | Should | Desligar o servidor muda para `false` em até 20 s |
| RF-07 | Fachada modular: `initializeApp, getAuth, getDatabase, ref, child, set, update, remove, get, push, onValue, off, onAuthStateChanged, signInWithEmailAndPassword, signOut, serverTimestamp` | Must | O Load Control funciona |
| RF-08 | `ServerValue.TIMESTAMP` / `serverTimestamp()` | Won't (hoje) | Grava o objeto literal `{".sv":"timestamp"}`; nenhuma página usa 🟢 |
| RF-09 | **Correção:** `setPersistence(SESSION)` deve encerrar a sessão ao fechar o navegador | Should | Login sem "lembrar", fechar e reabrir → tela de login |
| RF-10 | **Correção:** HTTP 429 → `auth/too-many-requests` | Should | 21ª tentativa de login em 1 minuto mostra "muitas tentativas" |
| RF-11 | Cópia local, leitura sem rede, 1 requisição por nó gravado, eco ignorado, avisos agrupados (RN-15..RN-19) | Must | Critérios de Aceitação 7 e 8 |
| RF-12 | `_internal.stats.requests` e `_internal.pending()` para medição e testes | Could | O teste de fumaça lê o contador |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Segurança | isolamento por dono no servidor, nunca no cliente; o filtro `owner=` da carga repete a regra | migration (`owner = @request.auth.id`); `loadCache` (`:179-205`) | 🟢 |
| Segurança | sessão inválida é limpa no início (`authRefresh` falhou → `authStore.clear`) | `ready` (`:100-112`) | 🟢 |
| Disponibilidade | chamadas concorrentes não se cancelam (`requestKey: null`) | `loadCache`, `sync`, `authApi` | 🟢 |
| Disponibilidade | assinatura de tempo real feita **antes** da carga, e eventos que chegam durante a carga ficam numa fila e são aplicados depois | `loadCache` (`pendingEvents`), `onRealtime` (`:374-378`) | 🟢 |
| Consistência | gravações do mesmo nó saem em ordem (fila por nó: create → update → delete) | `sync`, `R.chain` (`:213-259`) | 🟢 |
| Consistência | gravação que falha força recarga completa, para a cópia local não ficar à frente do servidor | `resync` (`:262-271`) | 🟢 |
| Escalabilidade | carga em lotes de 500 registros | `getFullList({batch: 500})` (`:187`) | 🟢 |
| Escalabilidade | toda a árvore do técnico fica em memória em **cada** página aberta (hub e cada iframe) | `cache` por instância | 🟢 |
| Escalabilidade | valor de um nó limitado a 5 MB | migration, campo `data.maxSize` | 🟢 |
| Performance | leitura de caminho carregado: 0 requisições; gravação de um nó: 1 (3 no conflito de criação) | `readPath`, `sync` (`:233-240`) | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado um técnico autenticado
Quando ele grava {a: 1, b: {c: 2}} em "users/u/x"
E lê "users/u/x/b/c"
Então recebe 2

Dado que "users/u/x" tem os filhos "a" e "b" gravados separadamente
Quando ele grava 5 em "users/u/x"
Então os nós "users/u/x/a" e "users/u/x/b" deixam de existir
E a leitura de "users/u/x" devolve 5

Dado um listener on('value') em "users/u/lista"
Quando outro aparelho grava "users/u/lista/item1"
Então o listener é chamado com a lista contendo item1

Dado um listener que já chamou off('value', cb)
Quando chega um aviso de mudança
Então cb não é chamado

Dado um técnico sem sessão
Quando a página tenta gravar
Então a gravação é recusada ("escrita sem usuário logado")

Dado um técnico que errou a senha 20 vezes no último minuto
Quando tenta a 21ª
Então recebe o código auth/too-many-requests (após RF-10)

Dado um técnico com os dados já carregados
Quando ele lê qualquer caminho
Então nenhuma requisição é feita

Dado um módulo com 150 itens gravados em sequência e um listener na lista
Quando todos forem gravados
Então foram feitas no máximo 150 requisições de escrita, nenhuma leitura,
E o listener do próprio aparelho não é acordado pelo eco do tempo real

Dado uma gravação que o servidor recusou
Quando a recusa chega
Então a promessa da gravação é rejeitada
E a cópia local é baixada de novo do servidor
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Superfície compat + modular (RF-01, RF-02, RF-04, RF-05, RF-07) | Must | Todas as páginas dependem |
| Cópia local e 1 requisição por gravação (RF-11) | Must | Resolveu a lentidão medida (602 requisições e 30 s para 150 sessões na 1.0) |
| `.info/connected` (RF-06) | Should | Usado para indicadores de sincronização |
| "Não lembrar" e 429 (RF-09, RF-10) | Should | Defeitos de comportamento, sem perda de dados |
| `createUser`, medição (RF-03, RF-12) | Could | Sem uso nas páginas; ver D-09 (conta só pelo Admin) |
| `ServerValue.TIMESTAMP` (RF-08) | Won't | Sem uso |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `static/pocketbase-adapter.js` | `clean`, `parts`, `esc`, `isDesc`, `clone`, `deepGet`, `deepSet` (`:49-77`) | 🟢 |
| `static/pocketbase-adapter.js` | `loadSdk`, `ready`, `uid` (`:79-117`) | 🟢 |
| `static/pocketbase-adapter.js` | `Snapshot` (`:119-143`) | 🟢 |
| `static/pocketbase-adapter.js` | cópia local: `newRec`, `loadCache`, `dropCache`, `sync`, `resync` (`:145-271`) | 🟢 |
| `static/pocketbase-adapter.js` | `resolve`, `readPath` (`:273-301`) | 🟢 |
| `static/pocketbase-adapter.js` | `writePath`, `updatePath`, `removePath`, `pushId` (`:303-357`) | 🟢 |
| `static/pocketbase-adapter.js` | `ensureSubscription`, `onRealtime`, `applyEvent`, `notify`, `flush`, `emit` (`:359-441`) | 🟢 |
| `static/pocketbase-adapter.js` | `pingConnection`, `startConnWatch` (`:443-467`) | 🟢 |
| `static/pocketbase-adapter.js` | `makeRef`, `authApi`, `dbApi`, `modular`, `fluxdb` (`:469-705`) | 🟢 |
| `pb_migrations/1760270000_init_fluxgk.js` | coleção `nodes`, regras de `users` | 🟢 |
| `tools/smoke-adapter.mjs` | teste de fumaça, 41 verificações (roda no CI) | 🟢 |
