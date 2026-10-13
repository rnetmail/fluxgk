# xG System, Tarefas de Implementação

## Pré-requisitos
- [ ] Hub entregando `FLUXGK_CONTEXT` (formatos novo e antigo) — `../hub/contracts.md`
- [ ] `adaptador-fluxdb` com `get` e `set`
- [ ] **Decisão sobre o formato único de adversário** (compartilhado com `estatistica` e `minutagem`)
- [ ] Chaves `xg.*` em `fluxgk-i18n.js`

## Tarefas

### Paridade com o legado

- [ ] T-01, Quadra: `resize`, `geo` (40 × 20 m, margens), `drawFloor`, `drawLines`, `drawGoals`, `drawLabels`, `drawShots`, `draw`
  - Origem no legado: `mod_xg.html:545-560`
  - Critério de pronto: a quadra mantém a proporção 2:1 em qualquer largura e redesenha ao voltar à aba
  - Confiança: 🟢

- [ ] T-02, Toque e chute pendente (`gpos`, `tap`), equipe atual e lados (`setTeam`, `swapSides`, `atkDir`), alternâncias (`toggle`, `updTogg`)
  - Origem no legado: `mod_xg.html:561-577`
  - Critério de pronto: toque fora da quadra ignorado; após inverter lados, a alfa ataca o outro gol
  - Confiança: 🟢

- [ ] T-03, Modelo de xG (`xgRaw`, `computeXG`, `calcXG`) e calibração (`onSlider`, `applyPreset`, `PRESETS`)
  - Origem no legado: `mod_xg.html:534`, `:562-564`, `:583-586`
  - Critério de pronto: tabela de casos de teste (TT-01) com os mesmos valores do legado até a 3ª casa
  - Confiança: 🟢

- [ ] T-04, Registro, edição e exclusão de chute; estatísticas da partida (`registrar`, `editShot`, `updateShot`, `cancelEdit`, `delShot`, `updStats`, `renderLog`)
  - Origem no legado: `mod_xg.html:578-582`, `:620-659`, `:1566-1610`
  - Critério de pronto: conversão = gols / chutes arredondada; xG somado com 2 casas
  - Confiança: 🟢

- [ ] T-05, Equipes, escudos, competição e data (`syncNames`, `syncMatch`, `loadEmb`, `setEmbUI`, `pickClubFromSelect`, `showClubPicker`, `pickClub`)
  - Origem no legado: `mod_xg.html:601-617`, `:1278-1325`
  - Critério de pronto: escolher adversário preenche nome e escudo da beta
  - Confiança: 🟢

- [ ] T-06, Salvar, carregar para editar, salvar edição, cancelar, excluir partida
  - Origem no legado: `mod_xg.html:971-976`, `:1200-1240`
  - Critério de pronto: Critério de Aceitação 3; editar mantém o id
  - Confiança: 🟢

- [ ] T-07, Histórico com filtros, relatório da temporada, seleção para PDF
  - Origem no legado: `mod_xg.html:979-1095`, `:1326-1354`
  - Critério de pronto: números do relatório conferem com a soma das partidas
  - Confiança: 🟢

- [ ] T-08, PDFs de partida e de várias partidas, com mapa de chutes em SVG
  - Origem no legado: `mod_xg.html:666-815`, `:1096-1199`, `:1732+`
  - Critério de pronto: PDF abre com o mapa e as estatísticas de cada equipe
  - Confiança: 🟢

- [ ] T-09, Cadastro de adversários (`renderClubs`, `openClubForm`, `onClubImg`, `saveClub`, `deleteClub`)
  - Origem no legado: `mod_xg.html:1241-1277`
  - Critério de pronto: CRUD completo
  - Confiança: 🟢

- [ ] T-10, Configurações do módulo (`loadXGSettings`, `applyXGSettings`, listas, `loadXGBadge`, `saveXGSettings`)
  - Origem no legado: `mod_xg.html:851-944`
  - Critério de pronto: listas de temporadas e competições alimentam os selects
  - Confiança: 🟢

- [ ] T-11, Contexto e nuvem (`_initFBXG`, `FB`, `syncToCloud`, `updateFBStatus`)
  - Origem no legado: `mod_xg.html:508-520`, `:1356-1481`
  - Critério de pronto: ao abrir, os jogos da nuvem aparecem no histórico
  - Confiança: 🟢

### Correções

- [ ] T-12, Escopo da cópia local: chaves `fxg_games::<uid>::<dataPath>` e `fxg_clubs::<uid>::<clubId>`; migrar a chave antiga uma única vez **só se** a nuvem da temporada estiver vazia e o usuário confirmar
  - Origem no legado: `mod_xg.html:833-838`
  - Critério de pronto: Critério de Aceitação 4; outro técnico no mesmo navegador não vê jogos alheios
  - Confiança: 🟢

- [ ] T-13, Enviar lista vazia: excluir o último jogo ou adversário apaga na nuvem
  - Origem no legado: `syncToCloud` (`:1475-1481`)
  - Critério de pronto: Critério de Aceitação 5
  - Confiança: 🟢

