# Periodização, Design Técnico

## Interface

### Abas (`switchTab(name)`, `.tabbtn[data-tab]`) 🟢
| Aba | Conteúdo |
|---|---|
| `calendar` | calendário mensal com períodos, jogos, metas e temas; formulário de evento; competições |
| `macro`, `meso`, `micro` | linha de criação (`buildAddRow`), calendário do nível (dois cliques), cartões editáveis |
| `overview` | linha do tempo, tabela e calendário geral; botões de PDF |

`micro` também mostra os temas por dia (`renderDayThemes`).

### Documento (`PZ`, `mod_periodization.html:305`) 🟢
```jsonc
{
  "macro": [Período], "meso": [Período], "micro": [Período],
  "events": [{ "id": "p…", "date": "AAAA-MM-DD", "type": "game|target", "label": "", "compId?": "p…", "badge?": "data:image/png (64 px)" }],
  "comps":  [{ "id": "p…", "name": "", "color": "#rrggbb" }],
  "dayThemes": { "<mesoId>|__sem_meso": { "AAAA-MM-DD": "texto" } },
  "updatedAt": 1760300000000
}
// Período = { id: "p"+7, name, start: "AAAA-MM-DD", end: "AAAA-MM-DD", text, color }
```
Campos só de memória (não gravados): `accent`, `clubName`, `clubBadge`, `coachName`.

### Funções principais 🟢
| Símbolo | Assinatura | Retorno | Observação |
|---|---|---|---|
| `save` | `()` | — | `fbSet(_PZPATH, {macro, meso, micro, events, comps, dayThemes, updatedAt: Date.now()})`; erro só no console |
| `pzAdd` / `pzDelete` / `pzSet` | `(level, obj)` / `(level, id)` / `(level, id, campo, valor)` | — | cada uma chama `save()` |
| `evAdd` | `(date, type, label, compId?, badge?)` | — | `type ≠ 'target'` vira `game` |
| `compAdd` / `compDelete` | `()` / `(id)` | — | excluir solta `compId` dos eventos |
| `setDayTheme` | `(mesoId, iso, text)` | — | texto vazio apaga |
| `dayThemesRoot` | `()` | objeto | migra o formato antigo e salva |
| `themesOnDay` | `(iso)` | `[{meso, text, color}]` | só mesos existentes + `__sem_meso` |
| `span` | `()` | `{a, b} \| null` | menor e maior data de períodos e eventos; mínimo 7 dias |
| `_downscaleImg` | `(file, cb)` | — | lado maior ≤ 64 px, PNG |
| `exportMonthlyPDF` / `exportPDF` / `exportRangePDF` | `()` / `()` / `(ini, fim, opt)` | — | HTML em nova janela com botão de imprimir; A4 paisagem no mensal |

## Fluxo Principal
1. Carrega `fluxgk-i18n.js`; registra o receptor de contexto e avisa `FLUXGK_MODULE_READY` (module `period`) (`mod_periodization.html:11-23`).
2. Contexto válido da janela pai: `_PZPATH = dataPath + '/periodization'`; cor de destaque, clube, escudo, técnico e temporada na faixa de contexto; `_initFB` na primeira vez (`:15-28`).
3. `_initFB` carrega SDK e adaptador (reaproveita `<script>` já presente), define `window.fbSet` e, com usuário, liga `on('value')` em `_PZPATH` e em `.info/connected` (`:36-75`).
4. A primeira resposta preenche `PZ` (cada lista só se for array) e chama `bootUI()`; as seguintes chamam `renderAll()` (`:61-71`).
5. Cada edição (`change` dos campos, cliques de cor, criar, excluir) altera `PZ` e chama `save()`, que regrava o documento inteiro; o eco do tempo real volta e redesenha tudo.

## Fluxos Alternativos
- **Fora do hub (arquivo aberto sozinho) ou nuvem lenta:** 1,2 s após carregar, `bootUI()` roda mesmo sem dados (`:1235`).
- **Dois cliques no calendário do nível:** o primeiro marca `_sel[level]`; o segundo ordena as datas e abre `openCreateForm` (`:805-809`).
- **Competição excluída:** eventos perdem `compId` e voltam à cor padrão de jogo (`:495-499`).
- **Temas no formato antigo:** migrados na primeira leitura e salvos (`:552-574`).
- **PDF sem nada para mostrar:** alerta "adicione jogos, metas ou períodos" (`:921`).
- **Troca de idioma:** `FluxGKI18n.onChange` → `renderAll()` (`:1230`).

## Dependências
- `adaptador-fluxdb` (via `/static/vendor/pocketbase.umd.js` + `/static/pocketbase-adapter.js`). 🟢
- Hub, pelo contexto. 🟢
- `fluxgk-i18n.js` (chaves `period.*`, `data.pdf.locale`). 🟢
- `/static/fonts/fonts.css` (também nos PDFs). 🟢
- Navegador: `FileReader`, `canvas`, `window.open`. 🟢

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---|---|---|
| Documento único por temporada, regravado inteiro | `mod_periodization.html:312-314` | 🟢 |
| Ids curtos aleatórios (`p` + 7) em vez de `Date.now()` | `:309` | 🟢 |
| Temas do dia pertencem ao mesociclo ("verde embaixo de verde") | comentário `:597-600` | 🟢 |
| Migração silenciosa do formato antigo de temas | `:553-574` | 🟢 |
| Escudo do evento reduzido a 64 px | `:518-533` | 🟢 |
| UI abre mesmo sem nuvem após 1,2 s | `:1234-1235` | 🟢 |
| Textos escapados antes do HTML | `esc`, `:310` | 🟢 |

## Estado Interno 🟢
`PZ` (documento + identidade), `_PZPATH`, `_HUB`, `_fbReady`, `_uiBooted`, `_hubSeason`, `_sel` (primeiro clique por
nível), mês exibido nos calendários. Persistência: só o documento em `<dataPath>/periodization`.

## Observabilidade
- Indicador `fb-dot` / `fb-status-text`: verde "live", vermelho "offline" (`:72-77`). 🟢
- `console.log('[FluxGK] n tematica(s) reorganizada(s) por mesociclo')`; `console.error('FB period:', e)` em falha de gravação. 🟢
- Falha de gravação **não** é mostrada ao usuário. 🟢

## Riscos e Lacunas
- 🟡 **Gravação antes da primeira leitura apaga o documento.** Se a resposta da nuvem demora (rede lenta; desde a fluxdb 1.1 a carga é uma leitura só, mas continua assíncrona) e a UI já abriu pelo atalho de 1,2 s, a primeira edição grava `PZ` quase vazio por cima do documento inteiro. Falta uma trava "só grava depois do primeiro `on('value')`", como o `video` tem (`_cloudLoaded`).
- 🟢 Falha de gravação só no console: o técnico não sabe que não salvou.
- 🟢 Temas de mesociclo excluído ficam órfãos (`pzDelete` não toca em `dayThemes`).
- 🟢 Sem validação de datas nem de hierarquia (meso dentro de macro): nenhuma comparação entre `start` e `end` no módulo.
- 🟢 Cada caractere confirmado (`change`) regrava o documento inteiro; o eco redesenha todas as abas.
- 🟡 Dois aparelhos editando ao mesmo tempo: vence o último `save()`, sem fusão.
- 🟢 Teto de 5 MB do documento; os escudos de 64 px nos eventos são pequenos, risco baixo.
