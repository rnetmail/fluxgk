# xG System, Design Técnico

## Interface

### Abas (`navTab(tab)`) 🟢
| Aba | Conteúdo |
|---|---|
| `match` | quadra (`<canvas>`), equipes alfa/beta, formulário do chute, estatísticas, registro de chutes (`ovL`) |
| `history` | partidas salvas com filtros (adversário, competição, temporada) |
| `clubs` | adversários (nome, goleiro, escudo) |
| `season` | relatório da temporada |
| `xgsettings` | equipe padrão, técnico, escudo, listas de temporadas e competições |
| `report` | seleção de partidas para PDF |

As abas diferentes de `match` abrem como camada sobre o app, abaixo do cabeçalho e da faixa de contexto.

### Entidades 🟢
```jsonc
// Partida (fxg_games / <dataPath>/xg/games/<id>)
{ "id": "1760300000000", "teamA": "nome", "teamB": "nome", "comp": "texto", "date": "AAAA-MM-DD",
  "shots": [Chute] }                         // "season" é lido pelos filtros mas nunca gravado
// Chute
{ "team": "alfa|beta", "nx": 0.0-1.0, "ny": 0.0-1.0, "atkDir": "left|right",
  "corpo": "pe_forte|pe_fraco|cabeca|outro", "tipo": "saida_pressao|…|tiro10m",
  "assist": bool, "pressao": bool, "gol": bool, "gkPres": bool, "defenders": 0-4, "xg": 0.01-0.97, "min": int }
// Adversário do xG (fxg_clubs / users/<uid>/clubs/<clubId>/opponents/<id>)
{ "id": "1760300000000", "name": "texto", "gk": "goleiro", "img": "data URL" }
// Configurações (xg_settings; nunca na nuvem)
{ "defaultTeamA": "", "coachName": "", "clubBadge": "", "seasons": [], "competitions": [] }
```

### Funções principais 🟢
| Símbolo | Assinatura | Retorno | Observação |
|---|---|---|---|
| `resize` / `geo` | `()` | — / geometria | quadra 40 × 20 m (proporção 2:1); margens de 4,4 % e 5,5 %; `ppm` = pixels por metro |
| `tap` | `(evento)` | — | clique ou toque; fora da quadra é ignorado; define `S.pending` e calcula o xG |
| `atkDir` | `(team)` | `'left' \| 'right'` | alfa ataca à direita quando `alfaLeft` |
| `xgRaw` / `computeXG` | `(nx, ny, team)` | `number` | modelo (RN-02/RN-03) |
| `registrar` | `()` | — | grava `S.pending` como chute em `S.shots` |
| `editShot` / `updateShot` / `delShot` | `(i)` / `()` / `(i)` | — | edição do chute da partida aberta |
| `saveCurrentGame` / `saveEditedGame` | `()` | — | `DB.saveGame` |
| `DB` | `games, saveGame, delGame, clubs, saveClub, delClub` | — | `localStorage` + `syncToCloud` 500 ms depois |
| `FB` | `ready, get, setGames, setOpponents, test, _cfg` | — | ponte com o `fluxdb`; **não** tem `set` |
| `syncToCloud` | `()` | `Promise` | envia `games` e `clubs` inteiros, só se não estiverem vazios |

## Fluxo Principal
1. Dois receptores de contexto: um lê o formato antigo `profile` (cor, escudo, clube, técnico, `:508-520`); outro lê o contexto completo, define `_XPATH.games = dataPath + '/xg/games'` e `_XPATH.opponents = users/<uid>/clubs/<clubId>/opponents` e inicia a nuvem (`:1356-1386`).
2. `_initFBXG` carrega SDK e adaptador; com usuário, faz **uma** leitura de `games` e de `opponents` e, se vierem dados, sobrescreve `fxg_games` e `fxg_clubs` no navegador (`:1400-1436`).
3. Na quadra: tocar → ponto pendente + xG prévio; ajustar contexto; "Registrar" → `S.shots` (`:567-578`).
4. "Salvar partida" → `DB.saveGame` → `localStorage` → `syncToCloud` em 500 ms → `set` da lista inteira em `xg/games` e em `opponents` (`:971-976`, `:831-849`, `:1475-1481`).
5. Histórico, relatório e PDF leem `DB.games()` (do navegador).

