# Controle de Carga, Design Técnico

## Interface

### Seções (`showSection(id)`) 🟢
| Seção | Conteúdo |
|---|---|
| `squad` | cartões do elenco (ativos e "Fora do elenco"), adicionar, status, perfil do goleiro |
| `pre` | presença (presente / falta / descanso), data, horário AM/PM, tipo de treino, bem-estar |
| `post` | pré-treinos abertos do goleiro, PSE 1–10, duração, UA, campos extras |
| `dash` | painel do goleiro com filtro por semanas e gráficos (Chart.js) |
| `history` | registros do goleiro, editar e excluir; presença por treino; gráfico por tipo |
| `report` | montador de relatório em PDF |

Modais: adicionar goleiro (`apOv`), status (`stOv`), perfil do goleiro (`pmOv`), configurações (`settingsOverlay`,
com editor de campos e identidade).

### Entidades 🟢
```jsonc
// Goleiro — <raiz>/players/<id>   (raiz = <dataPath>/load)
{ "id": "p_1760300000000", "name": "texto", "photo": "data URL?",
  "status": "emprestado|lesao|convocado|saida (ausente = ativo)", "statusDesde": "AAAA-MM-DD", "statusNota": "texto" }
// Registro — <raiz>/sessions/<playerId>/<id>
{ "id": "pre_…|post_…|abs_…|rest_…", "type": "pre|post|absence|rest", "date": "AAAA-MM-DD", "time": "HH:MM",
  "trainingType": "texto", "ts": 1760300000000,
  // pre:      "present": true, "wbScale": 5, "<campo de bem-estar>": 1-5 …, "postId": "post_…|null"
  // post:     "pse": 1-10, "duration": min, "ua": pse*duration, "preId": "pre_…", "<campo extra>": …
  // absence/rest: "present": false
}
// Configuração — <raiz>/config/branding {name, color, logo, sub}, config/wbFields [Campo], config/postFields [Campo]
// Campo = { key, label, min, max, lowLabel, highLabel, dir: "up|down", color, active }
// Tipos de treino — <raiz>/trainingTypes: string[]
```
No navegador, cada registro ganha `_pk` (id do goleiro), retirado antes de gravar.

### Funções principais 🟢
| Símbolo | Assinatura | Retorno | Observação |
|---|---|---|---|
| `scopeRoot` / `uPath` / `lsKey` | `()` / `(p)` / `()` | caminho / caminho / chave | raiz `<dataPath>/load` (sem contexto: `users/<uid>/data/_default/load`) |
| `fbInit` | `()` | `Promise<bool>` | usa `fluxdb.modular` (`initializeApp`, `getAuth`, `getDatabase`) |
| `loadUserState` | `()` | — | lê `glc_<raiz>`; sem ela, migra uma vez o formato `glcv5` |
| `save` | `()` | — | grava o estado no navegador (inteiro, enxuto ou nada) |
| `_set` / `_upd` / `_del` | `(caminho, dado?)` | — | ponte com o adaptador; amarelo/verde/vermelho no `syncDot` |
| `rtSaveSession` / `rtDeleteSession` / `rtSavePlayer` / `rtSaveStatus` / `rtSavePhoto` / `rtDeletePlayer` / `rtSaveBrand` | — | — | gravações pontuais |
| `rtPushAll` | `()` | `Promise` | `update` na raiz `/` com **tudo** do navegador |
| `rtListen` | `()` | — | `onValue` na raiz `load`; funde o remoto no local |
| `submitPre` / `submitPost` | `()` | `Promise` | validam, montam o registro e chamam `saveSession` |
| `saveSession` | `(registro)` | — | substitui por id no estado, `save()`, `renderAll()`, `rtSaveSession` |
| `repairPrePostLinks` / `migrateWellbeingScale` | `()` | `n` | consertos idempotentes |
| `getPS` / `getFS` | `()` | registros | do goleiro atual / filtrados por semanas |

## Fluxo Principal
1. Contexto (sem conferir a janela de origem): `_uid`, `_base = dataPath`, `_cfg`; idioma; identidade pelo formato antigo `profile` (`mod_data.html:2596-2620`).
2. Primeira vez: `fbInit()` → `onAuthStateChanged`. Com usuário: indicador verde → `loadUserState()` → **`rtPushAll()`** → `rtListen()` → `renderAll()` (`:2621-2636`).
3. `rtPushAll` monta um objeto com caminhos completos (jogadores, foto, status, todos os registros, branding, campos, tipos) e chama `update` na raiz (`:1072-1097`). No adaptador, cada chave vira uma gravação em sequência.
4. `rtListen` liga `onValue` no nó `load` inteiro (`:1099-1163`) e funde:
   - campos e branding: substitui se diferente;
   - tipos de treino: **união**;
   - jogadores: acrescenta os que faltam; foto só se o local não tem; status sempre do servidor;
   - registros: **só acrescenta** ids que o local não tem.

   Depois: migração de escala, reparo de vínculos, `save()` e `renderAll()`.
