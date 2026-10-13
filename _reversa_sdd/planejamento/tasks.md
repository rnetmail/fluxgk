# Planejamento, Tarefas de Implementação

## Pré-requisitos
- [ ] Hub entregando `FLUXGK_CONTEXT` (`../hub/contracts.md`)
- [ ] `adaptador-fluxdb` com `on`/`off`, `set`, `remove`, `get`
- [ ] `tatica-3d` respondendo ao protocolo `fluxgk-tatica-*`
- [ ] Chaves `plan.*` em `fluxgk-i18n.js`

## Tarefas

### Paridade com o legado

- [ ] T-01, Abas e navegação com preservação do formulário da sessão (`PAGES`, `showPage`, `_saveSessionForm`, `_restoreSessionForm`); data e hora atuais na abertura
  - Origem no legado: `mod_planner.html:299-470`, `:568-641`
  - Critério de pronto: trocar de aba não perde nenhum campo
  - Confiança: 🟢

- [ ] T-02, Receptor de contexto (só da janela pai), caminhos de sessões e biblioteca, identidade do clube, reset ao trocar de temporada, aviso `FLUXGK_MODULE_READY`
  - Origem no legado: `mod_planner.html:494-531`
  - Critério de pronto: contexto de outra origem ou incompleto é ignorado
  - Confiança: 🟢

- [ ] T-03, Carregamento do SDK e do adaptador e listeners após o login
  - Origem no legado: `mod_planner.html:1805-1898`
  - Critério de pronto: listas carregam depois do login; itens apagados que voltarem são reapagados
  - Confiança: 🟢

- [ ] T-04, Assistente de exercício (`openWizard`, `confirmEx`), lista da sessão (`renderExercises`, `rmEx`, `moveEx`), fases e tipos com alias
  - Origem no legado: `mod_planner.html:702-767`, `:1029-1109`
  - Critério de pronto: padrões 8 min e 2 goleiros; alias "Aquecimento" vira `warmup`
  - Confiança: 🟢

- [ ] T-05, Imagem do exercício: arquivo e arrastar, redução para JPEG ≤ 1000 px / 0,88, limpeza; `_semUndefined` antes de gravar
  - Origem no legado: `mod_planner.html:643-700`, `:861-881`
  - Critério de pronto: cenário de foto PNG de 3 MB
  - Confiança: 🟢

- [ ] T-06, Biblioteca de exercícios (`renderExLib`, `addLibToSession` com cópia e id novo, `rmLibEx`, seletor `openExPicker`/`pickLibEx`), índice local sem imagens, recompressão única
  - Origem no legado: `mod_planner.html:769-984`
  - Critério de pronto: exercício criado num clube aparece em outro clube do mesmo técnico
  - Confiança: 🟢

- [ ] T-07, Tática 3D: abrir, enviar cena, receber imagem e cena, fechar
  - Origem no legado: `mod_planner.html:986-1023`
  - Critério de pronto: reabrir um exercício com desenho recarrega a cena editável
  - Confiança: 🟢

- [ ] T-08, Copiar exercícios de sessões salvas (um ou todos)
  - Origem no legado: `mod_planner.html:1110-1158`
  - Critério de pronto: exercícios copiados entram na sessão aberta
  - Confiança: 🟢

- [ ] T-09, Pós-treino: cabeçalho, KPIs, estrelas, objetivo atingido, 6 campos, fechar sessão atualizando o mesmo id
  - Origem no legado: `mod_planner.html:1160-1235`, `:2101-2128`
  - Critério de pronto: Critério de Aceitação 2 (mesmo id)
  - Confiança: 🟢

- [ ] T-10, Salvar na biblioteca e nova sessão (`saveCurrentSession`, `_newSession`)
  - Origem no legado: `mod_planner.html:2070-2099`
  - Critério de pronto: Critério de Aceitação 1
  - Confiança: 🟢

- [ ] T-11, Biblioteca de sessões: lista ordenável, edição em linha (`saveEditedSession`), edição completa (`editSessionFromLibrary`), exclusão, seleção
  - Origem no legado: `mod_planner.html:1237-1320`, `:1490-1595`
  - Critério de pronto: excluir remove da nuvem, do espelho e da seleção
  - Confiança: 🟢

- [ ] T-12, Fila de reenvio, ids apagados, indicador de sincronização, aviso ao sair
  - Origem no legado: `mod_planner.html:787-860`, `:2186-2189`
  - Critério de pronto: Critérios de Aceitação 3 e 4
  - Confiança: 🟢

- [ ] T-13, Espelho local (40 → 10 sessões, sem imagem/cena), resgate do navegador, cópia JSON, busca e importação de outras temporadas
  - Origem no legado: `mod_planner.html:1342-1488`
  - Critério de pronto: Critério de Aceitação 6
  - Confiança: 🟢

- [ ] T-14, Relatório HTML (`buildReportHTML`) de uma, das selecionadas e de todas, em ordem cronológica
  - Origem no legado: `mod_planner.html:1597-1803`
  - Critério de pronto: relatório abre em nova aba com capa na cor do clube
  - Confiança: 🟢

