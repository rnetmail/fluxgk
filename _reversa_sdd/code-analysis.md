# Análise de código — FluxGK

> Nota do Reviewer (13/10): este documento descreve o código da extração. Desde então, a `fluxdb` passou à 1.1
> (cópia local, 1 requisição por gravação — `adaptador-fluxdb/`) e a infraestrutura ganhou HML, CI/CD e versões
> (`infraestrutura/`). As medições de "4 viagens por gravação" valem para a 1.0.

> Archaeologist do Reversa, extração #1 (2026-10-13), nível **completo**, organização **por módulo**.
> Escala: 🟢 CONFIRMADO (lido no código) · 🟡 INFERIDO · 🔴 LACUNA. Referências como `arquivo:linha`.

## Visão geral da execução

1. O navegador abre `index.html` (hub). `boot()` carrega `/static/pocketbase-adapter.js`, inicializa o
   `fluxdb` e espera `onAuthStateChanged` (`index.html:979`).
2. Com usuário: `loadAll()` lê só `clubs`, `active` e `profile` (`index.html:423`), monta o painel e os
   cartões dos módulos. Sem usuário: tela de login.
3. Abrir um módulo carrega `mod_*.html` no `<iframe id="mfrm">` com `?v=<timestamp>` (`index.html:959`).
4. O módulo carrega o **próprio** adaptador, avisa `FLUXGK_MODULE_READY` e recebe do hub, por `postMessage`,
   o contexto `FLUXGK_CONTEXT`: `uid`, `dataPath`, clube, temporada, técnico e idioma (`index.html:926-958`).
5. O módulo lê e grava sob `dataPath = users/<uid>/data/<clubId>/<seasonId>` (dados da temporada) ou sob
   `users/<uid>/…` (dados globais do técnico, como a biblioteca de exercícios).

---

## Módulo `hub` — `index.html` (992 linhas)

**Propósito.** Login, escolha de clube e temporada, perfil do técnico, painel com contadores e porta de entrada
dos módulos.

### Estado e constantes 🟢
- `APP` (`:345`): `uid`, `profile {coachName, methodology, lang}`, `clubs {id: {meta:{name,abbr,color}, badge, seasons:{id:{label,createdAt}}}}`,
  `active {clubId, seasonId}`, `editingClub`, `_loadFailed`.
- `MODS` (`:328`) e `MOD_FILES` (`:342`): 9 módulos — `planner, period, xg, stats, minutes, video, data, profile, scouting`.
  O `tatica3d.html` não está no hub (🟡 é aberto de dentro de outro módulo).
- `PRESETS` (`:326`): 10 cores de clube. Metodologia padrão: `"Constraints-Led Approach"`.

### Funções principais
| Função | Linha | O que faz |
|---|---|---|
| `boot()` | 960 | carrega o adaptador, liga `onAuthStateChanged`; sem clube, abre o seletor com boas-vindas |
| `doLogin()` | 384 | `setPersistence(LOCAL|SESSION)` + `signInWithEmailAndPassword`; mapeia códigos `auth/*` para mensagens |
| `loadAll()` | 405 | 3 leituras em paralelo com timeout de 20 s e uma nova tentativa após 1,2 s; se o clube/temporada ativos sumiram, escolhe o primeiro clube e a **última** temporada |
| `loadStats()` | 490 | contadores do painel (sessões, jogos, goleiros), ver regras abaixo |
| `openStatList(kind)` | 569 | lista o que está por trás de cada contador |
| `selectClub` / `selectSeason` | 721 / 729 | grava `users/<uid>/active` |
| `addSeason` / `renameSeason` / `deleteSeason` | 736 / 750 / 761 | temporada: id = `slug(label)`; rótulo padrão `AAAA/AA+1` |
| `saveClub` / `deleteClub` | 834 / 867 | clube: id = `slug(nome)`; excluir apaga `clubs/<id>` **e** `data/<id>` |
| `saveSettings` | 894 | grava `profile` e reenvia o contexto ao módulo aberto |
| `ctxPayload` / `pushContext` | 907 / 929 | monta e envia `FLUXGK_CONTEXT` (com o formato antigo `profile{…}` para módulos não migrados) |

### Regras embutidas 🟢
- **Sessões no painel** contam *eventos*, não registros: chave `date|time|trainingType` sobre
  `load/sessions/<goleiro>/<id>`; o registro `pos` herda a identidade do `pre`, e a falta (`abs`) também conta (`:490-510`).
