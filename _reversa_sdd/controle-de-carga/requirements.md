# Controle de Carga (Load Control)

## Visão Geral
`mod_data.html`. Monitoramento de carga dos goleiros na temporada: elenco (com foto e status), registro diário de
presença e bem-estar antes do treino, PSE e duração depois do treino, falta e descanso; carga em UA, ACWR, gráficos,
histórico e relatórios em PDF. É **dono do elenco** usado pelo hub e pelo Perfil. 🟢

## Responsabilidades
- Elenco: cadastrar, editar nome e foto, mudar status, reativar, excluir. 🟢
- Pré-treino: presença (presente, falta, descanso), data, horário, tipo de treino e bem-estar. 🟢
- Pós-treino: escolher o pré-treino aberto, PSE 1–10, duração, campos extras; calcula UA. 🟢
- Painel por goleiro com filtro por semanas, gráficos, ACWR; histórico; relatório. 🟢
- Configurar campos de bem-estar e de pós-treino, tipos de treino e identidade visual. 🟢

## Regras de Negócio
- RN-01 Dados da temporada em `<dataPath>/load`: `players/<id>`, `sessions/<playerId>/<id>`, `config/{branding, wbFields, postFields}`, `trainingTypes`. 🟢
- RN-02 Goleiro: id `p_<timestamp>`; nome obrigatório; foto opcional. 🟢
- RN-03 Status: `ativo` (padrão, sem campo), `emprestado`, `lesao`, `convocado`, `saida`, com data de início (padrão hoje) e nota. Fora de `ativo`, sai do seletor de coleta sem apagar nada; reativar remove os três campos. 🟢
- RN-04 Excluir goleiro apaga também todos os registros dele. 🟢
- RN-05 Presença `present` → registro `pre` (id `pre_<ts>`), com bem-estar. `absent` → registro `absence` (id `abs_<ts>`). `rest` → registro `rest` (id `rest_<ts>`). Falta e descanso não coletam bem-estar nem pedem pós-treino. 🟢
- RN-06 Bem-estar padrão: sono (↑ melhor), fadiga, dor muscular, estresse (↓ melhor) e humor (↑ melhor), todos 1–5; os campos são configuráveis (rótulo, faixa, sentido, cor, ativo). 🟢
- RN-07 Registros antigos em escala 1–10 são convertidos uma vez para 1–5 por `round(v/2)` limitado a 1–5 (marca `wbScale: 5`). 🟢
- RN-08 Pós-treino só fecha um pré-treino aberto **do mesmo goleiro**; grava `post_<ts>` com `pse`, `duration`, `ua = pse × duration`, `preId`, data, horário e tipo do pré; o pré recebe `postId`. 🟢
- RN-09 Corrigir data, horário ou tipo do pré leva o pós junto; apagar o pós reabre o pré; apagar o pré fechado apaga o pós. Vínculos quebrados são reparados ao abrir. 🟢
- RN-10 **ACWR** = média das UA das últimas 7 **datas com treino** / média das últimas 28; exige ≥ 4 pós-treinos; faixa de referência 0,8–1,3. **Decisão do dono (D-03):** manter assim, com opção de calcular por dias corridos ativável **só pelo Administrador**. 🟢
- RN-11 Tipos de treino da nuvem e do navegador se **somam**. 🟢
- RN-12 O navegador guarda o estado inteiro (`glc_<raiz>`); sem espaço, guarda versão enxuta (sem fotos, 150 últimos registros, logo vazio); ainda sem espaço, descarta a cópia. 🟢
- 🔴 RN-13 Ao abrir, o módulo **envia ao servidor toda a cópia do navegador antes de ler a nuvem** (`rtPushAll`). Cada jogador é regravado inteiro, o que apaga no servidor foto e status que a cópia local não tenha; registros alterados em outro aparelho voltam à versão local.
- 🔴 RN-14 Descanso e falta hoje contam como sessão no painel do hub; **decisão do dono (D-01, D-08):** descanso conta como descanso e falta como categoria própria.

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | CRUD do elenco com foto | Must | Goleiro novo aparece no seletor e no painel do hub |
| RF-02 | Status com data e nota; reativar | Must | Goleiro emprestado some do seletor e aparece em "Fora do elenco" |
| RF-03 | Pré-treino com presença, data, horário (AM/PM), tipo e bem-estar | Must | Critério de Aceitação 1 |
| RF-04 | Falta e descanso sem bem-estar | Must | Critério de Aceitação 2 |
| RF-05 | Pós-treino ligado ao pré aberto, PSE 1–10, duração, UA | Must | Critério de Aceitação 3 |
| RF-06 | Editar e excluir registros mantendo o par pré/pós | Must | Critérios de Aceitação 4 e 5 |
| RF-07 | Painel por goleiro com filtro por semanas, médias móveis, ACWR e gráficos | Should | ACWR igual ao calculado à mão sobre os dados de teste |
| RF-08 | Histórico, presença por treino e gráfico por tipo de treino | Should | Lista ordenada por data |
| RF-09 | Relatórios em PDF configuráveis (seções e período) | Should | PDF abre com as seções escolhidas |
| RF-10 | Editor de campos de bem-estar e pós-treino; tipos de treino; identidade | Should | Campo novo aparece no formulário e nos gráficos |
| RF-11 | Exportar e importar JSON do elenco e dos registros | Could | Arquivo exportado reimporta sem perdas |
| RF-12 | **Correção:** ao abrir, ler a nuvem primeiro e enviar só o que mudou localmente desde a última sincronização | Must | Critério de Aceitação 6 |
| RF-13 | **Correção:** gravar foto e status sem apagar um ao outro (campos do mesmo nó) | Must | Mudar status não apaga a foto |
| RF-14 | **Evolução (D-03):** parâmetro "método do ACWR" (datas com treino / dias corridos), editável só pelo Administrador | Should | Com "dias corridos", folgas entram como 0 nas janelas de 7 e 28 dias |
| RF-15 | **Evolução (D-02):** ditado por voz nos campos de texto (nota do status, campos extras) | Could | Falar preenche o campo |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Disponibilidade | registro gravado primeiro no navegador, depois na nuvem | `saveSession`, `mod_data.html:1598-1602` | 🟢 |
| Disponibilidade | cópia local reduzida quando falta espaço | `save`, `:1032-1055` | 🟢 |
| Performance | **deficiência:** `rtPushAll` em toda abertura, antes de ler a nuvem; com a fluxdb 1.1, 1 requisição por item (eram ~4 na 1.0) | `:1072-1097` | 🟢 |
| Performance | **deficiência:** listener sobre todo o nó `load` (com fotos) | `rtListen`, `:1099-1163` | 🟢 |
| Segurança | **deficiência:** contexto aceito sem conferir a janela de origem | `:2596-2610` | 🟢 |
| Segurança | textos escapados nos campos configuráveis (`_esc`) | `:787` | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado um goleiro ativo selecionado
Quando o técnico registra presença com sono 4 e fadiga 2
Então surge um pré-treino aberto com wbScale 5 e esses valores