5. Coleta: `submitPre` (presente → `pre`; falta → `absence`; descanso → `rest`) e `submitPost` (fecha o pré do mesmo goleiro, `ua = pse × duração`, grava o `postId` no pré) (`:1497-1597`).

## Fluxos Alternativos
- **Primeiro uso com dados antigos (`glcv5`):** importados para o primeiro clube aberto, gravados e enviados; a marca `glcv5_migrated` impede repetir (`:991-1009`).
- **Pré escolhido é de outro goleiro:** recarrega a lista e pede para escolher de novo (`:1566-1570`).
- **Editar o pré:** mantém o `postId`; se data, horário ou tipo mudaram, o pós acompanha (`:1531-1550`).
- **Excluir:** pós → reabre o pré; pré fechado → apaga o pós; cada parte é enviada (`:1700-1720`).
- **Sem espaço no navegador:** versão enxuta; sem espaço de novo, descarta a cópia (`:1032-1055`).
- **Mudar status:** fora de `ativo`, se era o goleiro em coleta, o seletor fica vazio (`:1331-1346`).

## Dependências
- `adaptador-fluxdb`, **fachada modular** (`../adaptador-fluxdb/contracts.md`, seção 5). 🟢
- Hub (contexto antigo e novo); o hub e o `perfil` leem `load/players` e `load/sessions`. 🟢
- Chart.js 4.4.1 (cdnjs/jsDelivr), Tabler Icons 2.44.0 (jsDelivr). 🟢
- `fluxgk-i18n.js` (chaves `data.*`). 🟢

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---|---|---|
| Gravar no navegador primeiro (instantâneo), nuvem em segundo plano | `saveSession`, `:1598-1602` | 🟢 |
| A nuvem é a fonte da verdade; o local basta para abrir offline (cache já chegou a 3,1 MB) | comentário `:1027-1031` | 🟢 |
| Status vem do servidor ("quem afastou num aparelho afasta em todos") | comentário `:1141` | 🟢 |
| Tipos de treino somados dos dois lados (antes eram gravados e nunca lidos) | comentário `:1116-1119` | 🟢 |
| Falta e descanso sem bem-estar; descanso separado da falta (é planejado) | comentários `:1494`, `:1515-1516` | 🟢 |
| Trava: pós só fecha pré do mesmo goleiro | comentário `:1565-1567` | 🟢 |
| Escala de bem-estar 1–5 com migração única | comentário `:1604-1606` | 🟢 |
| Isolamento por clube e temporada (`users/<uid>/data/<clube>/<temporada>/load`) | comentário `:944-947` | 🟢 |

## Estado Interno 🟢
`ST` (`players`, `sessions` com `_pk`, `brand`, `wbFields`, `postFields`, `trainingTypes`, `currentPlayer`,
`filterWeeks`), `_db`, `_rf`, `_auth`, `_af`, `_uid`, `_base`, `_cfg`, `_listening`, `_fbStarted`, `selPSE`,
`editId`, `CH` (gráficos), `_apPh`, `_stId`, `_stSel`, `_pmId`, `_fldTab`. Persistência: `localStorage['glc_<raiz>']` e a nuvem.

## Observabilidade
- `syncDot` (amarelo/verde/vermelho), selo de banco (`dbBadge`), `showToast`, `statusBar`. 🟢
- `console.log('[FluxGK] Load Control scope =', …)`, `FLUXGK_DATA_BUILD` ("data v3 — fluxgksystem + club-isolated 2026-07-16"), `'vinculos pre/pos reparados: n'`. 🟢
- Falhas de `_set`/`_upd` só no console + ponto vermelho; `_del` engole o erro. 🟢

## Riscos e Lacunas
- 🟢 ~~**`rtPushAll` antes de ler:**~~ corrigido em 13/10 (reconciliação; ver RN-13 e `tools/test-carga.mjs`).
- 🟢 ~~**Foto e status apagados:**~~ corrigido em 13/10 (reconciliação; ver RN-13 e `tools/test-carga.mjs`).
- 🟢 ~~**Exclusões e edições de outro aparelho não chegam:**~~ corrigido em 13/10 (reconciliação; ver RN-13 e `tools/test-carga.mjs`).
- 🟢 Listener no nó `load` inteiro, com fotos, a cada mudança.
- 🟢 Contexto aceito sem conferir `e.source`.
- 🟡 Migração `glcv5`: dados antigos do navegador vão para a conta e o clube de quem abrir primeiro (computador compartilhado).
- 🟢 A fórmula do ACWR está copiada em três lugares (`:1826`, `:2184`, `:2288`); a configuração por Administrador (D-03) exige um ponto único.
- 🟢 `_del` sem tratamento de erro: exclusão que falha some do local e volta no próximo `rtPushAll`.
