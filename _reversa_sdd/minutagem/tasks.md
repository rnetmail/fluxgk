# Minutagem, Tarefas de Implementação

## Pré-requisitos
- [ ] Hub entregando `FLUXGK_CONTEXT` com `season.label` (`../hub/contracts.md`)
- [ ] `adaptador-fluxdb` com `set`, `get`, `remove`, `on('value')` e `.info/connected`
- [ ] Chart.js 4.4.1
- [ ] **Decisão sobre o formato único de adversário** (`../xg/tasks.md`, T-15)
- [ ] Chaves `min.*` em `fluxgk-i18n.js`

## Tarefas

### Paridade com o legado

- [ ] T-01, Contexto, caminhos (`_MPATH`), identidade, temporada única nos filtros, conexão sequencial do SDK e listeners
  - Origem no legado: `mod_minutes.html:13-95`
  - Critério de pronto: o módulo carrega jogos, goleiros, competições e adversários da temporada
  - Confiança: 🟢

- [ ] T-02, Cálculo de tempo (`parseTime`, `fmtTime`, `intervalSecs`, `gkTotalSecs`, `periodMin`)
  - Origem no legado: `mod_minutes.html:561-592`
  - Critério de pronto: Critérios de Aceitação 1 e 2; testes unitários para `m:ss`, vazio e inválido
  - Confiança: 🟢

- [ ] T-03, Formulário do jogo: relacionados, blocos de intervalos por período com preservação ao reconstruir, prorrogação, totais ao vivo, resumo
  - Origem no legado: `mod_minutes.html:593-758`
  - Critério de pronto: marcar prorrogação mostra `e1/e2`; o resumo mostra tempo e % por goleiro
  - Confiança: 🟢

- [ ] T-04, Coleta e gravação (`collectGameData`, `saveGame`, `resetGameForm`)
  - Origem no legado: `mod_minutes.html:759-822`
  - Critérios de pronto: Critérios de Aceitação 3 e 4; mensagem de sucesso e de erro
  - Confiança: 🟢

- [ ] T-05, Histórico, filtros, edição e exclusão (`getFilteredGames`, `renderHistory`, `editGame`, `cancelEdit`, `deleteGame`)
  - Origem no legado: `mod_minutes.html:824-972`, `:1056-1061`
  - Critério de pronto: editar e salvar mantém o id
  - Confiança: 🟢

- [ ] T-06, Gráficos (`renderCharts`, `mkBar`, `mkDoughnut`, `destroyChart`)
  - Origem no legado: `mod_minutes.html:973-1055`
  - Critério de pronto: os 6 gráficos com os mesmos números da tabela
  - Confiança: 🟢

- [ ] T-07, Relatório e PDF (`populateRepFilters`, `renderRepTable`, `exportReport`, `exportGameReport`, `buildMinutesPDF`)
  - Origem no legado: `mod_minutes.html:1062-1303`
  - Critério de pronto: PDF geral e de um jogo abrem em nova aba
  - Confiança: 🟢

- [ ] T-08, Listas (`persist`, `renderList`, `addItem`, `removeItem`, `populateAllSelects`) e navegação (`navTo`, `refreshAll`, `bootUI`)
  - Origem no legado: `mod_minutes.html:479-560`, `:1304-1324`
  - Critério de pronto: novo goleiro aparece no formulário
  - Confiança: 🟢

### Correções

- [ ] T-09, Não reconstruir o formulário em andamento a cada resposta de listener: atualizar só os selects e, se a lista de goleiros mudou, acrescentar ou remover linhas preservando relacionados e intervalos
  - Origem no legado: `refreshAll` (`:1304-1312`), `buildSquadList` (`:611-636`)
  - Critério de pronto: salvar uma competição em outro aparelho não desmarca nenhum relacionado
  - Confiança: 🟢

- [ ] T-10, Editar jogo antigo preserva goleiros que não estão mais na lista (mostrar como "fora da lista" e regravar seus dados intactos)
  - Origem no legado: `editGame` (`:907-963`), `collectGameData` (`:769-790`)
  - Critério de pronto: remover um goleiro da lista e editar um jogo antigo mantém os minutos dele
  - Confiança: 🟢