- [ ] T-14, Partidas por item (`xg/games/<id>`) em vez do objeto inteiro, removendo o teto de 5 MB por temporada
  - Origem no legado: `FB.setGames` (`:1446-1448`)
  - Critério de pronto: salvar uma partida grava só ela
  - Confiança: 🟡 (muda a forma do dado; ver TM-01)

- [ ] T-15, Adversários: formato único compartilhado (proposta: `{id: slug(nome), name, badge, gk?}`) e gravação item a item com `update`, nunca a lista inteira — feito junto com `estatistica` e `minutagem`
  - Origem no legado: `FB.setOpponents` (`:1450-1453`); `mod_stats.html:864-870`; `mod_minutes.html:504-509`
  - Critério de pronto: Critério de Aceitação 6
  - Confiança: 🟢 (defeito) / 🟢 (D-17: formato único `{id, name, badge}`; o dono do cadastro é o hub)

- [ ] T-16, Configurações na nuvem (`users/<uid>/xg-misc/settings` via `set`) e leitura de volta
  - Origem no legado: `saveXGSettings` (`:934-944`), `loadXGSettings` (`:853-864`), `FB` (`:1437`)
  - Critério de pronto: configuração salva aparece após recarregar e em outro aparelho
  - Confiança: 🟢

- [ ] T-17, Gravar `season` (id do contexto) e usar no filtro
  - Origem no legado: `saveCurrentGame` (`:971-976`), `getFilteredGames` (`:979-986`)
  - Critério de pronto: filtro por temporada encontra a partida
  - Confiança: 🟢

- [ ] T-18, Tempo real (`on('value')`) ou, no mínimo, fusão por `id` ao abrir em vez de sobrescrever o local
  - Origem no legado: `_initFBXG` (`:1424-1433`)
  - Critério de pronto: partida salva sem rede não some ao reabrir com rede
  - Confiança: 🟢

- [ ] T-19, Falha de gravação visível; indicador só fica verde após gravação confirmada
  - Origem no legado: `FB.setGames`/`setOpponents` devolvem `false` em silêncio; `updateFBStatus` (`:1467-1472`)
  - Critério de pronto: gravação recusada mostra aviso
  - Confiança: 🟢

- [ ] T-20, Traduzir textos fixos e escapar nomes antes do HTML
  - Origem no legado: `renderSeason` (`:1326-1354`), `showEditBanner` (`:1214-1225`), `gameCardHtml` (`:988-1002`)
  - Critério de pronto: em inglês não aparece português; nome `<b>` aparece literal
  - Confiança: 🟢

### Evolução decidida pelo dono

- [ ] T-21, Registro de chute por voz durante o jogo ao vivo (minuto, tipo de jogada, corpo, gol) (D-02)
  - Origem no legado: formulário do chute (`minuto`, `corpo`, `tipo`, alternâncias)
  - Critério de pronto: frase como "minuto doze, transição, pé fraco, gol" preenche o formulário; o toque na quadra continua necessário para a posição
  - Confiança: 🟢 (D-26: reconhecimento de voz do navegador primeiro; serviço externo só se a qualidade não servir)

## Tarefas de Teste

- [ ] TT-01, Tabela de xG: 10 posições × 3 presets × combinações de contexto, comparada com o legado
- [ ] TT-02, Pênalti e tiro de 10 m com e sem goleiro (Critério 2)
- [ ] TT-03, Salvar sem chutes (3)
- [ ] TT-04, Isolamento por temporada e por conta (4, após T-12)
- [ ] TT-05, Excluir o último jogo (5, após T-13)
- [ ] TT-06, Adversários entre módulos (6, após T-15)
- [ ] TT-07, Configurações persistem (após T-16)

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, Se T-14: converter `xg/games` (objeto `{id: partida}` num nó) em um nó por partida (`xg/games/<id>`)
- [ ] TM-02, Se T-15: converter adversários dos três formatos para o formato único, unindo por nome normalizado e preservando escudos
- [ ] TM-03, Opcional (D-06): usar o leitor de Firestore (`importFromAny`, `:1539`) como base da importação dos dados antigos do Firebase

## Ordem Sugerida
1. T-12 e T-13 primeiro: misturam e ressuscitam dados hoje.
2. T-01 a T-11 com TT-01 a TT-03 como linha de base (o modelo de xG precisa ficar idêntico).
3. T-15 + TM-02 junto com `estatistica` e `minutagem`.
4. T-16, T-17, T-18, T-19, T-20.
5. T-14 + TM-01 quando o volume de dados for conhecido (D-07).
6. T-21 depois do serviço de transcrição.

## Lacunas (revisadas em 13/10)

Respostas do dono ao Reviewer em `../questions.md`; decisões D-11 a D-31 em `../domain.md`.

- ✅ Formato único de adversário e quem é o dono do cadastro (hoje três módulos gravam). → D-17: o hub, formato único `{id, name, badge}`
- ✅ Ao migrar a cópia local antiga sem escopo, a quem pertencem os jogos que já estão no navegador? → D-18: confirmação na tela antes de importar
