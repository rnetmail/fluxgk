# Perfil do Goleiro, Tarefas de Implementação

## Pré-requisitos
- [ ] Hub entregando `FLUXGK_CONTEXT` com `uid`, `dataPath`, clube (nome, cor, escudo) e idioma (`../hub/contracts.md`)
- [ ] `adaptador-fluxdb` com `ref`, `update`, `set`, `remove` e `on('value')` (`../adaptador-fluxdb/contracts.md`)
- [ ] `controle-de-carga` publicando o elenco em `<dataPath>/load/players` (dono do elenco, RN-01)
- [ ] pdf-lib 1.17.1, @pdf-lib/fontkit 1.1.1, jszip 3.10.1 e fontes @fontsource com cirílico, carregados sob demanda
- [ ] **Decisão sobre a temporada da ficha** (Lacunas Pendentes): define o caminho de `profile/`

## Tarefas

### Paridade com o legado

- [ ] T-01, Handshake com o hub: `FLUXGK_MODULE_READY` (module `profile`), contexto aceito só da janela pai, "abra pelo hub" quando incompleto, cor do clube, `bootFromHub` uma vez só (`booted`)
  - Origem no legado: `mod_profile.html:5909-5946`, `:5841-5880`
  - Critério de pronto: aberto fora do hub mostra o aviso; trocar o idioma no hub não reinicia o módulo
  - Confiança: 🟢

- [ ] T-02, Camada de dados `FDB`: caminhos (`loadRef`, `dataRef`, `libRef`), fila de escrita até o login (`write` devolve `'pending'`), esvaziamento da fila no `init`, registro de listeners
  - Origem no legado: `mod_profile.html:2005-2163` (`write`, `:2061-2068`)
  - Critério de pronto: uma escrita feita antes do login chega ao banco depois dele
  - Confiança: 🟢

- [ ] T-03, Interface `Adapter` herdada do SemeyDB: `listGoalkeepers` (elenco + perfil), `createGoalkeeper`/`deleteGoalkeeper` com `ROSTER_READONLY`, `updateGoalkeeper` filtrando por `PROFILE_FIELDS`, avaliações, diário, `saveModel`; `signIn`/`signOut` recusados
  - Origem no legado: `mod_profile.html:2164-2362` (`ROSTER_READONLY`, `:2264`, `:2267`; `upsertAssessment`, `:2288`; `saveModel`, `:2338`)
  - Critério de pronto: Critérios de Aceitação 4 e 5; campo fora de RN-02 não chega ao banco
  - Confiança: 🟢

- [ ] T-04, Modelo de critérios `ModelKit`: fábrica (3 eixos, 25 itens, escala 1–5, 5 níveis), `normalize`, `axisAvg`, `globalAvg` (só notas > 0), `convert` de escala, `orphanIds`, abreviação do eixo (RN-09)
  - Origem no legado: `mod_profile.html:1617-1808`, `COMPETENCIAS` em `:889-1343`
  - Critério de pronto: Critério de Aceitação 3; testes unitários de média com itens não avaliados e de conversão 1–5 → 1–10
  - Confiança: 🟢

- [ ] T-05, Boot e cache: cinco listeners (elenco, perfis, avaliações, diário, modelo) alimentando `FluxAdapter.cache`, `refresh()` que recalcula e redesenha; gravar o modelo de fábrica quando não há modelo na nuvem
  - Origem no legado: `mod_profile.html:5882-5904` (`saveModel` de fábrica, `:5896`)
  - Critério de pronto: conta nova abre o elenco com o modelo de fábrica gravado em `library/gkCriteria`
  - Confiança: 🟢

- [ ] T-06, Elenco (`squad`): cartões com média geral, mostrar/ocultar arquivados (RN-10), acesso à ficha
  - Origem no legado: `mod_profile.html` `refreshSquad` (`:5425`), `view*` do `App` (`:3793-5908`)
  - Critério de pronto: goleiro cadastrado no Load Control aparece sem cadastro aqui; arquivado só aparece com a opção
  - Confiança: 🟢

