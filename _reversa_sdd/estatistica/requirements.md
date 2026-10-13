# Estatística (GK Statistics)

## Visão Geral
`mod_stats.html`. Estatística de goleiro por jogo: cada finalização sofrida (minuto, momento, ação técnica,
resultado, distância, zona do gol, zona da quadra, goleiro) e cada ação ofensiva do goleiro; histórico de jogos,
painel com gráficos e filtros cruzados, relatórios em PDF. As listas de classificação são configuráveis pelo técnico. 🟢

## Responsabilidades
- Registrar o jogo em quatro passos: dados do jogo, finalizações, ações ofensivas, revisão. 🟢
- Histórico: editar o jogo, incluir/editar/excluir finalizações, excluir o jogo. 🟢
- Painel com KPIs, gráficos, mapas de calor do gol e da quadra e filtros por clique ("drill"). 🟢
- Relatórios por jogo ou por recorte. 🟢
- Configurar listas: goleiros, competições, adversários (com escudo), ações técnicas, momentos, tipos e desfechos de ação ofensiva, resultados (com tipo) e distâncias. 🟢

## Regras de Negócio
- RN-01 Jogo novo: `id = Date.now()`, temporada `AAAA-AA` do ano corrente, mando `home`, placar vazio, sem finalizações. 🟢
- RN-02 Salvar o jogo exige data e adversário. 🟢
- RN-03 Finalização exige resultado; ação ofensiva exige tipo e desfecho. O goleiro escolhido se repete na próxima. 🟢
- RN-04 Resultado do jogo: o marcado à mão; se não houver, pelo placar (`W` se pró > contra, `L` se menor, `D` se igual); sem placar, vazio. 🟢
- RN-05 Cada rótulo de resultado tem um **tipo** (`save`, `goal`, `blocked`, `out`, `post` ou vazio) que alimenta as contas; renomear o rótulo não quebra os números. Padrões: Save→save, Goal conceded→goal, Blocked→blocked, Out→out, Post→post. 🟢
- RN-06 **% de defesas** = defesas / (defesas + gols), arredondado; "no alvo" = defesas + gols. 🟢
- RN-07 Listas começam com padrões (ações: 1vs1, Goal protection, 2nd post; momentos: Leaving pressure, Organized attack, Transition, Ball stop, Special game; tipos ofensivos: Throw, Kick, Pass; desfechos: Goal, Assist, Kept possession, Lost possession; distâncias: Before the halfway line, Before 10m, After 10m, Area, 10m, Penalty). Adversários, competições e goleiros começam vazios. Os padrões são traduzidos na tela; os personalizados aparecem como digitados. 🟢
- RN-08 Renomear ação, momento, distância ou resultado **reescreve** as finalizações já gravadas com o nome novo; nome repetido é recusado. 🟢 (tipos e desfechos ofensivos não têm renomear)
- RN-09 Zona do gol: 6 zonas (superior/meio/inferior × esquerda/direita); zona da quadra: área numerada. 🟢
- RN-10 Listas são da temporada (`<dataPath>/stats/…`); adversários são do clube (`users/<uid>/clubs/<clubId>/opponents`), compartilhados com `minutagem` e `xg`. 🟢
- 🔴 RN-11 Qualquer alteração de lista regrava **as nove listas e os adversários inteiros**; os adversários sobrescrevem o que `minutagem` e `xg` gravaram (ver `../xg/requirements.md`, RN-14).
- 🟢 RN-12 O jogo em andamento fica **só na memória** até "Salvar": fechar ou recarregar a página durante um jogo perde todas as finalizações registradas.

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Passo "dados do jogo": data, adversário, competição, goleiro, temporada, mando, local, placar, resultado | Must | Sem data ou adversário, não salva |
| RF-02 | Passo "finalizações": minuto, momento, ação técnica, resultado, distância, zona do gol, zona da quadra, goleiro; editar e excluir | Must | Lista numerada atualiza a cada finalização |
| RF-03 | Passo "ações ofensivas": minuto, tipo, momento, desfecho, goleiro; editar e excluir | Should | Idem |
| RF-04 | Passo "revisão" e salvar (novo ou edição do mesmo id) | Must | Mensagem com o número de finalizações salvas |
| RF-05 | Histórico: editar dados, incluir/editar/excluir finalizações do jogo salvo, reabrir no registro, excluir jogo | Must | Alteração persiste e aparece no painel |
| RF-06 | Painel: KPIs (RN-06), gráficos por momento, ação, resultado, distância, goleiro; mapas de calor; filtros múltiplos | Should | Clicar numa barra filtra o painel inteiro |
| RF-07 | Relatórios em PDF (jogo e recorte) | Should | PDF abre com os mesmos números do painel |
| RF-08 | Configurar listas, com renomear que propaga (RN-08) e tipo de resultado (RN-05) | Should | Renomear "Save" para "Defesa" mantém o % de defesas |
| RF-09 | Escudo por adversário | Could | Escudo aparece no histórico e no relatório |
| RF-10 | Sincronização em tempo real e indicador de conexão | Should | Jogo salvo no celular aparece no computador |
| RF-11 | **Correção:** rascunho do jogo em andamento salvo continuamente (navegador e/ou nuvem) e recuperável | Must | Recarregar no meio do jogo mantém as finalizações |
| RF-12 | **Correção:** gravar listas individualmente e adversários item a item no formato único | Must | Adicionar uma competição grava só a lista de competições |
| RF-13 | **Evolução (D-02):** registro por voz durante o jogo ao vivo | Should | Ditado preenche minuto, momento, ação e resultado |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | jogo gravado como um nó por jogo | `mod_stats.html:872-875` | 🟢 |
| Performance | **deficiência:** `persist()` regrava 10 caminhos por alteração; renomear regrava cada jogo afetado | `:848-871`, `:972-1013` | 🟢 |
| Usabilidade | o goleiro da última finalização é sugerido na próxima | `lastShotGk`, `:1330-1335` | 🟢 |
| Segurança | contexto aceito só da janela pai | `mod_stats.html:11` | 🟢 |
| Segurança | textos escapados no painel (`esc`) | `mod_stats.html:2013` | 🟢 |
| Disponibilidade | **deficiência:** jogo em andamento só na memória | `CUR`, `:830` | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado um jogo novo sem adversário
Quando o técnico toca em salvar
Então aparece o aviso de data e adversário obrigatórios e nada é salvo

