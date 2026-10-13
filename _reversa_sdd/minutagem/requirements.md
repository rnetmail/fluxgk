# Minutagem (GK Minutes)

## Visão Geral
`mod_minutes.html`. Registro do tempo em quadra de cada goleiro por jogo, a partir dos intervalos de entrada e saída
lidos no cronômetro regressivo do futsal, por período (1º e 2º tempos e, se houver, prorrogação). Histórico com
filtros e gráficos, relatório e PDF. Fonte do contador "Jogos" do painel do hub. 🟢

## Responsabilidades
- Formulário do jogo: data, adversário, competição, duração total, duração do tempo, prorrogação. 🟢
- Por goleiro: relacionado ou não e intervalos `entrada → saída` por período, com totais ao vivo. 🟢
- Resumo do jogo: tempo por período, total e percentual do jogo por goleiro. 🟢
- Histórico com filtros, edição e exclusão; gráficos; relatório tabular; PDF. 🟢
- Listas: goleiros, competições e adversários. 🟢

## Regras de Negócio
- RN-01 O cronômetro do futsal é **regressivo**: entrada aos 20:00 e saída aos 16:38 = 3 min 22 s. Duração do intervalo = `entrada − saída` em segundos, nunca negativa; horário inválido ou vazio conta 0. 🟢
- RN-02 Formato do horário `m:ss`. 🟢
- RN-03 Padrões: jogo 40 min, tempo 20 min, prorrogação 5 min por período. O primeiro intervalo de cada goleiro já começa com a entrada no início do período (`20:00` ou `5:00`). 🟢
- RN-04 Prorrogação desmarcada: os períodos `e1` e `e2` são ignorados no cálculo e na gravação. 🟢
- RN-05 Tempo do goleiro no jogo = soma dos intervalos de `h1 + h2 + e1 + e2`. 🟢
- RN-06 Salvar exige data e adversário. A temporada é a do hub (rótulo), não é perguntada. Editar mantém o id. 🟢
- RN-07 Indicadores: minutos totais por goleiro; % do total do clube = tempo do goleiro / Σ duração dos jogos; % quando relacionado = tempo do goleiro / Σ duração dos jogos em que foi relacionado. 🟢
- 🟢 RN-08 Os percentuais usam só `totalMin` como denominador; com prorrogação, o tempo do goleiro inclui `e1/e2`, e o percentual pode passar de 100 %.
- RN-09 O goleiro é identificado pelo **nome** (chave de `gkData`); a lista de goleiros é própria da Minutagem (D-04: manter assim). 🟢
- 🔴 RN-10 A lista de adversários é gravada **sem escudo** no caminho compartilhado com `estatistica` e `xg`, apagando os escudos gravados por eles.
- 🟡 RN-11 Não há validação de intervalos sobrepostos, fora do período ou de dois goleiros em quadra ao mesmo tempo.
- 🟢 RN-12 O jogo em preenchimento fica só no formulário até salvar.

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Formulário do jogo com durações e prorrogação | Must | Marcar prorrogação mostra os períodos extras |
| RF-02 | Intervalos por goleiro e por período, com totais ao vivo | Must | Critério de Aceitação 1 |
| RF-03 | Relacionado / não relacionado por goleiro | Must | Aparece no resumo e nos indicadores |
| RF-04 | Resumo do jogo por goleiro | Should | Tempo por período, total e % |
| RF-05 | Salvar e editar jogo (mesmo id) | Must | Sem data ou adversário não salva |
| RF-06 | Histórico com filtros (temporada, competição, adversário, goleiro), editar e excluir | Must | Filtro por goleiro mostra só jogos em que ele jogou |
| RF-07 | Gráficos: minutos por goleiro, % do clube, % quando relacionado, por temporada, competição e adversário | Should | Números iguais aos da tabela |
| RF-08 | Relatório tabular e PDF (geral e de um jogo) | Should | PDF abre com os mesmos números |
| RF-09 | Listas de goleiros, competições e adversários | Must | Novo goleiro aparece no formulário |
| RF-10 | Sincronização em tempo real e indicador de conexão | Should | Jogo salvo em outro aparelho aparece |
| RF-11 | **Correção:** percentuais consideram a prorrogação no denominador | Should | Goleiro que jogou o jogo inteiro com prorrogação tem 100 % |
| RF-12 | **Correção:** adversários no formato único, gravados item a item | Must | Salvar na Minutagem não apaga escudos |
| RF-13 | **Correção:** rascunho do jogo em preenchimento | Should | Recarregar no intervalo mantém os intervalos digitados |
| RF-14 | **Correção:** avisar sobreposição e intervalo fora do período | Could | Entrada 21:00 num tempo de 20 min gera aviso |
| RF-15 | **Evolução (D-02):** marcar entradas e saídas ao vivo por voz ou por toque com o cronômetro | Should | "Entra João" registra a entrada no tempo corrente |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | jogo gravado como um nó por jogo | `mod_minutes.html:800` | 🟢 |
| Disponibilidade | falha ao salvar o jogo é mostrada ao usuário (`alert`) | `mod_minutes.html:808-809` | 🟢 |
| Disponibilidade | **deficiência:** falha ao gravar listas só no console | `mod_minutes.html:500-510` | 🟢 |
| Segurança | contexto aceito só da janela pai | receptor de contexto (`mod_minutes.html:10-40`) | 🟢 |
| Usabilidade | totais recalculados a cada tecla nos horários | `oninput="updateTotals()"`, `:672-696` | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado um goleiro com intervalo de entrada 20:00 e saída 16:38 no 1º tempo
Quando os totais são atualizados
Então o intervalo vale 3:22 e o total do 1º tempo é 3:22