## Fluxos Alternativos
- **Editar partida salva:** confirma se há chutes na partida aberta; carrega cópia dos chutes; faixa "Editando partida salva" com Salvar/Cancelar (`:1200-1240`).
- **Pênalti e tiro de 10 m:** valor fixo, ignora o modelo (`:563`).
- **Sem nuvem:** tudo funciona no navegador; nada sobe até a conexão existir.
- **Sincronizar manualmente (`saveFBConfig`):** lê `xg-misc/main` (formato antigo `{games, clubs}`), funde por `id` com o local e envia (`:1483-1498`).
- **Importar (`importFromCloud`):** procura `xg-misc/{main,data,match,game,default}` e substitui o local (`:1506-1519`).
- **`importFromAny`:** lê respostas no formato REST do **Firestore** (`fields.payload.stringValue`), funde e grava no local (`:1539-1563`). 🟡 Resto do diagnóstico antigo; pode servir para a importação opcional dos dados do Firebase (D-06).

## Dependências
- `adaptador-fluxdb`. 🟢
- Hub (contexto antigo e novo). 🟢
- `fluxgk-i18n.js` (chaves `xg.*`). 🟢
- Caminho de adversários compartilhado com `estatistica` e `minutagem` (`../traceability/spec-impact-matrix.md`). 🟢
- Navegador: `<canvas>`, toque, `FileReader`, `localStorage`, `window.open`. 🟢

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---|---|---|
| Local-first: o navegador é a base, a nuvem é cópia enviada depois | `mod_xg.html:831-849` | 🟢 |
| Partidas da temporada num único nó (`set` do objeto inteiro) | `:1446-1448` | 🟢 |
| Código gravado, rótulo traduzido só na tela | comentário `:537` | 🟢 |
| Identidade só do hub; `xg_settings` do navegador não é carregado (compartilhado entre contas) | `:860-862` | 🟢 |
| Sem tempo real: uma leitura ao abrir | `:1424-1433` | 🟢 |

## Estado Interno 🟢
`S` (partida aberta: equipes, competição, data, equipe atual, lado, chutes, pendente, edição, alternâncias, calibração),
`XGS` (configurações), `_HUB`, `_XPATH`, `_fbXGApp`, `_fbXGDb`, `_fbXGReady`, `_hubColor/_hubBadge/_hubClub/_hubCoach`,
`_tab`, `_editClubId`, `_clubImg`. Persistência: `localStorage` (`fxg_games`, `fxg_clubs`, `xg_settings`) e nuvem
(`xg/games`, `opponents`).

## Observabilidade
- Barra `fb-status-bar`: "● Synced" quando a nuvem está pronta (não confirma gravação). 🟢
- `console.warn('xG games pull:'…)`, `'xG opponents pull:'`, `'FB settings write failed:'`. 🟢
- Painel de diagnóstico (`diagFB`, `fb-diag`). 🟢
- `setGames`/`setOpponents` devolvem `false` em erro **sem avisar** o usuário. 🟢

## Riscos e Lacunas
- 🔴 `fxg_games`/`fxg_clubs` sem escopo: troca de temporada ou de conta mistura e envia jogos alheios.
- 🔴 Lista vazia nunca é enviada: excluir o último jogo ou o último adversário não chega à nuvem.
- 🔴 Adversários em formato diferente do da `estatistica` no mesmo caminho; sobrescrita mútua.
- 🔴 `FB.set` inexistente: configurações só no navegador; e `loadXGSettings` não lê o local, então elas se perdem ao recarregar.
- 🟢 `season` nunca gravado; filtro por temporada inútil.
- 🟢 Sem tempo real: outro aparelho só vê mudanças ao reabrir; e, ao reabrir, a nuvem sobrescreve o local (alteração local não enviada se perde).
- 🟡 Teto de 5 MB para todos os jogos da temporada.
- 🟢 Textos fixos em português no relatório (`renderSeason`: "Nenhuma partida salva ainda.", "Gols") e "Editando partida salva" fora da tradução.
- 🟢 Nomes de equipes inseridos no HTML sem escapar (`gameCardHtml`).