- [ ] T-07, Ficha "Geral" com gravação automática: `setP` → `queueSave` (0,9 s) → `flushSave` → `updateGoalkeeper`; indicador `markSave`; aviso ao sair com pendência
  - Origem no legado: `mod_profile.html:3991-4019` (`beforeunload`, `:4013`)
  - Critério de pronto: Critério de Aceitação 1; fechar a aba com pendência pede confirmação
  - Confiança: 🟢

- [ ] T-08, Avaliação (`aval`): data, nota por item, nota textual por item (`item_notes`), observação; uma avaliação por goleiro por data (RN-04)
  - Origem no legado: `mod_profile.html:5772` (`upsertAssessment`), `:2288`
  - Critério de pronto: Critério de Aceitação 2
  - Confiança: 🟢

- [ ] T-09, Plano de desenvolvimento (`plano`: forças, fraquezas, plano) e diário (`diario`, entradas datadas em ordem)
  - Origem no legado: `mod_profile.html` abas `plano` e `diario` do `App`; `listLogs`/`saveLog`/`deleteLog` (`:2164-2362`)
  - Critério de pronto: entrada nova do diário aparece na posição da sua data
  - Confiança: 🟢

- [ ] T-10, Gráficos próprios em SVG (`Charts.multiLine`, `Charts.groupedBars`) e paleta acessível (`ColorKit`: OKLCH, contraste, daltonismo, cores do escudo); telas `evol`, `compare` e `group`
  - Origem no legado: `mod_profile.html:1344-1616`, `:1809-2004`
  - Critério de pronto: evolução com uma linha por eixo + geral; comparação pela métrica escolhida
  - Confiança: 🟢

- [ ] T-11, Parâmetros (`params`): editor de eixos (até 8), itens, escala (mín. 0–9, máx. 2–100), níveis; identidade dos relatórios (clube, escudo, cores, responsável); salvar converte notas de todas as fichas e avaliações (RN-08)
  - Origem no legado: `mod_profile.html` `saveModel` do `App` (`:4905`), regravação em `:4952-4960`
  - Critério de pronto: Critério de Aceitação 3; itens órfãos identificados
  - Confiança: 🟢

- [ ] T-12, Relatórios (`Reports`): individual, página única, elenco e período (RN-11); seções escolhidas; capa igual à da Minutagem; marca d'água; ZIP por goleiro; fontes cirílicas quando há russo
  - Origem no legado: `mod_profile.html:2363-3792` (`ensureLibs`, `:2404`; `precisaCirilico`, `:3680`)
  - Critério de pronto: os quatro PDFs abrem; PDF em russo sem caracteres trocados
  - Confiança: 🟢

- [ ] T-13, Preferências de tela (tema, idioma, tela) no `localStorage` (`prefs`) e foco restaurado após redesenhar (`focoAtual`/`restauraFoco`)
  - Origem no legado: `mod_profile.html:4068-4094`
  - Critério de pronto: digitar num campo enquanto chega um aviso de listener não perde o cursor
  - Confiança: 🟢

### Correções

- [ ] T-14, Reenvio da fila de escrita: escrita que falha volta à fila **e** é tentada de novo (em intervalo e ao reconectar, `.info/connected`), não só no próximo `init`; a fila sobrevive a recarregar (rascunho no navegador)
  - Origem no legado: `write` (`:2061-2068`), esvaziamento só em `init` (`:2079-2096`)
  - Critério de pronto: derrubar a rede, editar a ficha, voltar a rede: o dado sobe sem recarregar
  - Confiança: 🟢

- [ ] T-15, `fixOutOfRange` pergunta antes de regravar: mostrar quais notas estão fora da escala e a escala de origem suposta, e só converter com confirmação; nunca deduzir a escala de uma nota isolada
  - Origem no legado: `fixOutOfRange` (`:5435-5460`), chamada automática 1,5 s após o boot (`:5900`)
  - Critério de pronto: uma nota 50 digitada por engano não converte as fichas dos outros goleiros
  - Confiança: 🟡

