# Perfil do Goleiro, Design Técnico

## Interface

### Organização do arquivo (blocos concatenados de um app anterior) 🟢
| Bloco | Linhas | Papel |
|---|---|---|
| CSS e fontes de relatório (`ReportFonts`) | 1–888 | estilo, tokens alinhados aos outros módulos |
| `i18n-flux.js` | 889–1343 | `COMPETENCIAS` (modelo de fábrica) e dicionário `T` em pt/en/ru |
| `color.js` → `ColorKit` | 1344–1616 | paleta acessível (OKLCH, contraste, simulação de daltonismo), cores extraídas do escudo |
| `model.js` → `ModelKit` | 1617–1808 | modelo de critérios: fábrica, normalização, médias, conversão de escala |
| `charts.js` → `Charts` | 1809–2004 | gráficos SVG próprios (linhas e barras agrupadas), sem Chart.js |
| `fdb.js` → `FDB` | 2005–2163 | caminhos, fila de escrita, listeners |
| `fadapter.js` → `Adapter` | 2164–2362 | interface do antigo "SemeyDB" sobre o `FDB` |
| `report-flux.js` → `Reports` | 2363–3792 | PDFs com pdf-lib + fontkit, ZIP com jszip |
| `app-flux.js` → `App` | 3793–5908 | estado, telas, eventos, boot |
| handshake com o hub | 5909–5946 | contexto e `FLUXGK_MODULE_READY` |

### Telas (`App.view`) e abas da ficha (`App.tab`) 🟢
`squad` (elenco) · `gk` com abas `geral`, `aval` (avaliação), `plano` (plano de desenvolvimento), `diario` (diário),
`evol` (evolução) · `compare` · `group` · `reports` · `params` (critérios e identidade).

### Caminhos 🟢
| Ref | Caminho | Uso |
|---|---|---|
| `loadRef('players')` | `<dataPath>/load/players` | elenco, só leitura |
| `dataRef('gk/<id>')` | `<dataPath>/profile/gk/<id>` | ficha (update de campos) |
| `dataRef('assessments/<id>/<data>')` | `<dataPath>/profile/assessments/<id>/<AAAA-MM-DD>` | `{date, scores: {<itemId>: nota}, note}` |
| `dataRef('log/<id>/<entrada>')` | `<dataPath>/profile/log/<id>/<entrada>` | diário |
| `libRef('gkCriteria')` | `users/<uid>/library/gkCriteria` | modelo de critérios |

### Modelo de critérios (`ModelKit.factory`) 🟢
```jsonc
{ "v": 1, "scale": { "min": 1, "max": 5 },
  "levels": [{ "v": 1, "label": { "pt": "…", "en": "…", "ru": "…" } }, …],
  "axes": [{ "id": "A", "label": {pt,en,ru}, "short": {…}, "micro": {…},
             "items": [{ "id": "a1", "pt": "Defesa de curta distância", "en": "…", "ru": "…" }, …] }, …] }
```

### Interface do `Adapter` (herdada) 🟢
| Método | Comportamento |
|---|---|
| `listGoalkeepers()` | elenco do Load Control + campos de perfil (`merged`) |
| `createGoalkeeper()` / `deleteGoalkeeper()` | lançam `ROSTER_READONLY` |
| `updateGoalkeeper(id, patch)` | filtra por `PROFILE_FIELDS`; `undefined` → `null`; `update` em `profile/gk/<id>` |
| `listAssessments(gkId \| null)` / `upsertAssessment(gk, data, notas, obs)` / `deleteAssessment('gk\|data')` | avaliações |
| `listLogs` / `saveLog` / `deleteLog` | diário |
| `saveModel(model)` | `set` em `library/gkCriteria` |
| `signIn` / `signOut` | lançam erro: o acesso é pelo hub |

## Fluxo Principal
1. O handshake avisa `FLUXGK_MODULE_READY` (module `profile`) e espera o contexto da janela pai; contexto incompleto mostra "abra pelo hub"; aplica a cor do clube e chama `bootFromHub` (espera até 3 s pelo parse) (`mod_profile.html:5909-5946`).
2. `bootFromHub(ctx)`: idioma, identidade (o escudo é convertido para PNG para o PDF), casca da tela, `FDB.init` (carrega SDK e adaptador, espera o login, esvazia a fila) (`:5841-5880`, `:2079-2096`).
3. Cinco listeners alimentam o `cache`; cada um chama `refresh()`, que recalcula elenco, avaliações e a ficha aberta e redesenha. A primeira vez abre o elenco (`:5882-5904`).
4. Modelo: se não houver na nuvem, grava o de fábrica; sempre normalizado (`:5898-5903`).
5. 1,5 s depois, `fixOutOfRange()` corrige notas acima da escala (`:5435`).
6. Editar a ficha: `setP` altera `App.cur` → `queueSave(patch)` → 0,9 s → `flushSave` → `updateGoalkeeper` (`:3991-4019`).
7. Avaliar: notas por item na aba `aval` → `upsertAssessment(gk, data, notas, obs)`.