- **Jogos** = número de chaves em `minutes/games` (`:513`).
- **Goleiros** = jogadores em `load/players` com `status` vazio ou `ativo`; os demais (`emprestado`, `lesao`,
  `convocado`, `saida`) aparecem num rodapé (`:516`, `HUB_ST` em `:539`).
- **Falha de carga não é "sem clubes"**: `APP._loadFailed` evita sobrescrever dados quando a leitura falhou (`:446`).
- **Escudo** do clube: imagem até 500 KB, gravada como *data URL* base64 em `clubs/<id>/badge` (`:823`).
- `raceTimeout(p, 4000)` devolve `saved`, `pending` (sem resposta em 4 s, mensagem "salvo offline") ou `error` (`:380`).
- `slug()` corta em 28 caracteres; nome vazio vira `c<timestamp>` (`:361`).

### Achados
- 🟡 **O escudo vai junto em toda carga do hub.** `loadAll` lê `clubs` inteiro, e cada escudo pode ter até ~670 KB
  em base64. Com vários clubes, a primeira tela baixa megabytes; o contexto `FLUXGK_CONTEXT` também carrega o
  escudo para cada módulo aberto.
- 🟡 **"pending" mente desde a migração.** A mensagem "salvo offline" vem do Firebase, que tinha fila local. O
  `fluxdb` não tem fila: se a gravação não voltar em 4 s, nada garante que será feita.
- 🟢 **`postMessage` sem verificação de origem.** O hub envia com `'*'` e nenhum arquivo confere `event.origin`
  (`index.html:949`, `:934`). Oito módulos conferem ao menos `e.source === window.parent`; `mod_data.html` e
  `mod_video.html` não conferem nada. Um site que embutir um desses dois num iframe pode injetar `dataPath`; as
  regras do PocketBase limitam o estrago à conta logada, mas podem induzir gravações nela.
- 🟢 **Não há cadastro na interface.** O hub só tem login; `createUserWithEmailAndPassword` existe no adaptador,
  mas nenhuma página o chama. A coleção `users`, porém, aceita cadastro aberto pela API (`createRule = ''`).

---

## Módulo `fluxdb` — `static/pocketbase-adapter.js` (560 linhas) + `pb_migrations/1760270000_init_fluxgk.js`

**Propósito.** Reproduzir a API do Firebase compat 9.x (`app`, `auth`, `database`) e a fachada modular v10
(usada por `mod_data.html`) sobre o PocketBase, para as páginas mudarem só o prefixo `firebase.` → `fluxdb.`.

### Modelo de dados 🟢
Coleção `nodes { owner → users, path: text(≤1024), data: json(≤5 MB) = {v: <valor>}, created, updated }`,
índice único `(owner, path)` e índice em `path`. Regras: todas `owner = @request.auth.id`. `users`: cadastro
aberto, cada um só vê e edita a si mesmo.

### Algoritmos
- **Leitura (`readPath`, `:211`)** 🟢: busca, com `getFullList(batch 500)`, os nós do dono cujo `path` é um
  ancestral, o próprio caminho ou um descendente (`path~"P/"`, que vira `LIKE '%P/%'`). Monta o valor em três
  camadas: ancestral mais profundo (desce no JSON) → nó exato → descendentes sobrepostos, do mais raso ao mais fundo.
- **Escrita (`writePath`, `:218`)** 🟢: lê os nós relacionados; apaga **todos** os descendentes; se há ancestral e
  não há nó exato, reescreve o JSON inteiro do ancestral; senão cria ou atualiza o nó exato. `null` apaga.
- **`update(obj)`** 🟢: cada chave vira um `writePath` **em sequência** (fan-out multi-caminho do Firebase).
- **`push()`** 🟢: id aleatório de 15 caracteres `[a-z0-9]`; não é ordenável por tempo, ao contrário do Firebase.
- **Tempo real** 🟢: um `subscribe('*')` por página na coleção `nodes`; cada evento chama `notify(path)`, que
  relê **por inteiro** cada listener cujo caminho é ancestral, igual ou descendente do caminho alterado. A
  própria escrita também chama `notify`.
- **Conexão** 🟢: `.info/connected` = `GET /api/health` a cada 20 s.