Dado um goleiro ativo
Quando o técnico marca "descanso" e salva
Então é gravado um registro rest sem bem-estar e sem pós-treino pendente

Dado um pré-treino aberto do goleiro A
Quando o técnico registra PSE 7 e 60 minutos para ele
Então o pós-treino tem ua 420 e o pré passa a ter postId

Dado um par pré/pós fechado
Quando o técnico apaga o pós-treino
Então o pré volta a ficar aberto

Dado um par pré/pós fechado
Quando o técnico apaga o pré-treino
Então o pós-treino também deixa de existir

Dado que o aparelho B mudou o status de um goleiro
Quando o aparelho A, com cópia antiga, abre o módulo (após RF-12)
Então o status mudado pelo aparelho B continua valendo

Dado 10 pós-treinos de um goleiro em 10 datas
Quando o painel calcula o ACWR com o método padrão
Então o valor é a média das 7 últimas datas dividida pela média das 10 (todas, pois são menos de 28)
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Elenco, status, pré, pós, falta/descanso, edição (RF-01..06) | Must | Núcleo; alimenta hub e Perfil |
| Sincronização correta e foto/status (RF-12, RF-13) | Must | Perda de dados e lentidão |
| Painel, histórico, relatórios, configuração, ACWR configurável (RF-07..10, RF-14) | Should | Valor alto |
| JSON, voz (RF-11, RF-15) | Could | Apoio |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `mod_data.html` | `defaultWbFields`, `wbFields`, `postFields`, `buildPreFields`, `buildPostFields`, `readFields`, `fillFields`, editor de campos | 🟢 |
| `mod_data.html` | `scopeRoot`, `uPath`, `lsKey`, `fbInit`, `loadUserState`, `save`, `_set`, `_upd`, `_del`, `rt*`, `rtPushAll`, `rtListen` | 🟢 |
| `mod_data.html` | `STATUS`, `squadCard`, `renderSquad`, `openAP`/`apOK`, `openST`/`stOK`, `reativar`, `delPl`, `openPM` | 🟢 |
| `mod_data.html` | `buildPSE`, `calcUA`, `_onAttendanceChange`, `submitPre`, `submitPost`, `saveSession`, `editSession`, `deleteSession` | 🟢 |
| `mod_data.html` | `_wb10to5`, `migrateWellbeingScale`, `repairPrePostLinks` | 🟢 |
| `mod_data.html` | `renderDashboard`, `renderCharts`, `mAvg`, ACWR (`:1826`, `:2184`, `:2288`), `renderHistory`, `renderTypeChart`, `renderAttendanceList` | 🟢 |
| `mod_data.html` | relatórios (`renderReportBuilder`, `mkACWRChart`, exportação), `exportJSON`, `importJSON`, `applyTheme`, `applyBranding` | 🟢 |
