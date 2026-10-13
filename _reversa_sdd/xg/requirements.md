# xG System

## Visão Geral
`mod_xg.html`. Registro de finalizações num mapa da quadra de futsal, com cálculo do gol esperado (xG) de cada chute,
estatísticas por jogo, histórico, relatório por temporada e PDFs. As duas equipes de um jogo são "alfa" (nossa) e
"beta" (adversária). 🟢

## Responsabilidades
- Desenhar a quadra e registrar chutes por toque, com contexto (corpo, tipo de jogada, assistência, pressão, gol, goleiro presente, defensores, minuto). 🟢
- Calcular o xG de cada chute com um modelo calibrável. 🟢
- Salvar, editar e excluir partidas; histórico com filtros; relatório da temporada. 🟢
- Cadastro de clubes adversários (nome, goleiro, escudo) e configurações do módulo. 🟢
- Exportar PDF de uma partida ou de várias. 🟢

## Regras de Negócio
- RN-01 Coordenadas do chute normalizadas (`nx`, `ny` entre 0 e 1); o gol atacado depende da equipe e do lado (`atkDir`, `swapSides`). 🟢
- RN-02 xG pelo modelo multiplicativo de `xgRaw` (distância, ângulo, corpo, tipo de jogada, assistência, pressão, goleiro, defensores), limitado a **0,01–0,97**; fórmula completa em `../code-analysis.md`. 🟢
- RN-03 Pênalti: 0,76 com goleiro, 0,95 sem; tiro de 10 m: 0,65 com goleiro, 0,88 sem. 🟢
- RN-04 Calibração `CFG = {base, dist, ang}`, padrão "futsal" `{0,85; 1,2; 0,6}`; presets "conservador" `{0,65; 2,0; 1,2}` e "agressivo" `{0,95; 0,7; 0,2}`. 🟢
- RN-05 Padrões do chute: goleiro presente, sem assistência, sem pressão, 0 defensores. 🟢
- RN-06 Estatísticas do jogo: total de chutes, gols, soma de xG (2 casas), conversão = gols / chutes (%). 🟢
- RN-07 Não salva partida sem chutes. Data padrão: hoje. Id = `Date.now()` em texto. 🟢
- RN-08 Tipos de jogada: `saida_pressao, ataque_org, transicao, lateral, escanteio, falta, penalti, tiro10m` (e os fatores `5x4`, `4x3` existem no modelo, sem opção na lista). Corpo: `pe_forte, pe_fraco, cabeca, outro`. Gravados como código; rótulo traduzido só na tela. 🟢
- RN-09 Relatório da temporada: totais de jogos, chutes, gols e xG; chutes por tipo de jogada; por adversário, chutes, gols e xG **da nossa equipe** (`alfa`). 🟢
- RN-10 Partidas e adversários ficam primeiro no navegador (`fxg_games`, `fxg_clubs`) e sobem à nuvem 0,5 s depois de cada alteração, **lista inteira** de uma vez. 🟢
- RN-11 Ao abrir, a nuvem é lida **uma vez** (sem tempo real) e, se tiver dados, substitui a cópia do navegador. 🟢
- 🔴 RN-12 A cópia do navegador **não é separada por usuário, clube nem temporada** (`fxg_games`, `fxg_clubs`). Trocar de temporada, ou outro técnico no mesmo navegador, faz os jogos anteriores aparecerem e serem enviados para a nova temporada ou conta.
- 🔴 RN-13 Excluir o **último** jogo nunca chega à nuvem (`syncToCloud` não envia lista vazia); na próxima abertura ele volta.
- 🔴 RN-14 Os adversários do xG (`{id, name, gk, img}`) vão para o mesmo caminho que `estatistica` e `minutagem` usam com outro formato (`{id, name, badge}`): cada módulo apaga o que o outro gravou.
- 🔴 RN-15 As configurações do módulo nunca chegam à nuvem (`FB.set` não existe).
- 🟢 RN-16 A partida salva não registra a temporada; o filtro por temporada do histórico nunca encontra nada.

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Quadra desenhada com proporções de futsal, redimensionável | Must | Toque dentro da quadra marca o ponto; fora é ignorado |
| RF-02 | Registrar chute com contexto e xG calculado | Must | xG exibido antes de confirmar; Critérios de Aceitação 1 e 2 |
| RF-03 | Editar e excluir chute da partida em andamento | Must | Edição recalcula o xG |
| RF-04 | Trocar equipe atual e inverter lados | Must | Chute da beta usa o outro gol |
| RF-05 | Calibração por controles deslizantes e presets | Should | Mudar o preset muda o xG dos próximos chutes |
| RF-06 | Nome, escudo e competição das equipes; data da partida | Should | Aparecem no PDF |
| RF-07 | Salvar partida; carregar partida salva para editar; excluir | Must | Partida reaparece no histórico com os mesmos chutes |
| RF-08 | Histórico com filtros por adversário, competição e temporada | Should | Filtro por temporada funciona (após RF-14) |
| RF-09 | Relatório da temporada (RN-09) e seleção de partidas para PDF | Should | Números conferem com as partidas |
| RF-10 | PDF de uma partida e de várias, com mapa de chutes | Should | Mapa com os chutes coloridos por equipe |
| RF-11 | Cadastro de adversários (nome, goleiro, escudo) e escolha rápida nas equipes | Should | Adversário escolhido preenche nome e escudo |
| RF-12 | Configurações: equipe padrão, técnico, escudo, listas de temporadas e competições | Could | Persistem entre aparelhos (após RF-15) |
| RF-13 | **Correção:** cópia local separada por `uid` + `dataPath` | Must | Trocar de temporada mostra só os jogos dela |
| RF-14 | **Correção:** gravar `season` (id da temporada do contexto) na partida | Should | Filtro por temporada encontra a partida |
| RF-15 | **Correção:** gravar configurações na nuvem | Should | Configuração aparece em outro aparelho |
| RF-16 | **Correção:** excluir o último jogo apaga na nuvem | Must | Jogo excluído não volta |
| RF-17 | **Correção:** adversários num formato único compartilhado, gravados item a item | Must | Salvar no xG não apaga escudos cadastrados na Estatística |
| RF-18 | **Evolução (D-02):** registro por voz durante o jogo ao vivo (minuto, tipo, resultado) | Could | Ditado preenche o formulário do chute |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Disponibilidade | funciona sem nuvem (cópia no navegador, envio 0,5 s depois) | `mod_xg.html:831-849` | 🟢 |
| Performance | lista inteira enviada a cada alteração, num único nó | `mod_xg.html:1446-1453`, `:1475-1481` | 🟢 |
| Escalabilidade | todos os jogos da temporada num nó de até 5 MB | migration + `FB.setGames` | 🟢 |
| Usabilidade | quadra redesenhada ao voltar para a aba da partida | `mod_xg.html:967` | 🟢 |
| Segurança | contexto aceito só da janela pai | `mod_xg.html:1361-1362` | 🟢 |
| Segurança | **deficiência:** cópia local compartilhada entre contas e temporadas | `mod_xg.html:833-838` | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado uma partida em andamento com a equipe alfa atacando
Quando o técnico marca um chute de pé forte da marca de 6 m, com goleiro presente
Então o xG exibido está entre 0,01 e 0,97 e o chute entra na lista