### Achados
- 🟢 **Custo por gravação: 4 viagens à rede.** Lê antes de gravar, grava, relê pelo `notify` local e relê de
  novo pelo eco do tempo real. Medido em 13/10 numa cópia da stack: 150 sessões gravadas = 602 requisições,
  30 s. A quantidade de dados relidos cresce com o quadrado do número de itens.
- 🟢 **Cada iframe é um cliente completo.** O hub e o módulo aberto carregam o adaptador cada um: duas
  assinaturas SSE, dois `authRefresh`, dois pings de saúde.
- 🟢 **`ServerValue.TIMESTAMP` não é resolvido.** É gravado literalmente como `{".sv":"timestamp"}` (`:506`,
  `:539`). Nenhuma página usa hoje (grep), mas qualquer uso futuro grava lixo.
- 🟢 **"Não lembrar de mim" não funciona.** `setPersistence(SESSION)` só grava a marca `fluxdb_session_only`
  no `sessionStorage`, e ninguém a lê; o token continua no `localStorage`.
- 🟢 **Rate limiting vira erro genérico.** `mapAuthError` traduz 400 → `invalid-credential` e 403 →
  `too-many-requests`, mas o PocketBase responde **429** quando limita, que cai em `auth/internal-error`.
- 🟢 **Reset de senha** é proposital: rejeita e manda o administrador usar o painel `/_/` (sem SMTP).
- 🟡 **Filtro de descendentes sem índice.** `path~"P/"` é `LIKE '%…%'`; o índice de `path` não ajuda, mas a busca
  fica restrita às linhas do dono pelo índice `(owner, path)`.
- 🟢 **Não implementados**, e falham alto: `orderByChild`, `limitToLast`, `transaction`, `onDisconnect`.

---

## Módulo `planner` — `mod_planner.html` (2.197 linhas)

**Propósito.** Planejar sessões de treino de goleiros (exercícios por fase), registrar o pós-treino, manter uma
biblioteca de exercícios reutilizáveis e exportar relatórios.

### Caminhos de dados 🟢
| Caminho | Conteúdo | Escopo |
|---|---|---|
| `<dataPath>/planner/sessions/<id>` | sessão | temporada |
| `users/<uid>/library/exercises/<id>` | exercício da biblioteca | técnico (todas as temporadas) |
| `localStorage['fluxgk_sess_mirror::<uid>::<caminho>']` | espelho das 40 últimas sessões, sem imagens | navegador |
| `localStorage['fluxgk_exercises']` | índice da biblioteca sem imagens | navegador |
| `localStorage['fluxgk_sessions']` | formato antigo, só lido no resgate | navegador |

### Entidades 🟢
- **Sessão** (`_persistSessionToLibrary`, `:2101`): `id` (= `Date.now()`), `date`, `time`, `duration`, `type`, `players`
  (texto separado por vírgula), `objective`, `method`, `clubName`, `exercises[]` (**cópia completa** dos exercícios,
  com imagem), `rating` (0–5), `objMet`, `postPositive`, `postImprovement`, `postAffordances`, `postConstraints`,
  `postEmergent`, `postNext`, `closedAt` (ISO).
- **Exercício** (`confirmEx`, `:734`): `id` (= `Date.now()`), `phase`, `name`, `duration` (padrão 8), `players` (padrão 2),
  `desc`, `goal`, `variations`, `materials`, `img` (data URL), `imgQ` (`'jpeg'` quando já recomprimido), `tatica`
  (cena do `tatica3d`).
- Fases: `warmup | main | complementary | cooldown`. Tipos: `indiv | group | integrated | prematch | recovery`.
  Aliases em PT/EN normalizam valores antigos (`_PHASE_ALIAS`, `_TYPE_ALIAS`, `:1029`).

### Fluxos 🟢
- **Contexto**: aceita `FLUXGK_CONTEXT` só se `e.source === window.parent` (`:499`). Trocar de temporada zera a
  lista até a resposta nova chegar.
- **Gravação protegida** (`:797-860`): sem conexão pronta, o item vai para `_pendingEx`/`_pendingSess`; reenvio a
  cada 15 s, no evento `online` e quando a autenticação chega; `beforeunload` avisa se há pendência. Apagados na
  sessão de uso ficam em `_apagados` para o reenvio não ressuscitá-los, e o listener reapaga o que "voltar".