- [ ] T-16, Remover a identidade "Semey" como padrão: sem clube no contexto, usar o nome do FluxGK
  - Origem no legado: `:948`, `:1097`, `:2472`, `:3822`, `:3943`, `:4031`, `:4674`, `:5280`, `:5365`
  - Critério de pronto: nenhum texto, PDF ou título mostra "Semey"
  - Confiança: 🟢

- [ ] T-17, Redesenho só da parte afetada: o listener que mudou atualiza o que depende dele, não a tela inteira
  - Origem no legado: `refresh` → `render` em cada listener (`:5882-5904`)
  - Critério de pronto: chegada de uma avaliação de outro aparelho não redesenha a ficha "Geral" aberta
  - Confiança: 🟡 (o `fluxdb` 1.1 já corta os avisos repetidos; medir antes de mexer)

- [ ] T-18, `update` de vários campos numa gravação só
  - Origem no legado: `updateGoalkeeper` (`:2270-2284`) sobre o adaptador 1.0
  - Critério de pronto: salvar a ficha com 5 campos alterados = 1 requisição
  - Confiança: 🟢 (resolvido pelo `fluxdb` 1.1, commit `e1dc8c7`, ainda fora de produção: ao subir, só conferir)

### Evolução decidida pelo dono

- [ ] T-19, Dicionário único com os 9 idiomas (D-10): migrar `T` (pt/en/ru) para `fluxgk-i18n.js`, mantendo as fontes cirílicas do PDF
  - Origem no legado: dicionário `T` (`:889-1343`)
  - Critério de pronto: Perfil em francês; nenhuma chave faltando em pt, en e ru
  - Confiança: 🟢

- [ ] T-20, Ditado por voz (D-02) nas observações, plano, forças, fraquezas e diário
  - Origem no legado: inexistente (nenhum `SpeechRecognition` no módulo)
  - Critério de pronto: falar preenche o campo e dispara a gravação automática
  - Confiança: 🟢 (D-26: reconhecimento de voz do navegador primeiro; serviço externo só se a qualidade não servir)

## Tarefas de Teste

- [ ] TT-01, Gravação automática da ficha (Critério 1)
- [ ] TT-02, Avaliação única por data (2)
- [ ] TT-03, Conversão de escala preservando 0 (3)
- [ ] TT-04, Goleiro excluído no Load Control some do Perfil (4)
- [ ] TT-05, `ROSTER_READONLY` em criar e excluir (5)
- [ ] TT-06, Médias ignoram itens não avaliados (RN-07)
- [ ] TT-07, Campo fora de `PROFILE_FIELDS` é descartado (RN-02)
- [ ] TT-08, Escrita com rede caída sobe ao reconectar (após T-14)
- [ ] TT-09, Nota fora da escala pede confirmação (após T-15)

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, Se a ficha deixar de ser por temporada: copiar `<dataPath>/profile/gk` da temporada mais recente para o novo caminho do goleiro, mantendo avaliações e diário datados (depende da Lacuna)

## Ordem Sugerida
1. T-14: hoje uma edição pode se perder sem aviso ao fechar a aba.
2. T-01 a T-13 com TT-01 a TT-07 como linha de base.
3. T-15 e T-16.
4. T-18 se confere sozinho quando o `fluxdb` 1.1 subir; T-17 depois de medir.
5. T-19 junto com o resto do app (D-10); T-20 quando o serviço de voz for escolhido.

## Lacunas (revisadas em 13/10)

Respostas do dono ao Reviewer em `../questions.md`; decisões D-11 a D-31 em `../domain.md`.

- ✅ A ficha do goleiro (perfil, avaliações, diário) deve continuar presa à temporada ou acompanhar o goleiro entre temporadas? Hoje trocar de temporada começa do zero (RN-13). → D-12: a ficha acompanha o goleiro no clube
- ✅ Ditado por voz: qual serviço (o do navegador ou um externo)? A mesma decisão vale para a Minutagem. → D-26: voz do navegador primeiro