Dado o tipo de jogada "pênalti" com goleiro presente
Quando o chute é registrado
Então o xG é 0,76

Dado uma partida sem chutes
Quando o técnico toca em "Salvar partida"
Então aparece o aviso de que não há chutes e nada é salvo

Dado dois jogos salvos na temporada A
Quando o técnico troca para a temporada B e abre o xG (após RF-13)
Então o histórico da temporada B está vazio e a temporada A continua com dois jogos

Dado uma temporada com um único jogo salvo
Quando o técnico exclui esse jogo e reabre o módulo (após RF-16)
Então o histórico continua vazio

Dado um adversário com escudo cadastrado na Estatística
Quando o técnico salva um adversário novo no xG (após RF-17)
Então o escudo do primeiro continua existindo
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Quadra, registro, xG, salvar partida (RF-01..04, RF-07) | Must | Núcleo do módulo |
| Isolamento da cópia local, exclusão do último jogo, adversários (RF-13, RF-16, RF-17) | Must | Mistura e perda de dados entre temporadas, contas e módulos |
| Calibração, equipes, histórico, relatório, PDF, adversários, temporada, configurações (RF-05, 06, 08..12, 14, 15) | Should | Valor alto, com alternativa |
| Voz ao vivo (RF-18) | Could | Requisito novo |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `mod_xg.html` | `S`, `PRESETS`, `TIPO`, `CORPO`, `resize`, `geo`, `draw*` | 🟢 |
| `mod_xg.html` | `atkDir`, `xgRaw`, `computeXG`, `calcXG`, `gpos`, `tap`, `registrar`, `delShot`, `editShot`, `updateShot`, `updStats` | 🟢 |
| `mod_xg.html` | `setTeam`, `swapSides`, `toggle`, `onSlider`, `applyPreset`, `syncNames`, `syncMatch`, `loadEmb` | 🟢 |
| `mod_xg.html` | `saveCurrentGame`, `loadGameToEdit`, `saveEditedGame`, `cancelEditGame`, `getFilteredGames`, `renderHist`, `renderReport`, `renderSeason` | 🟢 |
| `mod_xg.html` | `exportPDF`, `buildPDF`, `exportCheckedPDF`, `buildGameHTML`, `renderCourtSVG*` | 🟢 |
| `mod_xg.html` | `renderClubs`, `openClubForm`, `saveClub`, `deleteClub`, `showClubPicker`, `pickClub` | 🟢 |
| `mod_xg.html` | `XGS`, `loadXGSettings`, `saveXGSettings`, `applyXGSettings`, listas de temporadas e competições | 🟢 |
| `mod_xg.html` | `DB`, `FB`, `_initFBXG`, `syncToCloud`, `importFromCloud`, `importFromAny`, `diagFB` | 🟢 |