Dado um intervalo com saída maior que a entrada
Quando os totais são atualizados
Então o intervalo vale 0:00

Dado um jogo sem prorrogação marcada e intervalos preenchidos na prorrogação
Quando o jogo é salvo
Então os intervalos da prorrogação não entram no total

Dado um jogo sem adversário
Quando o técnico tenta salvar
Então aparece o aviso para escolher o adversário e nada é salvo

Dado um goleiro que jogou os 40 min e os 10 min de prorrogação
Quando os indicadores são calculados (após RF-11)
Então o % do clube desse jogo é 100

Dado um adversário com escudo cadastrado na Estatística
Quando a Minutagem salva a lista de adversários (após RF-12)
Então o escudo continua existindo
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Formulário, intervalos, salvar, histórico, listas (RF-01..03, 05, 06, 09) | Must | Núcleo; alimenta o painel do hub |
| Adversários (RF-12) | Must | Perda de dados em outros módulos |
| Resumo, gráficos, PDF, sincronização, percentuais, rascunho, ao vivo (RF-04, 07, 08, 10, 11, 13, 15) | Should | Valor alto |
| Validação de intervalos (RF-14) | Could | Qualidade do dado |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `mod_minutes.html` | contexto e nuvem (`_MPATH`, `fbSet/fbGet/fbRemove`, listeners) | 🟢 |
| `mod_minutes.html` | `ST`, `navTo`, `persist`, `renderList`, `addItem`, `removeItem`, `fillSelect`, `populateAllSelects` | 🟢 |
| `mod_minutes.html` | `parseTime`, `fmtTime`, `intervalSecs`, `gkTotalSecs`, `otOn`, `periodMin`, `toggleOT` | 🟢 |
| `mod_minutes.html` | `buildCollectForm`, `buildSquadList`, `buildHalfRows`, `addInterval`, `updateTotals`, `updateSummary` | 🟢 |
| `mod_minutes.html` | `collectGameData`, `saveGame`, `resetGameForm`, `editGame`, `cancelEdit`, `deleteGame` | 🟢 |
| `mod_minutes.html` | `getFilteredGames`, `renderHistory`, `renderCharts`, `mkBar`, `mkDoughnut`, `renderRepTable` | 🟢 |
| `mod_minutes.html` | `exportReport`, `exportGameReport`, `buildMinutesPDF`, `refreshAll`, `bootUI` | 🟢 |