- **Imagens**: toda imagem não-JPEG ou maior que 400 kB é reduzida para no máximo 1000 px de largura, JPEG 0,88
  (`_shrinkDataUrl`, `:861`). `recompressLibrary` regrava na nuvem os exercícios antigos sem `imgQ`.
- **Listeners** só sobem depois do login (`_ligarListeners`, `:1855`): sessões e biblioteca, cada uma com um
  `on('value')` sobre a lista inteira.
- **Resgate** (`:1385-1490`): mostra sessões que estão só no navegador e varre `users/<uid>/data` atrás de sessões
  em outros clubes ou temporadas (até 4 níveis), com opção de trazer para a temporada aberta.

### Achados
- 🟢 **Notas do pós-treino por goleiro e por exercício não são gravadas.** `refreshPost` desenha um `<textarea>`
  por goleiro e por exercício, sem `id` (`:1196-1214`), e `_persistSessionToLibrary` só salva os seis campos gerais.
  O que o técnico escreve ali se perde ao sair da tela.
- 🟢 **Cada sessão carrega as imagens dos exercícios.** `exercises: exercises.map(e=>({...e}))` copia o `img`
  base64 para dentro da sessão. O `on('value')` de sessões baixa todas, com todas as imagens, a cada mudança.
- 🟢 **O resgate lê a conta inteira.** `buscarOutrasTemporadas` faz `get()` de `users/<uid>/data`, todos os módulos
  e temporadas, inclusive vídeo.
- 🟢 **Importar e restaurar gravam uma sessão por vez** com `await` em laço (`:1420`, `:1483`); com o adaptador
  atual, cada item custa 4 viagens.
- 🟢 Código morto: `JSON.parse('{}' && localStorage.getItem('_disabled_fluxgk_settings')||'{}')` (`:1600`, `:2028`).
- 🟡 `id = Date.now()` como chave: dois itens criados no mesmo milissegundo (laços de importação) colidem.

---

## Módulo `periodization` — `mod_periodization.html` (1.236 linhas)

**Propósito.** Calendário de periodização da temporada: macro, meso e microciclos, eventos, competições e temas
por dia, com exportações em PDF (calendário mensal, período, documento completo).

- 🟢 **Um documento só**: `<dataPath>/periodization = {macro[], meso[], micro[], events[], comps[], dayThemes{}, updatedAt}`.
  Cada `save()` (`:312`) regrava o documento inteiro; um `on('value')` relê o documento inteiro (`:61`).
- 🟢 Ids locais `p` + 7 caracteres aleatórios (`uid()`, `:308`). Cor de destaque padrão `#1E4FFF`.
- 🟢 Contexto aceito só de `window.parent`.
- 🟡 Do ponto de vista do adaptador é o módulo mais barato: um nó, uma linha no banco. O custo cresce com o
  tamanho do documento, não com o número de gravações.

---

## Módulo `xg` — `mod_xg.html` (2.052 linhas)

**Propósito.** Registrar chutes num mapa da quadra e calcular gols esperados (xG) por chute, jogo e equipe.

### Modelo de xG 🟢 (`xgRaw`, `:562`; `computeXG`, `:563`)
Coordenadas normalizadas `(nx, ny)`, gol em `(1 | 0, 0,5)` conforme o lado de ataque. Parâmetros calibráveis
`CFG = {base: 0,85, dist: 1,2, ang: 0,6}` com presets (`applyPreset`, `:585`).

```
distF = max(0, 1 − (dist / √1,25) ^ CFG.dist)
aF    = max(0, 1 − ângulo / (π/2) × CFG.ang)
b     = CFG.base × distF × aF
b    ×= corpo  {pe_forte 1 · pe_fraco 0,82 · cabeca 0,7 · outro 0,55}
b    ×= tipo   {saida_pressao 1,10 · ataque_org 1,0 · transicao 1,12 · lateral 0,85 · escanteio 0,70 ·
                falta 0,75 · penalti 0,76 · tiro10m 0,65 · 5x4 1,25 · 4x3 1,15}
b    ×= 1,10 com assistência;  × 0,82 sob pressão, senão × 1,08
goleiro presente: b ×= 0,62
goleiro ausente:  b = max(b × 1,30, 0,88 − min(dist/0,8, 1) × 0,38)
b    ×= defensores {0: 1 · 1: 0,90 · 2: 0,80 · 3: 0,72 · 4+: 0,65}
xG    = clamp(b, 0,01, 0,97)
```
Exceções fixas: pênalti = 0,76 com goleiro (0,95 sem); tiro de 10 m = 0,65 com goleiro (0,88 sem).

