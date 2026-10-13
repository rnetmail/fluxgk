# Estatística, Design Técnico

## Interface

### Páginas (`showPage(name)`) e passos do registro (`recTab(t)`) 🟢
| Página | Conteúdo |
|---|---|
| `dashboard` | KPIs, gráficos (Chart.js 4.4.1), mapas de calor do gol e da quadra, filtros múltiplos e por clique |
| `record` | passos `meta` (dados do jogo) → `shots` (finalizações) → `off` (ações ofensivas) → `review` (revisão e salvar) |
| `history` | jogos salvos; edição de dados e de finalizações no próprio cartão |
| `reports` | filtros e relatório em PDF |
| `settings` | listas configuráveis, tipo de cada resultado, escudos dos adversários |

### Entidades 🟢
```jsonc
// Jogo — <dataPath>/stats/games/<id>
{ "id": 1760300000000, "date": "AAAA-MM-DD", "opponent": "nome", "competition": "nome", "gk": "nome",
  "season": "2026-27", "homeAway": "home|away", "venue": "", "gf": int|null, "ga": int|null,
  "outcome": "W|D|L|''", "shots": [Finalização], "offActions": [AçãoOfensiva] }
// Finalização
{ "minute": "texto", "moment": "rótulo", "skill": "rótulo", "result": "rótulo", "hDistance": "rótulo",
  "goalZone": 1-6, "courtZone": int, "gk": "nome" }
// Ação ofensiva
{ "minute": "texto", "type": "rótulo", "moment": "rótulo", "result": "rótulo", "gk": "nome" }
// Listas — <dataPath>/stats/{gks, comps, skills, moments, offtypes, offresults, hdists}: string[]
// Resultados — <dataPath>/stats/results: [{ "v": "rótulo", "k": "save|goal|blocked|out|post|''" }]
//   (rótulo livre não pode ser chave no PocketBase, por isso lista de pares)
// Adversários — users/<uid>/clubs/<clubId>/opponents/<slug>: { "id": slug, "name": "nome", "badge": "data URL|''" }
```
Os rótulos são guardados como texto; o vínculo entre finalização e lista é o próprio texto (daí a propagação ao renomear).

### Funções principais 🟢
| Símbolo | Assinatura | Retorno | Observação |
|---|---|---|---|
| `newGame` | `()` | `Jogo` | RN-01 |
| `persist` | `()` | — | `set` de 9 listas + adversários; erros só no console |
| `persistGame` / `deleteGameFB` | `(jogo)` / `(id)` | — | um nó por jogo |
| `saveShot` / `saveOffAction` | `()` | — | adicionam ou substituem no jogo em memória `CUR` |
| `saveGame` | `()` | — | valida, grava (`persistGame`), limpa `CUR`, volta ao passo `meta` |
| `outcomeDe` | `(jogo)` | `'W'\|'D'\|'L'\|''` | marcado, senão placar |
| `resKind` | `(rótulo)` | tipo | `ST.resultKinds` → `RESULT_KIND_DEFAULT` |
| `calcStats` | `(finalizações)` | `{total, saves, goals, blocked, out, post, savePct}` | RN-06 |
| `renameResult` / `renameList` | `(i)` / `(key, i)` | — | propagam aos jogos (um `persistGame` por jogo afetado) |
| `drillSet` / `drillClear` | `(campo, valor, ofensiva)` / `()` | — | filtros por clique no painel |
| `goalHeatmapHtml` / `courtHeatmapHtml` | `(finalizações, total, …)` | HTML | mapas de calor |

## Fluxo Principal
1. Carrega Chart.js do cdnjs e `fluxgk-i18n.js`; registra o receptor de contexto e avisa `FLUXGK_MODULE_READY` (module `stats`) (`mod_stats.html:9-48`).
2. Contexto válido da janela pai: define os 10 caminhos (`:24-34`), aplica cor e faixa de contexto e inicia a nuvem.
3. `_initStatsFB`: SDK + adaptador; define `fbSet/fbRemove/fbUpdate/fbGet`; com usuário, `_statsLoadAll` e indicador de conexão (`:59-92`).
4. `_statsLoadAll` liga 11 listeners (`:113-139`): jogos (o primeiro dispara `bootUI`), as listas (cada uma só substitui o estado se vier **não vazia**), resultados (pares rótulo/tipo) e adversários (nomes + escudos).
5. Qualquer lista que chega repinta a página aberta com atraso de 80 ms (`_repintarPagina`), porque sem os tipos de resultado o painel mostrava 0 % de defesas.
6. Registro: passo `meta` → finalizações e ações em `CUR` (memória) → revisão → `saveGame` → `persistGame` → o listener de jogos atualiza histórico e painel.