Dado um jogo com 3 defesas, 1 gol sofrido e 2 chutes para fora
Quando o painel é aberto
Então "no alvo" é 4 e o % de defesas é 75

Dado o resultado "Save" com tipo save
Quando o técnico o renomeia para "Defesa"
Então as finalizações antigas passam a "Defesa" e o % de defesas não muda

Dado um jogo salvo com placar 3 x 1 e sem resultado marcado
Quando aparece no histórico
Então o resultado exibido é vitória

Dado um jogo em andamento com 5 finalizações registradas
Quando a página é recarregada (após RF-11)
Então as 5 finalizações continuam no registro

Dado um adversário com escudo
Quando a Minutagem salva sua lista de adversários (após RF-12)
Então o escudo continua existindo
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Registro e histórico (RF-01, 02, 04, 05) | Must | Núcleo |
| Rascunho do jogo ao vivo e gravação por item (RF-11, RF-12) | Must | Perda de dados |
| Ações ofensivas, painel, relatórios, listas, sincronização, voz (RF-03, 06, 07, 08, 10, 13) | Should | Valor alto |
| Escudo de adversário (RF-09) | Could | Visual |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `mod_stats.html` | contexto e nuvem (`:8-140`), `persist`, `persistGame`, `deleteGameFB`, `hydrate` | 🟢 |
| `mod_stats.html` | `ST`, `CUR`, `SF`, `OA`, `newGame`, `showPage`, `recTab`, `navToRecord`, `recSyncMeta` | 🟢 |
| `mod_stats.html` | `saveShot`, `editShot`, `delShot`, `renderShotsList`, `selGoal`, `selCourt`, `mcSel` | 🟢 |
| `mod_stats.html` | `saveOffAction`, `editOffAction`, `delOffAction`, `renderOffList`, `renderOffForms` | 🟢 |
| `mod_stats.html` | `buildReview`, `saveGame`, `cancelEditGame`, `outcomeDoPlacar`, `outcomeDe` | 🟢 |
| `mod_stats.html` | `renderHistory`, `histSaveShot`, `histDeleteShot`, `openGameInRecord`, `saveEditGame`, `deleteGame` | 🟢 |
| `mod_stats.html` | `renderList`, `addItem`, `removeItem`, `renameResult`, `renameList`, `setResultKind`, `uploadClubBadge` | 🟢 |
| `mod_stats.html` | `resKind`, `calcStats`, `countBy`, `pctOf`, `mkChart`, `orderedChart`, `goalHeatmapHtml`, `courtHeatmapHtml` | 🟢 |
| `mod_stats.html` | `drillSet`, `drillDel`, `drillClear`, `renderDrill*`, `renderDashboard`, filtros `ms*` | 🟢 |
