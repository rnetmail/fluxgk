# Estatística, Tarefas de Implementação

## Pré-requisitos
- [ ] Hub entregando `FLUXGK_CONTEXT` (`../hub/contracts.md`)
- [ ] `adaptador-fluxdb` com `set`, `remove`, `get`, `on('value')` e `.info/connected`
- [ ] Chart.js 4.4.1 disponível (CDN ou cópia local)
- [ ] **Decisão sobre o formato único de adversário** (compartilhado com `xg` e `minutagem`; ver `../xg/tasks.md`, T-15)
- [ ] Chaves `st.*` em `fluxgk-i18n.js`

## Tarefas

### Paridade com o legado

- [ ] T-01, Contexto, caminhos (`_SPATH`), faixa de contexto, conexão e indicador
  - Origem no legado: `mod_stats.html:9-92`
  - Critério de pronto: os 10 caminhos são montados a partir de `dataPath` e `club.id`
  - Confiança: 🟢

- [ ] T-02, Listeners (`_statsLoadAll`) com repintura atrasada (`_repintarPagina`) e leitura de resultados em pares
  - Origem no legado: `mod_stats.html:95-139`
  - Critério de pronto: painel abre com o % de defesas certo na primeira carga (sem precisar sair e voltar)
  - Confiança: 🟢

- [ ] T-03, Estado (`ST` com padrões, `CUR`, `SF`, `OA`) e navegação (`showPage`, `recTab`, `navToRecord`)
  - Origem no legado: `mod_stats.html:798-903`, `:1236-1287`
  - Critério de pronto: adversários, competições e goleiros começam vazios; demais listas com os padrões de RN-07
  - Confiança: 🟢

- [ ] T-04, Passo "dados do jogo" e resultado (`recSyncMeta`, `outcomeDoPlacar`, `outcomeDe`, `recPintaResultado`)
  - Origem no legado: `mod_stats.html:1270-1303`
  - Critério de pronto: Critério de Aceitação 4
  - Confiança: 🟢

- [ ] T-05, Finalizações (`saveShot`, `editShot`, `delShot`, `renderShotsList`, `selGoal`, `selCourt`, `mcSel`, `populateShotGkSelect`)
  - Origem no legado: `mod_stats.html:1120-1126`, `:1201-1235`, `:1304-1391`
  - Critério de pronto: sem resultado não registra; goleiro anterior sugerido
  - Confiança: 🟢

- [ ] T-06, Ações ofensivas (`saveOffAction`, `editOffAction`, `delOffAction`, `renderOffList`, `renderOffForms`, `mcOff`)
  - Origem no legado: `mod_stats.html:1392-1486`
  - Critério de pronto: sem tipo ou desfecho não registra
  - Confiança: 🟢

- [ ] T-07, Revisão e salvar (`buildReview`, `saveGame`, `cancelEditGame`)
  - Origem no legado: `mod_stats.html:1487-1573`, `:1251-1257`
  - Critério de pronto: Critério de Aceitação 1; edição mantém o id
  - Confiança: 🟢

- [ ] T-08, Histórico com edição no cartão (`renderHistory`, `renderHistoryShotsList`, `showHistShotForm`, `histSaveShot`, `histDeleteShot`, `openGameInRecord`, `saveEditGame`, `deleteGame`)
  - Origem no legado: `mod_stats.html:1574-1838`
  - Critério de pronto: editar uma finalização no histórico atualiza o painel
  - Confiança: 🟢

- [ ] T-09, Cálculos e painel (`resKind`, `calcStats`, `countBy`, `pctOf`, gráficos, mapas de calor, filtros `ms*`, drill)
  - Origem no legado: `mod_stats.html:1134-1200`, `:1839-2200`
  - Critério de pronto: Critério de Aceitação 2; clicar numa barra filtra o painel
  - Confiança: 🟢

- [ ] T-10, Relatórios em PDF (`populateReportFilters`, `buildReport`)
  - Origem no legado: `mod_stats.html` (página `reports`)
  - Critério de pronto: números do PDF iguais aos do painel com o mesmo filtro
  - Confiança: 🟢

- [ ] T-11, Configurações: listas, renomear com propagação, tipo de resultado, escudo de adversário
  - Origem no legado: `mod_stats.html:904-1088`
  - Critério de pronto: Critério de Aceitação 3
  - Confiança: 🟢

### Correções