## Fluxos Alternativos
- **Editar jogo salvo:** `openGameInRecord(id)` carrega o jogo em `CUR` com `editingGameId`; faixa de edição no registro; salvar mantém o id (`:1784-1819`, `:1550-1563`).
- **Editar finalização no histórico:** formulário no cartão do jogo (`showHistShotForm`, `histSaveShot`) grava o jogo inteiro (`:1651-1780`).
- **Renomear item:** prompt; recusa nome repetido; reescreve as finalizações dos jogos (cada jogo afetado é regravado) e do jogo em andamento; `persist()` (`:972-1013`).
- **Lista remota vazia:** ignorada; ficam os padrões locais (`if(v) ST.x = …`).
- **Escudo de adversário:** `uploadClubBadge(nome, input)` → `ST.clubBadges[nome]` → `persist()` (`:1022`).

## Dependências
- `adaptador-fluxdb`. 🟢
- Chart.js 4.4.1 (cdnjs). 🟢
- Hub (contexto). 🟢
- `fluxgk-i18n.js` (chaves `st.*`). 🟢
- Caminho de adversários compartilhado com `minutagem` e `xg`. 🟢

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---|---|---|
| Listas começam vazias para adversários, competições e goleiros (dados de exemplo vazavam para o banco do clube) | comentário `mod_stats.html:799-801` | 🟢 |
| Tipo por resultado, para renomear sem quebrar as contas | comentário `:813-815`; `resKind` | 🟢 |
| Resultados gravados como lista de pares (rótulo livre não pode ser chave) | comentário `:130` | 🟢 |
| Renomear propaga às finalizações gravadas | comentário `:993` | 🟢 |
| Repintar ao chegar qualquer configuração | comentário `:95-101` | 🟢 |
| Jogo é um nó; listas são nós separados | `_SPATH` (`:24-34`) | 🟢 |

## Estado Interno 🟢
`ST` (listas, tipos, jogos, identidade, escudos de adversários), `CUR` (jogo em edição, só memória), `SF` e `OA`
(formulários), `editingGameId`, `editShotIdx`, `editOaIdx`, `lastShotGk`, `CHARTS`, `reportType`, `_drillS`/`_drillO`
(filtros do painel), `_SPATH`, `_HUB`, `_fbReady`, `_uiBooted`.

## Observabilidade
- Indicador `fb-dot` / `fb-status-text` ("live"/"offline"). 🟢
- `console.log('[FluxGK] stats: jogos em', …)`, `'autenticado como'`; `console.error('FB <lista>:', e)` em cada falha de `persist`. 🟢
- Falhas de gravação não aparecem para o usuário. 🟢

## Riscos e Lacunas
- 🔴 Jogo em andamento só em `CUR` (memória): recarregar perde tudo; crítico para uso ao vivo.
- 🟢 ~~`persist()` regrava adversários e apaga escudos dos outros módulos~~ — corrigido em 13/10: mescla item a item com a nuvem, e só depois da primeira leitura (D-17).
- 🟡 Alterar uma lista antes de os listeners responderem grava os padrões locais por cima das listas da nuvem (mesmo padrão da `periodizacao`).
- 🟢 Uma lista esvaziada em outro aparelho não esvazia aqui (lista remota vazia é ignorada).
- 🟢 Cada alteração de lista = 10 gravações; renomear = 1 gravação por jogo afetado. Com a fluxdb 1.1, 1 requisição por nó gravado (eram ~4 na 1.0).
- 🟢 Tipos e desfechos de ação ofensiva não têm renomear com propagação.
- 🟡 Goleiro e adversário identificados por nome: renomear goleiro na lista não atualiza jogos.
- 🟢 Dependência de CDN para os gráficos.
