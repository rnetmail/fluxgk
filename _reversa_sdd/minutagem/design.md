# Minutagem, Design Técnico

## Interface

### Páginas (`navTo(page)`) 🟢
| Página | Conteúdo |
|---|---|
| `collect` | dados do jogo; lista de relacionados; blocos de intervalos por período (`h1`, `h2`, `e1`, `e2`); resumo |
| `history` | jogos com filtros; gráficos (prefixo `ch`); editar e excluir |
| `report` | tabela por goleiro com filtros; gráficos (prefixo `rp`); PDF |
| `settings` | listas de goleiros, competições e adversários |

### Entidades 🟢
```jsonc
// Jogo — <dataPath>/minutes/games/<id>
{ "id": 1760300000000, "date": "AAAA-MM-DD", "opp": "nome", "comp": "nome",
  "season": "rótulo da temporada do hub", "totalMin": 40, "halfMin": 20, "hasOT": false, "etMin": 5,
  "gkData": { "<nome do goleiro>": {
      "selected": true,
      "h1Ivs": [{ "entry": "20:00", "exit": "16:38" }], "h2Ivs": [], "e1Ivs": [], "e2Ivs": [],
      "h1Secs": 202, "h2Secs": 0, "e1Secs": 0, "e2Secs": 0, "totalSecs": 202 } } }
// Listas — <dataPath>/minutes/gks, <dataPath>/minutes/comps: string[]
// Adversários — users/<uid>/clubs/<clubId>/opponents/<slug>: { "id": slug, "name": "nome" }   (sem escudo)
```

### Funções principais 🟢
| Símbolo | Assinatura | Retorno | Observação |
|---|---|---|---|
| `parseTime` | `('m:ss')` | `segundos \| null` | exige exatamente um `:` |
| `fmtTime` | `(segundos)` | `'m:ss'` | negativo ou `NaN` → `0:00` |
| `intervalSecs` | `(entrada, saída)` | `segundos` | `max(0, entrada − saída)` |
| `periodMin` | `('h1'\|'h2'\|'e1'\|'e2')` | `minutos` | `g-half-min` (padrão 20) ou `g-et-min` (padrão 5) |
| `buildCollectForm` | `()` | — | relacionados + 4 blocos de intervalos + prorrogação + resumo |
| `buildHalfRows` | `(período)` | — | reconstrói o bloco preservando os intervalos digitados; primeiro intervalo novo começa em `<duração>:00` |
| `addInterval` | `(período, gkId, entrada?, saída?)` | — | nova linha; recalcula totais |
| `updateTotals` / `updateSummary` | `()` | — | totais por intervalo, período e goleiro; % sobre `totalMin` |
| `collectGameData` | `()` | `Jogo` | lê o DOM; ignora `e1/e2` sem prorrogação |
| `saveGame` | `()` | — | valida; `fbSet(games/<id>)`; avisa sucesso ou erro; limpa o formulário |
| `editGame` | `(id)` | — | preenche o formulário e, 0 ms depois, relacionados e intervalos |
| `renderCharts` | `(prefixo, jogos, goleiros)` | — | 6 gráficos (Chart.js) |
| `buildMinutesPDF` | `(jogos, goleiros, opções)` | HTML | relatório imprimível |

`gkId` = nome do goleiro com espaços trocados por `_`; usado em ids de elementos.

## Fluxo Principal
1. Contexto válido da janela pai: caminhos `_MPATH` (jogos, goleiros, competições, adversários), identidade, `ST.seasons = [rótulo da temporada]`; avisa `FLUXGK_MODULE_READY` (module `minutes`) (`mod_minutes.html:16-38`).
2. `_initMinFB` carrega SDK e adaptador **em sequência, esperando cada um** (antes dava "fluxdb.database is not a function"), define `fbSet/fbGet/fbRemove` e, com usuário, liga 4 listeners + conexão (`:46-90`).
3. Primeira resposta de jogos → `bootUI()` (data de hoje, listas, formulário). Respostas seguintes → `refreshAll()`.
4. O técnico preenche dados, marca relacionados e digita intervalos; os totais se atualizam a cada tecla.
5. `saveGame` → `collectGameData` → `fbSet(<dataPath>/minutes/games/<id>)` → mensagem → `resetGameForm` (`:794-822`).
6. O listener de jogos atualiza histórico e relatório; o hub conta os jogos ao fechar o módulo.