### Dados 🟢
- `<dataPath>/xg/games` — **todos os jogos da temporada num único objeto**, regravado inteiro a cada salvamento
  (`FB.setGames`, `:1447`).
- `users/<uid>/clubs/<clubId>/opponents` — adversários do clube, **compartilhado** com `stats` e `minutes`.
- `users/<uid>/xg-misc/<chave>` — leituras avulsas via `FB.get`.
- `localStorage['xg_settings']` — preferências do módulo.

### Achados
- 🟢 **As configurações do xG nunca chegam à nuvem.** `saveXGSettings` chama `FB.set('settings', XGS)` (`:938`),
  mas o objeto `FB` (`:1437`) não tem método `set`; o `TypeError` é engolido pelo `try` e só o `localStorage`
  guarda. Em outro aparelho, as configurações somem.
- 🟡 **Teto de 5 MB por temporada.** Como os jogos vão num nó só e o campo `data` aceita até 5 MB, uma temporada
  grande deixa de salvar; `setGames` devolve `false` sem aviso ao usuário.

---

## Módulo `stats` — `mod_stats.html` (2.753 linhas)

**Propósito.** Estatística de goleiro por jogo: finalizações sofridas (com ação técnica, momento, distância e
resultado), ações ofensivas do goleiro e relatórios.

### Dados 🟢 (`:25-34`)
| Caminho | Conteúdo |
|---|---|
| `<dataPath>/stats/games/<id>` | jogo: `{id, date, opponent, competition, gk, season, homeAway, venue, gf, ga, outcome, shots[], offActions[]}` (`newGame`, `:840`) |
| `<dataPath>/stats/{gks, comps, skills, moments, offtypes, offresults, hdists}` | listas configuráveis pelo técnico (arrays de texto) |
| `<dataPath>/stats/results` | `[{v, k}]` — resultado da finalização e seu tipo |
| `users/<uid>/clubs/<clubId>/opponents` | `{id: {id, name, badge}}` — compartilhado |

### Fluxo 🟢
- 10 listeners `on('value')`, um por caminho (`:114-137`).
- `persist()` (`:848`) regrava **as 9 listas e os adversários** de uma vez; é chamado em 10 pontos do arquivo
  (ao adicionar ou remover qualquer item de qualquer lista). Com o adaptador, isso dá ~40 requisições por clique.
- Jogo: um nó por jogo (`persistGame`, `:873`); excluir remove o nó.

---

## Módulo `minutes` — `mod_minutes.html` (1.354 linhas)

**Propósito.** Minutagem de cada goleiro por jogo, por tempo e prorrogação, com relatórios em PDF.

### Dados 🟢
- `<dataPath>/minutes/games/<id>` = `{id, date, opp, comp, season, totalMin, halfMin, hasOT, etMin, gkData}`
  (`collectGameData`, `:759`).
- `gkData[<nome do goleiro>] = {selected, h1Ivs, h2Ivs, e1Ivs, e2Ivs, h1Secs, h2Secs, e1Secs, e2Secs, totalSecs}`;
  cada intervalo é `{entry, exit}` e os segundos saem de `intervalSecs` somado por período. Sem prorrogação, `e1/e2` ficam vazios.
- `<dataPath>/minutes/{gks, comps}` e os adversários compartilhados.

### Achados
- 🟡 **O goleiro é identificado pelo nome.** `gkData` usa o nome como chave; renomear um goleiro separa o histórico.
- 🟢 **Três elencos separados**: `minutes/gks`, `stats/gks` (textos) e `load/players` (objetos com `status`, usado
  pelo painel do hub). Nada os sincroniza.

### 🔴 Achado transversal — adversários sobrescritos entre módulos
`stats` (`:870`), `minutes` (`:509`) e `xg` (`:1452`) fazem `set` no **mesmo** caminho
`users/<uid>/clubs/<clubId>/opponents`, cada um a partir da **sua** lista local `ST.clubs`:
- o `minutes` grava `{id, name}` **sem `badge`**, o que apaga os escudos de adversários cadastrados no `stats`/`xg`;
- um adversário que só existe na lista de um módulo é **apagado** quando outro módulo salva;
- vence quem salvou por último.
🟢 Confirmado pela leitura dos três `persist`. 🟡 Em produção, o efeito depende de qual módulo o técnico usa por
último. O hub também lê esse nó em todo boot, porque ele fica dentro de `clubs`.

