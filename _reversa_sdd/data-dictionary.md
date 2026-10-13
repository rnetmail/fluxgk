# Dicionário de dados — FluxGK

> Archaeologist, 2026-10-13. Há uma única tabela física (`nodes`); o modelo lógico é a árvore herdada do Firebase
> Realtime Database. Tipos lógicos inferidos do código que grava cada campo (🟢 salvo indicação).

## Físico — PocketBase

### `users` (coleção auth padrão)
| Campo | Tipo | Obrig. | Observação |
|---|---|---|---|
| `id` | text(15) | sim | é o `uid` usado em todos os caminhos |
| `email` | email | sim | login |
| `password` | hash | sim | |
| `name` | text | não | vira `displayName` no adaptador |
| `verified` | bool | — | sem SMTP, nunca verificado |
Regras: `createRule = ''` (cadastro aberto); `list/view/update/delete = id = @request.auth.id`.

### `nodes`
| Campo | Tipo | Obrig. | Observação |
|---|---|---|---|
| `id` | text(15) | sim | gerado pelo PocketBase |
| `owner` | relation → users (1) | sim | cascata ao apagar o usuário |
| `path` | text ≤ 1024 | sim | caminho da árvore, sem barra inicial |
| `data` | json ≤ 5 MB | não | `{v: <valor>}` — o valor pode ser objeto, lista, número, texto ou booleano |
| `created`, `updated` | autodate | — | |
Índices: único `(owner, path)`; `path`. Regras: todas `owner = @request.auth.id`.

## Lógico — árvore `users/<uid>/…`

### Globais do técnico
| Caminho | Tipo | Gravado por | Lido por |
|---|---|---|---|
| `profile` | `{coachName, methodology, lang}` | hub | hub |
| `active` | `{clubId, seasonId}` | hub | hub |
| `clubs/<clubId>/meta` | `{name, abbr, color}` | hub | hub, todos via contexto |
| `clubs/<clubId>/badge` | data URL ≤ 500 KB de arquivo | hub | hub, módulos via contexto |
| `clubs/<clubId>/seasons/<seasonId>` | `{label, createdAt}` | hub | hub |
| `clubs/<clubId>/opponents/<oppId>` | `{id, name, badge?}` | stats, minutes, xg (**sobrescrevem um ao outro**) | stats, minutes, xg |
| `library/exercises/<id>` | Exercício (ver abaixo) | planner | planner |
| `library/gkCriteria` | modelo de critérios | profile | profile |
| `scouting/goalkeepers/<id>` | goleiro observado | scouting | scouting |
| `scouting/config` | `{ligas[], etiquetas[], paises[]}` | scouting | scouting |
| `xg-misc/<chave>` | variado | xg (`FB.get`) | xg |

### Por temporada — `data/<clubId>/<seasonId>/…`
| Caminho | Tipo | Gravado por |
|---|---|---|
| `planner/sessions/<id>` | Sessão | planner |
| `periodization` | `{macro[], meso[], micro[], events[], comps[], dayThemes{}, updatedAt}` | periodization |
| `xg/games` | `{<gameId>: Jogo xG}` — **um nó** | xg |
| `stats/games/<id>` | Jogo de estatística | stats |
| `stats/{gks, comps, skills, moments, offtypes, offresults, hdists}` | `string[]` | stats |
| `stats/results` | `[{v, k}]` | stats |
| `minutes/games/<id>` | Jogo de minutagem | minutes |
| `minutes/{gks, comps}` | `string[]` | minutes |
| `load/players/<id>` | `{id, name, photo?, status?, statusDesde?, statusNota?}` | data |
| `load/sessions/<playerId>/<id>` | Registro de carga | data |
| `load/config/{branding, wbFields, postFields}` | configuração | data |
| `load/trainingTypes` | `string[]` | data |
| `profile/gk/<playerId>` | Perfil do goleiro | profile |
| `profile/assessments/<playerId>/<data>` | `{date, scores, note}` | profile |
| `profile/log/<playerId>/<id>` | entrada do diário | profile |
| `video` | `{library, dashboards, projects, gks, updatedAt}` — **um nó** | video |

## Entidades

### Sessão de treino (planner)
| Campo | Tipo | Observação |
|---|---|---|
| `id` | number | `Date.now()` |
| `date` | `AAAA-MM-DD` | |
| `time` | `HH:MM` | |
| `duration` | texto numérico | minutos |
| `type` | `indiv \| group \| integrated \| prematch \| recovery` | aliases antigos em PT/EN |
| `players` | texto | nomes separados por vírgula |
| `objective`, `method`, `clubName` | texto | |
| `exercises` | Exercício[] | cópia completa, com imagem |
| `rating` | 0–5 | |
| `objMet` | texto \| null | rádio "objetivo atingido" |
| `postPositive`, `postImprovement`, `postAffordances`, `postConstraints`, `postEmergent`, `postNext` | texto | pós-treino |
| `closedAt` | ISO 8601 | |

### Exercício (planner)
| Campo | Tipo | Padrão |
|---|---|---|
| `id` | number | `Date.now()` |
| `phase` | `warmup \| main \| complementary \| cooldown` | `main` |
| `name` | texto | "Sem título" traduzido |
| `duration` | inteiro (min) | 8 |
| `players` | inteiro | 2 |
| `desc`, `goal`, `variations`, `materials` | texto | |
| `img` | data URL \| null | JPEG ≤ 1000 px após recompressão |
| `imgQ` | `'jpeg'` | marca de recompressão feita |
| `tatica` | objeto | cena do tatica3d |

### Jogo de estatística (stats)
`{id, date, opponent, competition, gk, season ('AAAA-AA'), homeAway ('home'|'away'), venue, gf, ga, outcome, shots[], offActions[]}`.
Chute: campos do formulário `SF` + `minute` + `gk` (🟡 estrutura completa a detalhar no Detective).

### Jogo de minutagem (minutes)
`{id, date, opp, comp, season, totalMin, halfMin, hasOT, etMin, gkData}`;
`gkData[<nome>] = {selected, h1Ivs[], h2Ivs[], e1Ivs[], e2Ivs[], h1Secs, h2Secs, e1Secs, e2Secs, totalSecs}`; intervalo `{entry, exit}`.

### Registro de carga (data)
`{id, date, type: 'pre'|'post'|'abs', …}`; `post` = `{pse, duration, ua = pse × duration}`; `pre` = campos de bem-estar
configuráveis (`wbFields`). 🟡 Campos exatos de `pre` dependem da configuração do técnico.

### Perfil do goleiro (profile)
`nick, number, birth, nationality, team, season, contract, height, weight, wingspan, hand, foot, hist, plan, scores, item_notes, strengths, weaknesses, archived`.

## Armazenamento no navegador
| Chave | Módulo | Conteúdo |
|---|---|---|
| `fluxgk_lang` | i18n | idioma |
| `fluxdb_session_only` (sessionStorage) | fluxdb | marca sem efeito |
| token do PocketBase (`pocketbase_auth`) | SDK | sessão |
| `fluxgk_sess_mirror::<uid>::<caminho>` | planner | 40 últimas sessões sem imagem |
| `fluxgk_exercises`, `fluxgk_sessions`, `fluxgk_color`, `fluxgk_badge`, `fluxgk_settings` | planner | índice e legado |
| `glc_<scopeRoot>`, `glcv5`, `glcv5_migrated` | data | estado completo do Load Control |
| `xg_settings` | xg | configurações (só aqui) |
| chave `CHAVE` | scouting | cópia do scouting |
| IndexedDB `fluxgk_video_fs` | video | handles das pastas de vídeo |