### Correções de defeitos

- [ ] T-15, Gravar as anotações do pós-treino por goleiro e por exercício (D-02): campos `postGkNotes: {<goleiro>: texto}` e `postExNotes: {<exerciseId>: texto}` na sessão, restaurados ao reabrir
  - Origem no legado: `mod_planner.html:1196-1214` (textareas sem id) e `:2101-2118` (campos gravados)
  - Critério de pronto: Critério de Aceitação 7
  - Confiança: 🟢 (defeito) / 🟡 (nomes dos campos propostos)

- [ ] T-16, `buildReportHTML`: remover a referência a `_ss` inexistente
  - Origem no legado: `mod_planner.html:1602`
  - Critério de pronto: relatório gerado com clube sem nome não lança erro
  - Confiança: 🟢

- [ ] T-17, Escapar textos do usuário antes de `innerHTML` (nomes de exercício, goleiros, observações)
  - Origem no legado: `openExPicker` (`:953-966`), `refreshPost` (`:1196-1214`), `renderLibrary`
  - Critério de pronto: exercício chamado `<b>x</b>` aparece literalmente
  - Confiança: 🟢

- [ ] T-18, Escuta do `tatica-3d` confere `e.source === tacticaFrame.contentWindow`
  - Origem no legado: `mod_planner.html:1007`
  - Critério de pronto: mensagem `fluxgk-tatica-image` de outra janela é ignorada
  - Confiança: 🟢

- [ ] T-19, Sessão guarda **referência** aos exercícios (ou a cópia sem `img`, com a imagem só na biblioteca), para o listener não baixar imagens repetidas
  - Origem no legado: `mod_planner.html:2109`
  - Critério de pronto: a biblioteca de sessões de uma temporada com 50 sessões não contém nenhum `data:image`
  - Confiança: 🟢 (D-13: cópia do texto, referência da imagem)

- [ ] T-20, `buscarOutrasTemporadas` lê só `…/planner/sessions` de cada temporada conhecida em `clubs`, não `users/<uid>/data` inteiro
  - Origem no legado: `mod_planner.html:1431-1475`
  - Critério de pronto: a busca não baixa dados de outros módulos
  - Confiança: 🟢

- [ ] T-21, Ids sem colisão (ex.: `Date.now()` + sufixo aleatório) em criações em laço
  - Origem no legado: `confirmEx` (`:736`), `addLibToSession` (`:934`)
  - Critério de pronto: 10 exercícios adicionados em sequência têm 10 ids distintos
  - Confiança: 🟡

### Evolução decidida pelo dono

- [ ] T-22, Ditado por voz com transcrição em todos os campos de anotação (objetivo, método, descrição e objetivo do exercício, variações, pós-treino e anotações por goleiro/exercício) (D-02)
  - Origem no legado: campos de texto das abas `session`, `post` e do assistente
  - Critério de pronto: botão de microfone ao lado de cada campo; falar preenche o texto; funciona no celular
  - Confiança: 🟢 (D-26: reconhecimento de voz do navegador primeiro; serviço externo só se a qualidade não servir)

## Tarefas de Teste

- [ ] TT-01, Salvar sessão e ver na biblioteca (Critério de Aceitação 1)
- [ ] TT-02, Pós-treino atualiza o mesmo id (2)
- [ ] TT-03, Fila: gravar sem conexão, conectar, conferir gravação em ≤ 15 s (3)
- [ ] TT-04, Item apagado não volta (4)
- [ ] TT-05, Redução de imagem (5)
- [ ] TT-06, Importação de outra temporada (6)
- [ ] TT-07, Anotações por goleiro e por exercício persistem (7, após T-15)
- [ ] TT-08, Relatório com clube sem nome (após T-16)

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, Se T-19 for adotada: tirar `img` (e talvez `tatica`) dos exercícios embutidos nas sessões existentes, mantendo referência ao id da biblioteca; sessões cujo exercício não existe mais na biblioteca mantêm a cópia

## Ordem Sugerida
1. T-01 a T-14 com TT-01 a TT-06 como linha de base.
2. T-15 (perda de dado) e T-16, T-17, T-18 (pequenas).
3. T-20 e T-21.
4. T-19 + TM-01 depois de decidir se o histórico congela o exercício.
5. T-22 depois de escolher o serviço de transcrição (vale para todos os módulos; ver `../controle-de-carga/`, `../minutagem/`, `../estatistica/`, `../video/`).

## Lacunas (revisadas em 13/10)

Respostas do dono ao Reviewer em `../questions.md`; decisões D-11 a D-31 em `../domain.md`.

- ✅ Serviço de transcrição de voz (no navegador, como Web Speech API, ou no servidor) e comportamento sem internet durante jogo ao vivo. → D-26: voz do navegador primeiro
- ✅ A sessão deve guardar o exercício como estava no dia (cópia) ou sempre o atual (referência)? → D-13: cópia do texto, referência da imagem