---

## Módulo `data` (Load Control) — `mod_data.html` (2.648 linhas)

**Propósito.** Controle de carga dos goleiros: elenco (com foto e status), bem-estar pré-treino, PSE pós-treino,
faltas e folgas; métricas de carga (UA, ACWR), gráficos e relatórios. É a fonte de verdade do painel do hub.

### Dados 🟢 (raiz `scopeRoot() = <dataPath>/load`, `:963`)
| Caminho | Conteúdo |
|---|---|
| `load/players/<id>` | `{id, name, photo (data URL), status, statusDesde, statusNota}`; status: `emprestado, lesao, convocado, saida` ou vazio |
| `load/sessions/<playerId>/<id>` | registro de treino: `pre` (bem-estar), `post` (`{pse, duration, ua}`) ou `abs` (falta) |
| `load/config/{branding, wbFields, postFields}` | identidade e campos configuráveis dos formulários |
| `load/trainingTypes` | tipos de treino (somados com a lista local, nunca subtraídos) |
| `localStorage['glc_<scopeRoot>']` | **cópia completa** do estado do módulo (`ST`) |
| `localStorage['glcv5']` | formato anterior ao login; migrado uma vez (`glcv5_migrated`) |

- 🟢 Usa a **fachada modular** do adaptador (`fluxdb.modular`: `ref`, `set`, `update`, `remove`, `onValue`, `:971`).

### Fórmulas 🟢
- **UA** (unidade arbitrária) = `PSE × duração (min)` (`calcUA`, `:1487`; registro `post`, `:1577`).
- **ACWR** = média aguda / média crônica sobre a soma de UA **por data com treino**: aguda = últimos 7 valores,
  crônica = últimos 28 valores (`:2184`, `:2288`, `:1826`). Exige ≥ 4 registros `post`. Faixa "segura" no gráfico: 0,8–1,3.
- 🟡 **As janelas contam dias com treino, não dias de calendário.** Folgas não entram como zero, então "7 dias"
  são as 7 últimas datas com carga. Num grupo que treina 3× por semana, a janela "aguda" cobre ~2,5 semanas e o
  ACWR fica mais estável e mais alto do que o ACWR de literatura (7 e 28 dias corridos). A mesma conta está
  copiada em três lugares.

### Fluxo ao abrir o módulo 🟢 (`:2600-2640`)
1. Recebe o contexto (sem conferir `e.source`).
2. Carrega o estado do `localStorage`.
3. **`rtPushAll()`** (`:1072`): monta um `update` na raiz com **todos** os jogadores (com foto), **todas** as sessões
   locais, branding, campos e tipos, e envia.
4. Só então liga `rtListen()`: um `onValue` sobre **todo** o nó `load`, que funde o remoto no local.

### Achados
- 🔴 **Abrir o Load Control reenvia o cache inteiro ao servidor.** No `fluxdb`, `update` vira um `writePath` por
  chave, **em sequência**, cada um com 4 viagens à rede. Um elenco de 6 goleiros com 300 registros de treino passa de
  1.200 requisições, todas antes de a tela começar a ouvir o banco. 🟡 É o candidato mais forte à lentidão relatada.
- 🔴 **O cache local pode apagar dado mais novo da nuvem.** O `rtPushAll` grava a cópia do navegador **antes** de ler
  a nuvem. Se outro aparelho alterou um registro, abrir o módulo num aparelho com cache antigo desfaz a alteração.
  Registros com o mesmo id são sobrescritos pela versão local.
- 🟢 **Fotos dos goleiros em base64** dentro de `players`, relidas em todo `onValue` do nó `load`.
- 🟢 `rtDeletePlayer` apaga o jogador e todas as suas sessões (`:1069`).
- 🟢 O `localStorage` guarda o estado inteiro; quando estoura, uma versão "enxuta" é gravada (`:1034-1046`).

---

## Módulo `profile` — `mod_profile.html` (5.946 linhas)