- [x] T-12, **Rascunho do jogo em andamento:** gravar `CUR` continuamente no navegador (chave por `uid` + `dataPath`) e, com rede, em `<dataPath>/stats/draft`; oferecer retomar ao abrir; apagar ao salvar — **feito em 13/10** (`guardarRascunho`/`oferecerRascunho`/`apagarRascunho`; caminho `<dataPath>/stats/rascunho`; ponta a ponta em HML: recarregar e outro aparelho recuperam o jogo, salvar apaga o rascunho)
  - Origem no legado: `CUR` (`:830`), `saveShot`, `saveOffAction`, `saveGame`
  - Critério de pronto: Critério de Aceitação 5; funciona sem rede
  - Confiança: 🟢 (risco) / 🟢 (D-16: rascunho no aparelho a cada lance e na nuvem a cada minuto)

- [ ] T-13, `persist` por lista: cada alteração grava só a lista alterada
  - Origem no legado: `persist` (`:848-871`) e seus 10 chamadores
  - Critério de pronto: adicionar uma competição faz uma gravação
  - Confiança: 🟢

- [x] T-14, Adversários item a item no formato único, sem regravar a lista inteira — **feito em 13/10** (`fluxgkMesclarAdversarios`, igual nos três módulos; teste `tools/test-adversarios.mjs` no CI). O cadastro pelo hub (dono, D-17) fica para depois
  - Origem no legado: `persist` (`:864-870`), listener (`:133-138`)
  - Critério de pronto: Critério de Aceitação 6
  - Confiança: 🟢 (defeito) / 🟢 (D-17: formato único `{id, name, badge}`; o dono do cadastro é o hub)

- [ ] T-15, Trava contra sobrescrita: não gravar listas antes da primeira resposta de cada listener
  - Origem no legado: listeners (`:113-139`) e padrões em `ST` (`:798-829`)
  - Critério de pronto: com a nuvem atrasada, adicionar um item não apaga os itens da nuvem
  - Confiança: 🟢

- [ ] T-16, Aceitar lista remota vazia como vazia (hoje ignorada)
  - Origem no legado: `if(v) ST.x = …` (`:120-126`)
  - Critério de pronto: esvaziar a lista num aparelho esvazia no outro
  - Confiança: 🟡 (distinguir "nunca configurada" de "esvaziada")

- [ ] T-17, Renomear em lote numa única operação (`update` com um caminho por jogo) e renomear também tipos e desfechos ofensivos e goleiros
  - Origem no legado: `renameResult`, `renameList` (`:972-1013`), `_CAMPO_DA_LISTA` (`:995`)
  - Critério de pronto: renomear afeta 30 jogos em uma operação; renomear goleiro atualiza `gk` nos jogos
  - Confiança: 🟢

- [ ] T-18, Falha de gravação visível ao usuário
  - Origem no legado: `persist`, `persistGame`, `deleteGameFB` (só `console.error`)
  - Critério de pronto: gravação recusada mostra aviso
  - Confiança: 🟢

### Evolução decidida pelo dono

- [ ] T-19, Registro por voz durante o jogo ao vivo (minuto, momento, ação técnica, resultado, distância) (D-02)
  - Origem no legado: passo "finalizações" e "ações ofensivas"
  - Critério de pronto: ditado reconhece os rótulos configurados da temporada e preenche o formulário; zona do gol e da quadra continuam por toque
  - Confiança: 🟢 (D-26: reconhecimento de voz do navegador primeiro; serviço externo só se a qualidade não servir)

## Tarefas de Teste

- [ ] TT-01, Salvar sem adversário (Critério 1)
- [ ] TT-02, Cálculo de "no alvo" e % de defesas (2), inclusive com rótulos renomeados (3)
- [ ] TT-03, Resultado pelo placar (4)
- [ ] TT-04, Rascunho sobrevive a recarregar, com e sem rede (5, após T-12)
- [ ] TT-05, Adversários entre módulos (6, após T-14)
- [ ] TT-06, Nuvem atrasada não sobrescreve listas (após T-15)

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, Adversários para o formato único (junto com `../xg/tasks.md`, TM-02)

## Ordem Sugerida
1. T-12 (rascunho) e T-15 (trava) primeiro: perda de dados hoje.
2. T-01 a T-11 com TT-01 a TT-03 como linha de base.
3. T-14 + TM-01 junto com `xg` e `minutagem`.
4. T-13, T-16, T-17, T-18.
5. T-19 após escolher o serviço de transcrição.

## Lacunas (revisadas em 13/10)

Respostas do dono ao Reviewer em `../questions.md`; decisões D-11 a D-31 em `../domain.md`.

- ✅ Rascunho do jogo ao vivo: só no aparelho ou também na nuvem (para continuar em outro aparelho)? → D-16: no aparelho a cada lance e na nuvem a cada minuto
- 🔴 Lista vazia na nuvem: significa "esvaziada" ou "nunca configurada"? → **continua aberta** (não entrou nas perguntas de 13/10)