## Fluxos Alternativos
- **Prorrogação:** marcar mostra os blocos `e1/e2` e o campo de duração (padrão 5 min) (`:593-598`).
- **Editar jogo:** `editGame` preenche o formulário; goleiros do jogo que **não estão mais na lista** são ignorados (`:907-963`).
- **Erro ao salvar o jogo:** `alert` com a mensagem do erro (`:809`).
- **Falha ao gravar listas:** só `console.error` (`:500-510`).
- **Lista remota vazia:** ignorada (`if(v) ST.x = v`).

## Dependências
- `adaptador-fluxdb`; Chart.js 4.4.1 (CDN). 🟢
- Hub (contexto); o painel do hub lê `minutes/games` (contador "Jogos" e listagem). 🟢
- `fluxgk-i18n.js` (chaves `min.*`). 🟢
- Caminho de adversários compartilhado com `estatistica` e `xg`. 🟢

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---|---|---|
| Cronômetro regressivo do futsal: duração = entrada − saída | comentário `mod_minutes.html:575-578` | 🟢 |
| Temporada vem do hub, não é perguntada | comentário `:763` | 🟢 |
| Prorrogação só entra quando marcada | comentário `:586` | 🟢 |
| Carregamento sequencial do SDK e do adaptador | comentário `:49-51` | 🟢 |
| Jogo é um nó por id | `:800` | 🟢 |

## Estado Interno 🟢
`ST` (`clubs`, `comps`, `gks`, `seasons`, `games`, `editingGameId`, identidade), `_MPATH`, `_HUB`, `_fbReady`,
`_uiBooted`, `_hubSeason`, `ALL_CHARTS`. O jogo em preenchimento vive **só no DOM** (inputs), não em objeto.

## Observabilidade
- Indicador `fb-dot` / `fb-status-text`. 🟢
- `console.log('[FluxGK] minutes: jogos em', …)`, `'autenticado como'`. 🟢
- `alert` em sucesso e erro de gravação de jogo. 🟢

## Riscos e Lacunas
- 🟢 **Relacionados desmarcados no meio do preenchimento:** qualquer resposta de listener chama `refreshAll()` → `buildCollectForm()` → `buildSquadList()`, que recria as caixas de "relacionado" desmarcadas (`:1304-1312`, `:611-636`). Os intervalos são preservados, as marcações não. Como o adaptador avisa duas vezes por gravação e qualquer outro aparelho dispara o listener, isso acontece durante o jogo.
- 🟢 **Editar jogo antigo perde goleiros que saíram da lista:** `editGame` e `collectGameData` só percorrem `ST.gks`; regravar o jogo apaga os minutos de quem não está mais na lista.
- 🟢 ~~Adversários gravados sem escudo no caminho compartilhado~~ — corrigido em 13/10 (D-17).
- 🟢 Percentual sobre `totalMin` ignora a prorrogação (pode passar de 100 %).
- 🟢 Jogo em preenchimento só no DOM: recarregar perde tudo.
- 🟢 `gkId` só troca espaços (`gk.replace(/\s/g,'_')`, `:653`, `:699`, `:728`, `:771`, `:926`): nomes com aspas ou outros símbolos quebram `onclick` e ids; "João Silva" e "João_Silva" colidem.
- 🟡 Ao excluir uma linha de intervalo, os ids `iv-dur-…-<índice>` ficam desalinhados e a duração de linhas seguintes pode deixar de atualizar.
- 🟢 Nomes de goleiro inseridos no HTML sem escapar.