**Propósito.** Ficha de cada goleiro: dados pessoais e físicos, avaliações datadas por critérios, diário e
pontos fortes e fracos. Veio de um app anterior ("SemeyDB"); a camada `FDB` (`:2066`) e o `fadapter`
(`:2160`) mantêm a interface antiga sobre o `fluxdb`.

### Dados 🟢
| Caminho | Conteúdo | Dono |
|---|---|---|
| `<dataPath>/load/players` | elenco: **só leitura** aqui (nome e foto vêm do Load Control) | `data` |
| `<dataPath>/profile/gk/<playerId>` | `nick, number, birth, nationality, team, season, contract, height, weight, wingspan, hand, foot, hist, plan, scores, item_notes, strengths, weaknesses, archived` (`PROFILE_FIELDS`) — gravado por `update` | `profile` |
| `<dataPath>/profile/assessments/<playerId>/<data>` | `{date, scores, note}` — **uma avaliação por data**; outra no mesmo dia substitui | `profile` |
| `<dataPath>/profile/log/<playerId>/<id>` | entrada do diário | `profile` |
| `users/<uid>/library/gkCriteria` | modelo de critérios do técnico, entre clubes | `profile` |

- 🟢 Fila de gravação própria (`write`/`flush`): espera o login antes de gravar.
- 🟢 Cinco `on('value')` (elenco, perfis, avaliações, diário, critérios) com `off` guardado para `detach()`.
- 🟢 Tem dicionário próprio de textos, com russo (`ru`) além de `pt`/`en` (`:1300`), fora do `fluxgk-i18n.js`.
- 🟡 `update(patch)` com chaves de primeiro nível: no `fluxdb`, cada campo vira uma gravação sequencial.

---

## Módulo `scouting` — `mod_scouting.html` (927 linhas)

**Propósito.** Observação de goleiros de outros clubes (ligas, etiquetas, países).

- 🟢 Dados **globais do técnico**, fora de clube e temporada: `users/<uid>/scouting = {goalkeepers/<id>, config {ligas, etiquetas, paises}}` (`_base`, `:155`).
- 🟢 **Gravação por diferença**: `subirTudo` (`:178`) só envia os goleiros cujo JSON mudou desde o último envio
  (`_enviado`), num `update` com debounce de 600 ms. É o único módulo que evita reenviar o que não mudou.
- 🟢 Cópia no `localStorage` (chave `CHAVE`); a nuvem substitui a lista local quando o listener responde.
- 🟢 Contexto só de `window.parent`; listener ligado depois do login.

---

## Módulo `video` (Video Lab) — `mod_video.html` (9.352 linhas)

**Propósito.** Análise de vídeo de jogos: marcação de lances, playlists, dashboards, projetos e exportação de
cortes (com e sem sobreposição).

### Mídia 🟢
- **Os vídeos nunca saem do computador.** O arquivo é aberto por `URL.createObjectURL`; o vínculo com a pasta
  fica no IndexedDB `fluxgk_video_fs` via File System Access API (só Chrome/Edge desktop, `:1721`).
- Exportação "original": corte em keyframe sem recodificar, com mp4box 0.5.2 (`:8677`).
- Exportação com título, marca ou resolução: recodifica por canvas + `MediaRecorder` (MP4/AVC1 quando o navegador
  suporta, senão WebM/VP9) (`:7624`).
- `showSaveFilePicker` quando disponível; senão, download.

### Dados 🟢
- **Um documento só**: `<dataPath>/video = {library, dashboards {dashboards, currentId}, projects {list, currentId}, gks, updatedAt}`.
- `pushToCloud` (`:9227`) regrava o documento inteiro, com debounce de 600 ms, a cada alteração; só depois do
  primeiro `pullFromCloud` (`_cloudLoaded`), para não sobrescrever a nuvem com estado vazio.
- `pullFromCloud` (`:9282`): `once('value')`, faz cópia de segurança local e **mescla sessão a sessão**; no
  conflito, fica a versão com mais lances (`libMesclar`).
- Falha de gravação mostra alerta com "tentar de novo" e "baixar cópia" (`_svFalhouNuvem`).

### Achados
- 🟡 **Teto de 5 MB**: o documento cresce com os lances e dashboards; ao passar do `maxSize` do campo `data`, toda
  gravação falha (o alerta aparece, mas o módulo para de salvar na nuvem).
- 🟢 **Cada edição reenvia o documento inteiro**, e o PocketBase devolve o registro inteiro por SSE para **todas** as
  páginas da conta que estão assinando `nodes`: o hub e o próprio módulo. Um documento de alguns MB circula
  três vezes por edição.
