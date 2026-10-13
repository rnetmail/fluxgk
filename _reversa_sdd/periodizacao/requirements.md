# Periodização

## Visão Geral
`mod_periodization.html`. Calendário de periodização da temporada do clube: macro, meso e microciclos com período,
cor e objetivo; jogos e metas no calendário, com competições coloridas; temas de treino por dia dentro de cada
mesociclo; exportação em PDF (calendário mensal, documento completo e intervalo de datas). 🟢

## Responsabilidades
- CRUD de períodos nos três níveis (macro, meso, micro). 🟢
- CRUD de competições (nome, cor) e de eventos do calendário (jogo ou meta). 🟢
- Temas por dia, agrupados por mesociclo. 🟢
- Visões: calendário, listas por nível, visão geral (linha do tempo + tabela). 🟢
- Exportações em PDF. 🟢

## Regras de Negócio
- RN-01 Toda a periodização da temporada é **um documento** em `<dataPath>/periodization`: `{macro[], meso[], micro[], events[], comps[], dayThemes{}, updatedAt}`; cada alteração regrava o documento inteiro. 🟢
- RN-02 Período: `{id, name, start, end, text, color}`; id `p` + 7 caracteres aleatórios; cor padrão = cor do nível. 🟢
- RN-03 Criar período pela lista exige nome **ou** objetivo; pelo calendário, dois cliques definem início e fim (a ordem dos cliques não importa). 🟢
- RN-04 O campo de texto chama-se "Conteúdo" no micro e "Objetivo" no macro e no meso. 🟢
- RN-05 Listas e linha do tempo ordenadas por data de início; período sem fim aparece com 7 dias na linha do tempo. 🟢
- RN-06 Evento: `{id, date, type: 'game' | 'target', label}`; só jogo tem `compId` e `badge` (escudo do adversário reduzido a 64 px, PNG). Evento exige data. 🟢
- RN-07 Competição: `{id, name, color}` (padrão `#C8102E`); excluir a competição desliga os jogos dela, sem apagar os jogos. A cor do jogo é a da competição. 🟢
- RN-08 Tema do dia pertence a um mesociclo (`dayThemes[mesoId][AAAA-MM-DD] = texto`); fora de meso vai para `__sem_meso`. Texto vazio apaga. 🟢
- RN-09 Migração automática: temas no formato antigo (`data → texto`) vão para o **primeiro** meso que cobre a data, ou para `__sem_meso`. 🟢
- RN-10 No dia do calendário a ordem é: macro · meso com seus temas (na cor do meso) · micro · jogos · temas sem meso. 🟢
- RN-11 Excluir pede confirmação. 🟢
- 🟢 RN-12 Não há validação de início ≤ fim, nem de meso dentro de macro ou micro dentro de meso (nenhuma comparação entre `start` e `end` no módulo). [Reviewer: conferido no código]
- 🟢 RN-13 Excluir um mesociclo **não** apaga seus temas: ficam órfãos no documento e deixam de aparecer.

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | CRUD de período por nível, com nome, início, fim, cor (10 da paleta ou livre) e texto | Must | Período criado aparece na lista, no calendário e na visão geral |
| RF-02 | Criar período por dois cliques no calendário do nível | Should | Clicar em 10 e depois em 3 cria de 3 a 10 |
| RF-03 | CRUD de competição; excluir solta os jogos ligados | Should | Jogo continua no calendário sem cor de competição |
| RF-04 | Eventos de jogo (com competição e escudo) e de meta no calendário mensal | Must | Evento aparece no dia, com a cor certa |
| RF-05 | Temas por dia dentro do mesociclo | Should | Tema aparece logo abaixo do meso, na cor dele |
| RF-06 | Calendário mensal com navegação; listas por nível; visão geral com linha do tempo e tabela | Must | As três visões mostram os mesmos dados |
| RF-07 | PDF do calendário mensal, do documento completo e de um intervalo de datas (com atalhos) | Should | PDF gerado abre com cabeçalho do clube |
| RF-08 | Sincronização: alteração em outro aparelho aparece sem recarregar | Should | Editar no celular atualiza o computador |
| RF-09 | Indicador de conexão (`.info/connected`) | Could | Desligar a rede muda o indicador |
| RF-10 | **Correção:** excluir mesociclo trata os temas dele (apagar ou mover para `__sem_meso`, após confirmação) | Should | Nenhum tema órfão no documento |
| RF-11 | **Correção:** validar início ≤ fim | Should | Fim antes do início é recusado com aviso |
| RF-12 | **Evolução (D-02):** ditado por voz nos campos de texto (objetivo, conteúdo, tema do dia) | Could | Falar preenche o campo |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | um único nó por temporada: uma linha no banco, custo proporcional ao tamanho do documento | `mod_periodization.html:312-314` | 🟢 |
| Performance | escudo de evento reduzido a 64 px antes de gravar | `mod_periodization.html:518-533` | 🟢 |
| Escalabilidade | documento limitado a 5 MB (campo `data` de `nodes`) | migration | 🟢 |
| Segurança | contexto aceito só da janela pai | `mod_periodization.html` (receptor de contexto) | 🟢 |
| Segurança | textos escapados (`esc`) antes de entrar no HTML | `mod_periodization.html:310` | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado uma temporada sem periodização
Quando o técnico cria o macrociclo "Preparatório" de 01/01 a 31/03
Então ele aparece na lista Macro, no calendário e na linha do tempo