## Fluxos Alternativos
- **Antes do login:** escritas vão para a fila e devolvem `'pending'` (`write`, `:2061-2068`).
- **Escrita falha:** volta para a fila e devolve `'error'`; a fila só é esvaziada no `init` (ver Riscos).
- **Falha em `flushSave`:** aviso com a mensagem; o patch volta a ficar pendente (`:4008-4013`).
- **Notas acima da escala:** `fixOutOfRange` assume escala de origem `min…max(10, maior nota)` e **regrava** fichas e avaliações convertidas.
- **Relatório com russo:** carrega fontes cirílicas (`precisaCirilico`, `:3680`).
- **Contexto repetido** (troca de idioma no hub): ignorado depois do primeiro (`booted`).

## Dependências
- `adaptador-fluxdb` (SDK + adaptador carregados pelo próprio módulo). 🟢
- Load Control (`controle-de-carga`), dono do elenco. 🟢
- Hub (contexto: `uid`, `dataPath`, clube com cor e escudo, idioma). 🟢
- pdf-lib 1.17.1, @pdf-lib/fontkit 1.1.1, jszip 3.10.1, fontes @fontsource (jsDelivr), carregadas sob demanda. 🟢
- **Não** usa `fluxgk-i18n.js` (dicionário próprio). 🟢

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---|---|---|
| Interface do app antigo preservada por um adaptador ("as telas não sabem que a base mudou") | `fadapter.js`, `:2164-2180` | 🟢 |
| Elenco é do Load Control; critérios são do técnico | comentário `:2173-2178` | 🟢 |
| Fila de escrita até o login | comentário `:2046-2047` | 🟢 |
| Abreviação do eixo derivada do nome | comentário `:1688-1690` | 🟢 |
| Gráficos e paleta próprios, com checagem de contraste e daltonismo | `ColorKit`, `Charts` | 🟢 |
| Capa do PDF idêntica à do relatório da Minutagem | comentário `:2969-2980` | 🟢 |

## Estado Interno 🟢
`App` (usuário, idioma, tema, tela, aba, `gks`, `allAssess`, `cur`, `curAssess`, `curLogs`, seleção para comparar,
métrica, modelo e rascunho, identidade e rascunho, opções de relatório, `saveState`); `FluxAdapter.cache`
(`roster`, `profiles`, `assessments`, `logs`, `model`); `FDB` (`db`, `uid`, `base`, `ready`, `queue`, `listeners`);
`pending`/`saveTimer` da gravação automática. Preferências de tela no `localStorage` (`prefs`).

## Observabilidade
- Indicador de gravação (`markSave`: `idle`/`saving`/`saved`/`error`) e `toast`. 🟢
- `console.warn('[perfil] escrita falhou:' …)`, `console.error('[FluxGK] perfil: contexto incompleto' …)`. 🟢
- Progresso da geração de PDF (`rp.status`). 🟢

## Riscos e Lacunas
- 🟢 **Fila sem reenvio periódico:** escrita que falha volta à fila, mas a fila só é esvaziada no `init`; até recarregar, o dado não sobe e se perde se a aba fechar.
- 🟡 **Correção silenciosa de notas:** `fixOutOfRange` regrava todas as fichas e avaliações com uma escala de origem **suposta**; uma nota digitada errado (ex.: 50) muda a escala de todos. Deveria perguntar.
- 🟢 Cada listener redesenha a tela inteira (`refresh` → `render`); o foco é restaurado, mas o custo cresce com o elenco.
- 🟢 Identidade padrão "Semey" (nome do app antigo) até o hub enviar o clube (`:3822`).
- 🟢 Ficha presa à temporada (`<dataPath>/profile`, `:2070`): trocar de temporada começa do zero.
- 🟢 Dicionário próprio (pt/en/ru) separado do `fluxgk-i18n.js` (en/pt): D-10 pede unificar.
- 🟢 `update` de vários campos = várias gravações em sequência no adaptador atual.