- [ ] T-11, Percentuais com denominador incluindo a prorrogação (`totalMin + 2 × etMin` quando `hasOT`)
  - Origem no legado: `updateSummary` (`:719-758`), `renderCharts` (`:1003`, `:1022`), `renderRepTable`
  - Critério de pronto: Critério de Aceitação 5
  - Confiança: 🟢

- [x] T-12, Adversários no formato único, item a item (junto com `estatistica` e `xg`) — **feito em 13/10** (`fluxgkMesclarAdversarios`, igual nos três módulos; teste `tools/test-adversarios.mjs` no CI). O cadastro pelo hub (dono, D-17) fica para depois
  - Origem no legado: `persist` (`:500-510`), listener de adversários
  - Critério de pronto: Critério de Aceitação 6
  - Confiança: 🟢

- [ ] T-13, Rascunho do jogo em preenchimento (navegador; opcional na nuvem), com retomada ao abrir
  - Origem no legado: jogo vive só no DOM (`collectGameData` lê os inputs)
  - Critério de pronto: recarregar no intervalo mantém relacionados e intervalos
  - Confiança: 🟢

- [ ] T-14, Identificador de linha do goleiro independente do nome (índice ou hash) e nomes escapados no HTML
  - Origem no legado: `gk.replace(/\s/g,'_')` (`:615`, `:648`, `:700`, `:770`)
  - Critério de pronto: goleiro `D'Ávila` funciona; "João Silva" e "João_Silva" não colidem
  - Confiança: 🟢

- [ ] T-15, Durações por linha sem depender do índice (corrigir desalinhamento após excluir linha)
  - Origem no legado: `addInterval` (`:672-696`), `updateTotals` (`:697-718`)
  - Critério de pronto: excluir a 1ª de 3 linhas mantém as durações certas nas outras duas
  - Confiança: 🟡

- [ ] T-16, Avisos de qualidade: intervalo fora do período, sobreposição no mesmo goleiro, dois goleiros em quadra ao mesmo tempo
  - Origem no legado: inexistente
  - Critério de pronto: entrada 21:00 num tempo de 20 min gera aviso (sem bloquear)
  - Confiança: 🟡

- [ ] T-17, Falha ao gravar listas visível; lista remota vazia tratada (ver `../estatistica/tasks.md`, T-16)
  - Origem no legado: `persist` (`:500-510`)
  - Critério de pronto: gravação recusada mostra aviso
  - Confiança: 🟢

### Evolução decidida pelo dono

- [ ] T-18, Modo ao vivo: cronômetro regressivo do período na tela; tocar "entra/sai" num goleiro grava o horário corrente; o mesmo por voz ("entra João", "sai João") (D-02)
  - Origem no legado: intervalos digitados à mão (`addInterval`)
  - Critério de pronto: um jogo inteiro registrado sem digitar horários
  - Confiança: 🟢 (D-25: o técnico informa o horário do placar, com atalho "agora"; D-26: voz do navegador primeiro)

## Tarefas de Teste

- [ ] TT-01, Cálculo de intervalo (Critérios 1 e 2)
- [ ] TT-02, Prorrogação desmarcada ignora `e1/e2` (3)
- [ ] TT-03, Salvar sem adversário (4)
- [ ] TT-04, Percentual com prorrogação (5, após T-11)
- [ ] TT-05, Adversários entre módulos (6, após T-12)
- [ ] TT-06, Listener durante preenchimento não desmarca relacionados (após T-09)
- [ ] TT-07, Editar jogo com goleiro fora da lista (após T-10)

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, Adversários para o formato único (junto com `../xg/tasks.md`, TM-02)

## Ordem Sugerida
1. T-09 e T-13: afetam o preenchimento durante o jogo.
2. T-01 a T-08 com TT-01 a TT-03 como linha de base.
3. T-10 e T-12 + TM-01.
4. T-11, T-14, T-15, T-16, T-17.
5. T-18 por último (depende de decidir o cronômetro e a voz).

## Lacunas (revisadas em 13/10)

Respostas do dono ao Reviewer em `../questions.md`; decisões D-11 a D-31 em `../domain.md`.

- ✅ No modo ao vivo, o cronômetro do app segue o do jogo (com pausas manuais) ou o técnico informa o horário lido no placar? → D-25: horário lido no placar, com atalho "agora"