Dado o calendário do nível Meso
Quando o técnico clica no dia 20 e depois no dia 5
Então abre o formulário de novo período de 5 a 20

Dado um jogo ligado à competição "Liga"
Quando a competição "Liga" é excluída
Então o jogo continua no calendário, sem a cor da competição

Dado um mesociclo de 01/02 a 28/02
Quando o técnico escreve "Saídas do gol" no dia 10/02
Então o tema aparece no dia 10/02 logo abaixo do meso, na cor dele

Dado temas gravados no formato antigo (data → texto)
Quando o módulo abre
Então cada tema passa para o primeiro meso que cobre a data, ou para os temas sem meso

Dado um período com fim antes do início
Quando o técnico tenta salvar (após RF-11)
Então a gravação é recusada com aviso
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Períodos, eventos, visões (RF-01, RF-04, RF-06) | Must | Núcleo do módulo |
| Criação por calendário, competições, temas, PDF, sincronização (RF-02, 03, 05, 07, 08) | Should | Valor alto, com alternativa |
| Correções de temas órfãos e de datas (RF-10, RF-11) | Should | Integridade, sem perda imediata |
| Indicador de conexão, voz (RF-09, RF-12) | Could | Conforto |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `mod_periodization.html` | `PZ`, `LEVELS`, `save`, `itemsOf`, `pzAdd`, `pzDelete`, `pzSet`, `sortByStart` | 🟢 |
| `mod_periodization.html` | `buildAddRow`, `renderLevel`, `renderLevelCal`, `onLevelDayClick`, `openCreateForm`, `focusCard` | 🟢 |
| `mod_periodization.html` | `evAdd`, `evDelete`, `compAdd`, `compDelete`, `renderComps`, `_downscaleImg`, `gameColor`, `tintaSobre` | 🟢 |
| `mod_periodization.html` | `dayThemesRoot`, `themesOfMeso`, `themesOnDay`, `setDayTheme`, `renderDayThemes` | 🟢 |
| `mod_periodization.html` | `renderCalendar`, `timelineHTML`, `tableHTML`, `renderOverview`, `renderOverviewCal`, `switchTab` | 🟢 |
| `mod_periodization.html` | `exportMonthlyPDF`, `exportPDF`, `exportRangePDF`, `rngRenderShortcuts` | 🟢 |
| `mod_periodization.html` | receptor de contexto e conexão (`:10-80`), `bootUI` | 🟢 |
