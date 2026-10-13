# Periodização, Tarefas de Implementação

## Pré-requisitos
- [ ] Hub entregando `FLUXGK_CONTEXT` (`../hub/contracts.md`)
- [ ] `adaptador-fluxdb` com `set`, `on('value')` e `.info/connected`
- [ ] Chaves `period.*` e `data.pdf.locale` em `fluxgk-i18n.js`

## Tarefas

### Paridade com o legado

- [ ] T-01, Receptor de contexto (só da janela pai), faixa de contexto com cor do clube, aviso `FLUXGK_MODULE_READY` (`module: 'period'`)
  - Origem no legado: `mod_periodization.html:11-34`
  - Critério de pronto: contexto incompleto é recusado com erro no console
  - Confiança: 🟢

- [ ] T-02, Conexão: carregar SDK e adaptador sem duplicar `<script>`, `fbSet`, listener do documento e de `.info/connected`
  - Origem no legado: `mod_periodization.html:36-78`
  - Critério de pronto: documento carregado e indicador "live"
  - Confiança: 🟢

- [ ] T-03, Modelo `PZ` e CRUD de períodos (`itemsOf`, `pzAdd`, `pzDelete`, `pzSet`, `sortByStart`)
  - Origem no legado: `mod_periodization.html:305-325`
  - Critério de pronto: Critério de Aceitação 1
  - Confiança: 🟢

- [ ] T-04, Listas por nível com cartões editáveis (nome, datas, cor da paleta ou livre, texto) e confirmação de exclusão
  - Origem no legado: `mod_periodization.html:327-379`, `:757-759`
  - Critério de pronto: mudar a cor do cartão muda a barra na linha do tempo
  - Confiança: 🟢

- [ ] T-05, Calendário por nível com criação por dois cliques (`renderLevelCal`, `onLevelDayClick`, `openCreateForm`, `focusCard`)
  - Origem no legado: `mod_periodization.html:784-835`
  - Critério de pronto: Critério de Aceitação 2
  - Confiança: 🟢

- [ ] T-06, Competições e eventos (jogo/meta) com escudo reduzido a 64 px e cor por competição
  - Origem no legado: `mod_periodization.html:455-550`
  - Critério de pronto: Critério de Aceitação 3
  - Confiança: 🟢

- [ ] T-07, Temas por dia agrupados por mesociclo, com migração do formato antigo
  - Origem no legado: `mod_periodization.html:551-694`
  - Critério de pronto: Critérios de Aceitação 4 e 5
  - Confiança: 🟢

- [ ] T-08, Calendário mensal geral e conteúdo do dia na ordem hierárquica (`renderCalendar`, `dayCellHTML`, `eventsOn`)
  - Origem no legado: `mod_periodization.html:597-756`
  - Critério de pronto: dia com macro, meso com tema, micro e jogo aparece nessa ordem
  - Confiança: 🟢

- [ ] T-09, Visão geral: linha do tempo, tabela, calendário (`timelineHTML`, `tableHTML`, `renderOverview`, `renderOverviewCal`)
  - Origem no legado: `mod_periodization.html:381-454`, `:879-916`
  - Critério de pronto: período sem fim aparece com 7 dias
  - Confiança: 🟢

- [ ] T-10, PDFs: calendário mensal (A4 paisagem), documento completo com capa, intervalo de datas com atalhos
  - Origem no legado: `mod_periodization.html:917-1221`
  - Critério de pronto: os três PDFs abrem com cabeçalho do clube; sem dados, aparece o aviso
  - Confiança: 🟢

- [ ] T-11, Abas e inicialização (`switchTab`, `renderAll`, `bootUI`, atalho de 1,2 s para abrir fora do hub)
  - Origem no legado: `mod_periodization.html:1001-1016`, `:1226-1235`
  - Critério de pronto: abrir o arquivo solto mostra a interface vazia
  - Confiança: 🟢

### Correções

- [ ] T-12, **Trava contra sobrescrita:** `save()` só grava depois da primeira resposta do `on('value')` (como `_cloudLoaded` no vídeo); antes disso, enfileira e grava após fundir
  - Origem no legado: `mod_periodization.html:312-314` e `:1234-1235`
  - Critério de pronto: com a nuvem atrasada 5 s, editar um período não apaga os demais
  - Confiança: 🟢 (risco) / 🟢 (D-11: vence o mais recente, item a item)

- [ ] T-13, Falha de gravação visível ao usuário (indicador vermelho + aviso + tentar de novo)
  - Origem no legado: `save` (`:313`, só `console.error`)
  - Critério de pronto: gravação recusada mostra aviso na tela
  - Confiança: 🟢

- [ ] T-14, Excluir mesociclo trata os temas dele: perguntar se apaga ou move para `__sem_meso`
  - Origem no legado: `pzDelete` (`:322`) e `themesOnDay` (`:581-589`)
  - Critério de pronto: nenhum `dayThemes[<id inexistente>]` no documento após excluir
  - Confiança: 🟢

- [ ] T-15, Validar início ≤ fim na criação e na edição; avisar (sem bloquear) meso fora de macro e micro fora de meso
  - Origem no legado: `buildAddRow` (`:327-342`), `openCreateForm` (`:814-827`), cartões (`:363-364`)
  - Critério de pronto: Critério de Aceitação 6
  - Confiança: 🟢 (início ≤ fim) / 🟢 (D-22: hierarquia como aviso)

- [ ] T-16, Gravar com atraso curto (debounce) em vez de a cada `change`, para não regravar o documento a cada campo
  - Origem no legado: listeners de `change` em `renderLevel` (`:361-370`)
  - Critério de pronto: editar nome e texto de um cartão em sequência gera uma gravação
  - Confiança: 🟡

### Evolução decidida pelo dono

- [ ] T-17, Ditado por voz nos campos de objetivo, conteúdo e tema do dia (D-02)
  - Origem no legado: campos `oo-<nível>`, `.jd-text`, `pf-text` e editor de tema
  - Critério de pronto: botão de microfone preenche o campo
  - Confiança: 🟢 (D-26: reconhecimento de voz do navegador primeiro; serviço externo só se a qualidade não servir)

## Tarefas de Teste

- [ ] TT-01, Criar período por lista e por calendário (Critérios 1 e 2)
- [ ] TT-02, Excluir competição solta os jogos (3)
- [ ] TT-03, Tema do dia por mesociclo e migração do formato antigo (4 e 5)
- [ ] TT-04, Datas invertidas recusadas (6, após T-15)
- [ ] TT-05, Nuvem atrasada não apaga o documento (após T-12) — simular adaptador lento
- [ ] TT-06, Gerar os três PDFs com e sem dados

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, Limpeza única dos temas órfãos já existentes (`dayThemes` de mesociclos que não existem mais): mover para `__sem_meso` ou descartar, conforme decisão do dono

## Ordem Sugerida
1. T-12 primeiro, antes de qualquer outra coisa: é o único risco de perda do documento inteiro.
2. T-01 a T-11 (paridade) com TT-01 a TT-03 e TT-06.
3. T-13, T-14 + TM-01, T-15.
4. T-16 e T-17 por último.

## Lacunas (revisadas em 13/10)

Respostas do dono ao Reviewer em `../questions.md`; decisões D-11 a D-31 em `../domain.md`.

- ✅ Temas de um mesociclo excluído: apagar ou mover para "sem meso"? → D-22: vão para "sem meso"
- ✅ Hierarquia (meso dentro de macro, micro dentro de meso) deve ser obrigatória ou só um aviso? → D-22: só um aviso