- 🟢 Contexto aceito sem conferir `e.source` (`:9125`). Fora do hub, o módulo funciona com parâmetros na URL
  (`club`, `color`, `coach`, `:9169`).

---

## Módulo `tatica3d` — `tatica3d.html` (2.156 linhas)

**Propósito.** Prancheta tática 3D de futsal (three.js): quadra, gols, arquibancada, jogadores e desenhos, com
câmeras predefinidas.

- 🟢 Sem banco. É aberto pelo `planner` num iframe (`tatica3d.html?embed=1`, `mod_planner.html:993`) e devolve a
  cena, que vira o campo `tatica` do exercício.
- 🟢 Modelos `assets/{goleiro,jogador,adversario}.glb` (gerados por `tools/gerar-glb.py`), carregados com `GLTFLoader`
  e clonados com `SkeletonUtils`.

---

## Módulo `i18n` — `fluxgk-i18n.js` (2.275 linhas)

- 🟢 Dois idiomas, `en` (`:24`) e `pt` (`:1092`), ~1.900 chaves. Fallback: chave ausente em `pt` cai no `en`.
- 🟢 Detecção: `localStorage['fluxgk_lang']`, senão `navigator.language` (começa com `pt` → `pt`, senão `en`).
- 🟢 API: `getLang`, `setLang(l, persist)`, `t`/`TX(key, fallback)`, `apply()` (atributos `data-i18n*` no DOM) e `onChange`.
- 🟢 O hub é dono da escolha: os módulos chamam `setLang(lang, false)` e não gravam.

---

## Módulo `infra` — compose, Dockerfiles, nginx, entrypoint

- 🟢 **PocketBase**: binário oficial 0.40.5 baixado no build (`Dockerfile.pocketbase`), usuário sem privilégio
  `pb` (uid 10001), volume `pb_data`. O entrypoint faz upsert do superusuário a cada início e `migrate up`.
- 🟢 **nginx 1.27**: copia arquivo por arquivo para a imagem (pastas do Reversa e `tools/` não vão ao ar);
  gzip; `/health`; SSE em `/api/realtime` sem buffer e com timeout de 24 h; `/api/` e `/_/` em proxy; fontes com
  cache de 1 ano; manifesto e service worker sem cache; `client_max_body_size 512M`.
- 🟢 **IP real** (13/10, commit `a998f07`): `set_real_ip_from` para faixas privadas + `real_ip_recursive`, lido pelo
  PocketBase em `X-Real-IP`.
- 🟢 Porta só em `127.0.0.1:${PORTA_HTTP}`; o Hestia faz TLS e proxy. Sem `container_name`, para HML e PRD conviverem.
- 🟢 **Sem cache para HTML**: as páginas não têm `Cache-Control`; o hub força `?v=<timestamp>` em cada módulo, e
  cada abertura de módulo baixa de novo o HTML inteiro (o `mod_video.html` tem ~440 KB).
- 🔴 LACUNA: não há `sw.js` no repositório, apesar da regra do nginx e do `manifest`. O PWA instala, mas não
  funciona offline.
- 🔴 LACUNA: não há backup do volume `pb_data` no repositório nem no compose.

---

## Resumo transversal

| Tema | Onde | Confiança |
|---|---|---|
| 4 viagens por gravação, releitura inteira a cada mudança | `fluxdb` | 🟢 medido |
| Load Control reenvia todo o cache ao abrir, e pode desfazer dado mais novo | `data` | 🟢 |
| Adversários sobrescritos entre `stats`, `minutes` e `xg` | 3 módulos | 🟢 |
| Imagens base64 em sessões, exercícios, escudos e fotos | `planner`, `hub`, `data` | 🟢 |
| Documentos únicos com teto de 5 MB | `xg/games`, `video`, `periodization` | 🟡 |
| Notas de pós-treino por goleiro e exercício não gravadas | `planner` | 🟢 |
| Configurações do xG só no navegador | `xg` | 🟢 |
| Três elencos de goleiros separados | `data`, `stats`, `minutes` | 🟢 |
| Mensagem "salvo offline" sem fila real | `hub` | 🟢 |
| `postMessage` sem origem; `data` e `video` sem checar a fonte | todos | 🟢 |
